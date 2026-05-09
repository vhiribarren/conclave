export { ConclaveRoom } from "./conclave-room";

export interface Env {
  CONCLAVE_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");

    if (!roomId) {
      return new Response("Missing roomId", { status: 400 });
    }

    const id = env.CONCLAVE_ROOM.idFromName(roomId);
    const obj = env.CONCLAVE_ROOM.get(id);

    return obj.fetch(request);
  },
};
