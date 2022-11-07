import React, { useEffect, useRef, useState } from "react";

import "css/styles.css";
import _ from "lodash";
import styled from "styled-components";
import type { Nullable } from "types/utility-types";
import { Tooltips } from "~/tooltips";
import { useRootDispatch, useRootSelector } from "~redux/hooks";
import { aselEntrySelector } from "~redux/slices/entrySlice";
import { aselSelector, closeWindow, windowPositionSelector, pushZStack, zStackSelector } from "~redux/slices/appSlice";
import {
  FidRow,
  OptionIndicator,
  OptionsBody,
  OptionsBodyCol,
  OptionsBodyRow,
  OptionsMenu,
  OptionsMenuHeader,
  UnderlineRow,
} from "styles/optionMenuStyles";
import { aselTrackSelector } from "~redux/slices/trackSlice";
import type { ApiFlightplan } from "types/apiTypes/apiFlightplan";
import type { EdstPreferentialRoute } from "types/edstPreferentialRoute";
import { addPlanThunk } from "~redux/thunks/addPlanThunk";
import { openMenuThunk } from "~redux/thunks/openMenuThunk";
import { useDragging } from "hooks/useDragging";
import { useCenterCursor } from "hooks/useCenterCursor";
import { useFocused } from "hooks/useFocused";
import { EdstWindow } from "enums/edstWindow";
import { useHubActions } from "hooks/useHubActions";
import { OPLUS_SYMBOL } from "~/utils/constants";
import type { CreateOrAmendFlightplanDto } from "types/apiTypes/CreateOrAmendFlightplanDto";
import { usePar, usePdar, usePdr } from "api/prefrouteApi";
import { useRouteFixes } from "api/aircraftApi";
import { formatRoute } from "~/utils/formatRoute";
import { useSharedUiListener } from "hooks/useSharedUiListener";
import { removeStringFromStart, removeStringFromEnd } from "~/utils/stringManipulation";
import { getClearedToFixRouteFixes } from "~/utils/fixes";
import { borderHover, buttonBorderInverted2px } from "styles/styles";
import socket from "~socket";
import { DownlinkSymbol } from "components/utils/DownlinkSymbol";
import { EdstDraggingOutline } from "components/utils/EdstDraggingOutline";
import { EdstTooltip } from "components/utils/EdstTooltip";
import { EdstButton, ExitButton } from "components/utils/EdstButton";
import FLIGHTAWARE_LOGO from "resources/images/FA_1.png";
import SKYVECTOR_LOGO from "resources/images/glob_bright.png";
import { PreferredRouteDisplay } from "components/PreferredRouteDisplay";

const RouteMenuDiv = styled(OptionsMenu)`
  width: 570px;
`;
const RouteMenuHeader = styled(OptionsMenuHeader)``;
const RouteMenuBody = styled(OptionsBody)``;
const RouteMenuRow = styled(OptionsBodyRow)`
  padding: 4px 0;
`;
const InputContainer = styled.div`
  align-items: center;
  vertical-align: center;
  display: flex;
  flex-grow: 1;
  padding: 0;
  overflow: hidden;
  ${buttonBorderInverted2px};
`;
const Input = styled.input.attrs(() => ({ spellCheck: false }))`
  //cursor: default;
  font-size: ${(props) => props.theme.fontProps.inputFontSize};
  outline: none;
  flex: 1;
  width: 100%;
  color: ${(props) => props.theme.colors.grey};
  background-color: #000000;
  border: 1px solid transparent;

  ${borderHover}
`;
const PposDiv = styled.div`
  border: 2px solid transparent;
  border-right: none;
  padding: 0 2px;
  width: 11ch;
  font-size: ${(props) => props.theme.fontProps.fontSize};
  color: #575757;
`;
const ButtonCol = styled(OptionsBodyCol)`
  padding: 0 4px;
  display: flex;
  flex-grow: 0;
  min-height: 1.2em;
`;
const DisplayRouteDiv = styled(OptionsBodyCol)`
  border: 2px solid #414141;
  padding: 0 3px;
  margin: 2px 8px 8px 8px;
`;
const DctCol = styled(OptionsBodyCol)`
  display: flex;
  justify-content: flex-start;
  height: 20px;
  padding: 0 4px;
  width: 9ch;
  margin: auto 12px;
`;

type Append = { appendOplus: boolean; appendStar: boolean };
const toggleAppendStar = (prev: Append) => ({
  appendStar: !prev.appendStar,
  appendOplus: false,
});
const toggleAppendOplus = (prev: Append) => ({
  appendStar: false,
  appendOplus: !prev.appendOplus,
});

export const RouteMenu = () => {
  const dispatch = useRootDispatch();
  const pos = useRootSelector((state) => windowPositionSelector(state, EdstWindow.ROUTE_MENU));
  const asel = useRootSelector(aselSelector)!;
  const entry = useRootSelector(aselEntrySelector)!;
  const aircraftTrack = useRootSelector(aselTrackSelector);
  const zStack = useRootSelector(zStackSelector);
  const [frd, setFrd] = useState<Nullable<string>>(null);
  const hubActions = useHubActions();

  const pdrs = usePdr(entry.aircraftId);
  const pdars = usePdar(entry.aircraftId);
  const pars = usePar(entry.aircraftId);

  const formattedRoute = formatRoute(entry.route);
  const currentRouteFixes = useRouteFixes(entry.aircraftId);
  const [route, setRoute] = useState<string>(
    removeStringFromEnd(asel.window === EdstWindow.DEP ? formattedRoute : formattedRoute.replace(/^\.*/, "") ?? "", entry.destination)
  );
  const [routeInput, setRouteInput] = useState<string>(
    asel.window === EdstWindow.DEP ? entry.departure + route + entry.destination : route + entry.destination
  );
  const [trialPlan, setTrialPlan] = useState(!(asel.window === EdstWindow.DEP));
  const [append, setAppend] = useState({
    appendOplus: false,
    appendStar: false,
  });
  const ref = useRef<HTMLDivElement>(null);
  const focused = useFocused(ref);
  useCenterCursor(ref, [asel.aircraftId]);
  const { startDrag, dragPreviewStyle, anyDragging } = useDragging(ref, EdstWindow.ROUTE_MENU, "mouseup");

  useEffect(() => {
    if (aircraftTrack) {
      hubActions.generateFrd(aircraftTrack.location).then((frd) => setFrd(frd));
    }
  }, [aircraftTrack, entry.aircraftId, hubActions]);

  const { appendOplus, appendStar } = append;

  useEffect(() => {
    const dep = asel.window === EdstWindow.DEP;
    let route = dep ? formattedRoute : formattedRoute.replace(/^\.*/, "") ?? "";
    route = removeStringFromEnd(route ?? "", entry.destination);
    if (dep) {
      setTrialPlan(false);
    }
    setRoute(route);
    setRouteInput(dep ? entry.departure + route + entry.destination : route + entry.destination);
  }, [asel.window, formattedRoute, entry.departure, entry.destination, entry.route]);

  const currentRouteFixNames: string[] = currentRouteFixes.map((fix) => fix.name) ?? [];
  let routeFixes = currentRouteFixes;
  if (routeFixes.length > 1) {
    // if first fix is FRD
    if (routeFixes?.[0]?.name?.match(/^\w+\d{6}$/gi)) {
      routeFixes = routeFixes.slice(1);
    }
  }

  let routesAvailable = pars.length > 0;
  if (asel.window === EdstWindow.DEP) {
    routesAvailable = routesAvailable || pdrs.length > 0 || pdars.length > 0;
  }

  const amendPrefroute = async (amendedFlightplan: CreateOrAmendFlightplanDto) => {
    if (!trialPlan) {
      await hubActions.amendFlightplan(amendedFlightplan);
    } else {
      const route = formatRoute(amendedFlightplan.route, entry.departure, entry.destination);
      dispatch(
        addPlanThunk({
          cid: entry.cid,
          aircraftId: entry.aircraftId,
          amendedFlightplan,
          commandString: `AM ${entry.aircraftId} FIX ${frd} TIM EXX00 RTE ${route}${amendedFlightplan.destination}`,
          expirationTime: new Date().getTime() / 1000 + 120,
        })
      );
    }
  };

  const clearedPrefroute = async (prefRoute: EdstPreferentialRoute) => {
    let amendedFlightplan: CreateOrAmendFlightplanDto;
    if (prefRoute.routeType === "pdar") {
      amendedFlightplan = { ...entry, route: prefRoute.route };
      await amendPrefroute(amendedFlightplan);
    } else if (prefRoute.routeType === "pdr") {
      amendedFlightplan = {
        ...entry,
        route: prefRoute.amendment.split(".").join(" ") + prefRoute.truncatedRoute,
      };
      await amendPrefroute(amendedFlightplan);
    } else if (prefRoute.routeType === "par") {
      amendedFlightplan = {
        ...entry,
        route: prefRoute.truncatedRoute + prefRoute.amendment.split(".").join(" "),
      };
      await amendPrefroute(amendedFlightplan);
    }
    dispatch(closeWindow(EdstWindow.ROUTE_MENU));
  };

  const clearedToFix = async (clearedFixName: string) => {
    const frd = aircraftTrack ? await hubActions.generateFrd(aircraftTrack.location) : null;
    const route = getClearedToFixRouteFixes(clearedFixName, entry, routeFixes, formattedRoute, frd)?.route;
    if (route) {
      const amendedFlightplan: ApiFlightplan = {
        ...entry,
        route: route.split(/\.+/g).join(" ").trim(),
      };
      if (!trialPlan) {
        await hubActions.amendFlightplan(amendedFlightplan);
      } else {
        dispatch(
          addPlanThunk({
            cid: entry.cid,
            aircraftId: entry.aircraftId,
            amendedFlightplan,
            commandString: `AM ${entry.aircraftId} FIX ${frd} TIM EXX00 RTE ${route}${amendedFlightplan.destination}`,
            expirationTime: new Date().getTime() / 1000 + 120,
          })
        );
      }
    }
    dispatch(closeWindow(EdstWindow.ROUTE_MENU));
  };

  const handleInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (event) => {
    if (event.key === "Enter") {
      const frd = aircraftTrack ? await hubActions.generateFrd(aircraftTrack.location) : null;
      let newRoute = removeStringFromEnd(routeInput, entry.destination);
      if (asel.window === EdstWindow.DEP) {
        newRoute = removeStringFromStart(newRoute, entry.departure);
      } else {
        newRoute = `${frd}..${newRoute.replace(/^\.+/g, "")}`;
      }
      const amendedFlightplan = {
        ...entry,
        route: newRoute.toUpperCase().replace(/^\.+/gi, "").trim(),
      };
      if (trialPlan) {
        dispatch(
          addPlanThunk({
            cid: entry.cid,
            aircraftId: entry.aircraftId,
            amendedFlightplan,
            commandString: `AM ${entry.aircraftId} FIX ${frd} TIM EXX00 RTE ${newRoute}${amendedFlightplan.destination}`,
            expirationTime: new Date().getTime() / 1000 + 120,
          })
        );
      } else {
        await hubActions.amendFlightplan(amendedFlightplan);
      }
      dispatch(closeWindow(EdstWindow.ROUTE_MENU));
    }
  };

  useSharedUiListener("routeMenuSetTrialPlan", setTrialPlan);
  useSharedUiListener("routeMenuClickAppendStar", setAppend, toggleAppendStar);
  useSharedUiListener("routeMenuClickAppendOplus", setAppend, toggleAppendOplus);

  return (
    pos && (
      <RouteMenuDiv
        ref={ref}
        pos={pos}
        zIndex={zStack.indexOf(EdstWindow.ROUTE_MENU)}
        onMouseDown={() => zStack.indexOf(EdstWindow.ROUTE_MENU) < zStack.length - 1 && dispatch(pushZStack(EdstWindow.ROUTE_MENU))}
        anyDragging={anyDragging}
        id="route-menu"
      >
        {dragPreviewStyle && <EdstDraggingOutline style={dragPreviewStyle} />}
        <RouteMenuHeader focused={focused} onMouseDown={startDrag}>
          Route Menu
        </RouteMenuHeader>
        <RouteMenuBody>
          <FidRow>
            {entry.aircraftId} {`${entry.aircraftType}/${entry.faaEquipmentSuffix}`}
          </FidRow>
          <RouteMenuRow>
            <OptionsBodyCol>
              <EdstButton
                content="Trial Plan"
                selected={trialPlan}
                onMouseDown={() => {
                  socket.dispatchUiEvent("routeMenuSetTrialPlan", true);
                  setTrialPlan(true);
                }}
                title={Tooltips.routeMenuPlanData}
                disabled={asel.window === EdstWindow.DEP}
              />
            </OptionsBodyCol>
            <OptionsBodyCol maxWidth="24px" maxHeight="24px">
              <a href={`https://skyvector.com/?fpl=${entry.departure} ${entry.route} ${entry.destination}`} target="_blank" rel="noreferrer">
                <img src={SKYVECTOR_LOGO} alt="skyvector-logo" />
              </a>
            </OptionsBodyCol>
            <OptionsBodyCol maxWidth="24px" maxHeight="24px">
              <a
                href={`https://flightaware.com/analysis/route.rvt?origin=${entry.departure}&destination=${entry.destination}`}
                target="_blank"
                rel="noreferrer"
              >
                <img src={FLIGHTAWARE_LOGO} alt="flightaware-logo" />
              </a>
            </OptionsBodyCol>
            <OptionsBodyCol alignRight>
              {entry.cpdlcCapable && (
                <>
                  <EdstButton content="Uplink" />
                  <DownlinkSymbol />
                </>
              )}
              <EdstButton
                content="Amend"
                selected={!trialPlan}
                onMouseDown={() => {
                  socket.dispatchUiEvent("routeMenuSetTrialPlan", false);
                  setTrialPlan(false);
                }}
                title={Tooltips.routeMenuAmend}
              />
            </OptionsBodyCol>
          </RouteMenuRow>
          <RouteMenuRow>
            <OptionsBodyCol>
              <InputContainer>
                {!(asel.window === EdstWindow.DEP) && (
                  <EdstTooltip
                    title={Tooltips.routeMenuFrd}
                    onContextMenu={(event) => {
                      event.preventDefault();
                    }}
                  >
                    <PposDiv>{frd}..</PposDiv>
                  </EdstTooltip>
                )}
                <EdstTooltip
                  title={Tooltips.routeMenuRouteInput}
                  style={{
                    display: "flex",
                    justifyContent: "left",
                    flexGrow: "1",
                  }}
                >
                  <Input
                    value={routeInput}
                    onChange={(event) => setRouteInput(event.target.value)}
                    onKeyDown={(event) => handleInputKeyDown(event)}
                  />
                </EdstTooltip>
              </InputContainer>
            </OptionsBodyCol>
          </RouteMenuRow>
          <RouteMenuRow topBorder>
            <ButtonCol hover disabled title={Tooltips.routeMenuPar}>
              <OptionIndicator disabled size={9} />
              Include PAR
            </ButtonCol>
          </RouteMenuRow>
          <RouteMenuRow bottomBorder>
            <ButtonCol
              hover
              title={Tooltips.routeMenuAppendStar}
              onMouseDown={() => {
                socket.dispatchUiEvent("routeMenuClickAppendStar");
                setAppend(toggleAppendStar);
              }}
            >
              <OptionIndicator selected={appendStar} size={9} />
              Append *
            </ButtonCol>
            <ButtonCol
              hover
              title={Tooltips.routeMenuAppendOplus}
              onMouseDown={() => {
                socket.dispatchUiEvent("routeMenuClickAppendOplus");
                setAppend(toggleAppendOplus);
              }}
            >
              <OptionIndicator selected={appendOplus} size={9} />
              Append<span>&nbsp;{OPLUS_SYMBOL}</span>
            </ButtonCol>
          </RouteMenuRow>
          <EdstTooltip title={Tooltips.routeMenuDirectFix}>
            <UnderlineRow as={RouteMenuRow}>Direct-To-Fix</UnderlineRow>
          </EdstTooltip>
          <OptionsBodyRow>
            <DisplayRouteDiv>
              {asel.window === EdstWindow.DEP ? entry.departure + route + entry.destination : `./.${route}${entry.destination}`}
            </DisplayRouteDiv>
          </OptionsBodyRow>
          {_.range(0, Math.min(routeFixes?.length ?? 0, 10)).map((i) => (
            <OptionsBodyRow key={i}>
              {_.range(0, Math.round((routeFixes?.length ?? 0) / 10) + 1).map((j) => {
                const fixName = routeFixes?.[i + j * 10]?.name;
                return (
                  fixName && (
                    <DctCol hover key={`${i}-${j}`} onMouseDown={() => clearedToFix(fixName)} title={Tooltips.routeMenuDirectFix}>
                      {fixName}
                    </DctCol>
                  )
                );
              })}
            </OptionsBodyRow>
          ))}
          {routesAvailable && (
            <PreferredRouteDisplay
              par={pars.filter((parData) => currentRouteFixNames.includes(parData.triggeredFix)) ?? []}
              pdr={asel.window === EdstWindow.DEP ? pdrs : []}
              pdar={asel.window === EdstWindow.DEP ? pdars : []}
              clearedPrefroute={clearedPrefroute}
            />
          )}
          <OptionsBodyRow margin="14px 0 0 0" padding="">
            <OptionsBodyCol>
              <EdstButton disabled margin="0 4px 0 0" content="Flight Data" title={Tooltips.routeMenuFlightData} />
              <EdstButton
                disabled={entry.previousRoute === null}
                margin="0 4px 0 0"
                content="Previous Route"
                onMouseDown={() => {
                  dispatch(openMenuThunk(EdstWindow.PREV_ROUTE_MENU, ref.current, false, true));
                  dispatch(closeWindow(EdstWindow.ROUTE_MENU));
                }}
                title={Tooltips.routeMenuPrevRoute}
              />
              <EdstButton disabled content="TFM Reroute Menu" title={Tooltips.routeMenuTfmReroute} />
            </OptionsBodyCol>
            <OptionsBodyCol alignRight>
              <ExitButton onMouseDown={() => dispatch(closeWindow(EdstWindow.ROUTE_MENU))} />
            </OptionsBodyCol>
          </OptionsBodyRow>
        </RouteMenuBody>
      </RouteMenuDiv>
    )
  );
};
