import React, { useState } from "react";
import styled from "styled-components";
import { useInterval } from "usehooks-ts";
import { useRootDispatch, useRootSelector } from "../../../redux/hooks";
import { planQueueSelector, selectedPlanIndexSelector, setSelectedPlanIndex } from "../../../redux/slices/planSlice";
import { BodyRowDiv } from "../../../styles/bodyStyles";
import { NoSelectDiv } from "../../../styles/styles";
import { edstFontGreen, edstFontGrey } from "../../../styles/colors";
import { removePlanThunk } from "../../../redux/thunks/removePlanThunk";

const PlansDisplayBody = styled(NoSelectDiv)`
  overflow: hidden;
  display: block;
  flex-flow: column;
  border-top: 1px solid #adadad;
  color: ${edstFontGrey};
`;

type ColProps = Partial<{ hover: boolean; disabled: boolean; color: string; width: number; selected: boolean }>;
const Col = styled.div<ColProps>`
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  height: 1em;
  border: 1px solid transparent;

  &[disabled] {
    pointer-events: none;
    color: #000000;
  }
  width: ${props => (props.width ? `${props.width}px` : "auto")};
  ${props => props.color && { color: props.color }};
  ${props =>
    props.selected && {
      "background-color": props.color ?? "#ADADAD",
      color: "#000000"
    }};
  ${props => props.hover && { "&:hover": { border: "1px solid #F0F0F0" } }}
`;
const Col1 = styled(Col)`
  width: 20ch;
  justify-content: left;
  padding: 0 4px;
`;
const Col2 = styled(Col)<{ expired: boolean }>`
  margin-left: auto;
  margin-right: 15vw;
  width: 6ch;
  border: 1px solid #00ad00;
  color: #00ad00;
  padding: 0 4px;
`;

const formatTime = (expirationTime: number, currentTime: number) => {
  const max = Math.max(expirationTime - currentTime, 0);
  return `${Math.floor(max / 60).toString()}:${Math.floor(max % 60)
    .toString()
    .padStart(2, "0")}`;
};

export const PlansDisplayTable = () => {
  const dispatch = useRootDispatch();
  const planQueue = useRootSelector(planQueueSelector);
  const selectedPlanIndex = useRootSelector(selectedPlanIndexSelector);

  const [time, setTime] = useState(new Date().getTime() / 1000);
  useInterval(() => setTime(new Date().getTime() / 1000), 1000);

  const handleMouseDown = (event: React.MouseEvent, index: number) => {
    event.preventDefault();
    switch (event.button) {
      case 0:
        dispatch(setSelectedPlanIndex(selectedPlanIndex === index ? null : index));
        break;
      case 2:
        dispatch(removePlanThunk(index));
        break;
      default:
        break;
    }
  };

  return (
    <PlansDisplayBody>
      {planQueue?.map((p, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <BodyRowDiv key={i}>
          <Col1 selected={selectedPlanIndex === i} color={edstFontGreen} hover onMouseDown={(event: React.MouseEvent) => handleMouseDown(event, i)}>
            {p.cid} {p.aircraftId}
          </Col1>
          <Col>{p.commandString.toUpperCase()}</Col>
          <Col2 expired={p.expirationTime - time < 0}>{formatTime(p.expirationTime, time)}</Col2>
        </BodyRowDiv>
      ))}
    </PlansDisplayBody>
  );
};
