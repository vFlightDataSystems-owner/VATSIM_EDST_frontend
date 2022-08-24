import React, { createContext, ReactNode, useCallback, useRef } from "react";
import { createSocket } from "../sharedState/socket";
import { receiveSharedStateAircraft } from "../redux/thunks/sharedStateThunks/receiveSharedStateAircraft";
import { log } from "../console";
import { useRootDispatch } from "../redux/hooks";
import { receiveUiStateThunk } from "../redux/thunks/sharedStateThunks/receiveUiStateThunk";
import { receiveAclStateThunk } from "../redux/thunks/sharedStateThunks/receiveAclStateThunk";
import { receivePlansDisplayStateThunk } from "../redux/thunks/sharedStateThunks/receivePlansDisplayStateThunk";
import { receiveDepStateThunk } from "../redux/thunks/sharedStateThunks/receiveDepStateThunk";
import { receiveGpdStateThunk } from "../redux/thunks/sharedStateThunks/receiveGpdStateThunk";

type SocketContextValue = {
  connectSocket: ((artccId: string, sectorId: string) => void) | null;
};

export const SocketContext = createContext<SocketContextValue>({ connectSocket: null });

export const SocketContextProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useRootDispatch();

  const connectSocket = useCallback(
    (artccId: string, sectorId: string) => {
      const socket = createSocket(artccId, sectorId);
      if (socket) {
        socket.on("receiveAircraft", aircraft => {
          dispatch(receiveSharedStateAircraft(aircraft));
        });
        socket.on("receiveUiState", state => {
          dispatch(receiveUiStateThunk(state));
        });
        socket.on("receiveAclState", state => {
          dispatch(receiveAclStateThunk(state));
        });
        socket.on("receiveDepState", state => {
          dispatch(receiveDepStateThunk(state));
        });
        socket.on("receiveGpdState", state => {
          dispatch(receiveGpdStateThunk(state));
        });
        socket.on("receivePlansDisplayState", state => {
          dispatch(receivePlansDisplayStateThunk(state));
        });
        socket.on("disconnect", log);
      }
    },
    [dispatch]
  );

  const ref = useRef<SocketContextValue>({ connectSocket });

  return <SocketContext.Provider value={ref.current}>{children}</SocketContext.Provider>;
};