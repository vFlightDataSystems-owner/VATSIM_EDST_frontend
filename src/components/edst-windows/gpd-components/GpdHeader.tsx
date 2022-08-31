import React, { useCallback } from "react";
import styled from "styled-components";
import { WindowTitleBar } from "../WindowTitleBar";
import { EdstWindowHeaderButton } from "../../utils/EdstButton";
import { Tooltips } from "../../../tooltips";
import { useRootDispatch, useRootSelector } from "../../../redux/hooks";
import { closeAllMenus, closeWindow, gpdAselSelector } from "../../../redux/slices/appSlice";
import { NoSelectDiv } from "../../../styles/styles";
import { WindowHeaderRowDiv } from "../../../styles/edstWindowStyles";
import { gpdSuppressedSelector, toggleSuppressed } from "../../../redux/slices/gpdSlice";
import { openMenuThunk } from "../../../redux/thunks/openMenuThunk";
import { EdstWindow } from "../../../typeDefinitions/enums/edstWindow";

type GpdHeaderProps = {
  focused: boolean;
  toggleFullscreen: () => void;
  startDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
};

const GpdDiv = styled(NoSelectDiv)``;

export const GpdHeader = ({ focused, toggleFullscreen, startDrag, zoomLevel, setZoomLevel }: GpdHeaderProps) => {
  const asel = useRootSelector(gpdAselSelector);
  const suppressed = useRootSelector(gpdSuppressedSelector);
  const dispatch = useRootDispatch();

  const handleRangeClick = (event: React.MouseEvent) => {
    switch (event.button) {
      case 0:
        setZoomLevel(Math.min(zoomLevel + 1, 10));
        break;
      case 1:
        setZoomLevel(Math.max(zoomLevel - 1, 4));
        break;
      default:
        break;
    }
  };

  const handleSuppressClick = () => {
    dispatch(toggleSuppressed());
  };

  const handleClick = useCallback(
    (element: HTMLElement, edstWindow: EdstWindow) => {
      dispatch(openMenuThunk(edstWindow, element, true));
    },
    [dispatch]
  );

  return (
    <GpdDiv>
      <WindowTitleBar
        focused={focused}
        toggleFullscreen={toggleFullscreen}
        startDrag={startDrag}
        closeWindow={() => {
          if (asel?.window === EdstWindow.GPD) {
            dispatch(closeAllMenus());
          }
          dispatch(closeWindow(EdstWindow.GPD));
        }}
        text={["Graphic Plan Display - Current Time"]}
      />
      <div>
        <EdstWindowHeaderButton
          sharedUiEventId="openGpdPlanOptions"
          sharedUiEventHandler={handleClick}
          sharedUiEventHandlerArgs={EdstWindow.PLAN_OPTIONS}
          disabled={asel === null}
          onMouseDown={e => handleClick(e.currentTarget, EdstWindow.PLAN_OPTIONS)}
          content="Plan Options..."
          title={Tooltips.planOptions}
        />
        <EdstWindowHeaderButton
          sharedUiEventId="openGpdHoldMenu"
          sharedUiEventHandler={handleClick}
          sharedUiEventHandlerArgs={EdstWindow.HOLD_MENU}
          disabled={asel === null}
          onMouseDown={e => handleClick(e.currentTarget, EdstWindow.HOLD_MENU)}
          content="Hold..."
          title={Tooltips.hold}
        />
        <EdstWindowHeaderButton disabled content="Show" />
        <EdstWindowHeaderButton disabled content="Show ALL" />
        <EdstWindowHeaderButton disabled content="Graphic..." />
        <EdstWindowHeaderButton
          sharedUiEventId="openGpdTemplateMenu"
          sharedUiEventHandler={handleClick}
          sharedUiEventHandlerArgs={EdstWindow.TEMPLATE_MENU}
          onMouseDown={e => handleClick(e.currentTarget, EdstWindow.TEMPLATE_MENU)}
          content="Template..."
          title={Tooltips.template}
        />
        <EdstWindowHeaderButton
          disabled
          content="Clean Up"
          // title={Tooltips.gpdCleanUp}
        />
      </div>
      <WindowHeaderRowDiv>
        <EdstWindowHeaderButton disabled content="Recenter" title={Tooltips.planOptions} />
        <EdstWindowHeaderButton disabled onMouseDown={handleRangeClick} content="Range" />
        <EdstWindowHeaderButton content={!suppressed ? "Suppress" : "Restore"} onMouseDown={handleSuppressClick} width="84px" />
        <EdstWindowHeaderButton
          onMouseDown={e => {
            handleClick(e.currentTarget, EdstWindow.GPD_MAP_OPTIONS_MENU);
          }}
          content="Map Options..."
        />
        <EdstWindowHeaderButton
          onMouseDown={e => {
            handleClick(e.currentTarget, EdstWindow.TOOLS_MENU);
          }}
          content="Tools..."
        />
        <EdstWindowHeaderButton disabled content="Saved Map" />
      </WindowHeaderRowDiv>
    </GpdDiv>
  );
};
