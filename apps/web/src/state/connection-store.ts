import { create } from "zustand";

type ConnectionStatus = "offline" | "connecting" | "connected";

interface ConnectionState {
  status: ConnectionStatus;
  serverUrl: string;
  setServerUrl: (serverUrl: string) => void;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "offline",
  serverUrl: "http://localhost:3000",
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setStatus: (status) => set({ status }),
}));
