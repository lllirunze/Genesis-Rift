import type { ClientToServerEvents, ServerToClientEvents } from "@genesis-rift/shared";
import { io, type Socket } from "socket.io-client";

export type LanSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createLanSocket(serverUrl: string): LanSocket {
  return io(serverUrl, {
    autoConnect: false,
  });
}
