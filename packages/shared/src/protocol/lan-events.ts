export interface ServerReadyPayload {
  protocolVersion: number;
}

export interface ClientToServerEvents {
  "client:hello": (payload: { protocolVersion: number }) => void;
}

export interface ServerToClientEvents {
  "server:ready": (payload: ServerReadyPayload) => void;
}

export interface InterServerEvents {}

export interface ServerSocketData {
  playerId?: string;
}
