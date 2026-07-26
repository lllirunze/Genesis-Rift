import { createLanServer } from "./server/create-lan-server.ts";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const lanServer = createLanServer({ clientOrigin });

lanServer.httpServer.listen(port, host, () => {
  console.info(`Genesis Rift LAN server is listening on http://${host}:${port}`);
});
