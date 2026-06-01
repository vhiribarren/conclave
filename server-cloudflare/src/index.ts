/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { ConclaveRoom } from "./conclave-room";
import { generateRoomId } from "conclave-shared";

export { ConclaveRoom };
export interface Env {
  CONCLAVE_ROOM: DurableObjectNamespace<ConclaveRoom>;
  DISCONNECT_GRACE_PERIOD_MS?: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const method = request.method;
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.debug(`${method} ${pathname}`)

    // TODO: scope to EU jurisdiction
    const scopedDurableObject = env.CONCLAVE_ROOM;

    if (method === "POST" && pathname === "/api/rooms") {
      return await apiRoomCreate(scopedDurableObject, request);
    }

    const wsMatch = pathname.match(/^\/api\/rooms\/(?<roomId>[^/]+)\/ws$/);
    if (wsMatch) {
      const roomId = wsMatch?.groups?.roomId;
      if (!roomId) {
        console.warn(`Missing roomId in WebSocket path: ${pathname}`);
        return new Response("Bad request", { status: 400 });
      }
      return await apiWebsocket(scopedDurableObject, request, roomId);
    }

    console.warn(`No route matched: ${method} ${pathname}`);
    return new Response("Resource does not exist.", { status: 404 });
  },
};

async function apiRoomCreate(durableObject: DurableObjectNamespace<ConclaveRoom>, request: Request): Promise<Response> {
      const { roomTitle, adminId } = await request.json() as { roomTitle?: string, adminId?: string };
      if (!adminId) {
        console.warn("POST /api/rooms: missing adminId field");
        return new Response("Bad request", { status: 400 });
      }
      const roomId = generateRoomId();
      const id = durableObject.idFromName(roomId);
      const obj = durableObject.get(id);
      await obj.createRoom(adminId, roomTitle);
      console.info(`Room created: ${roomId}`);
      return new Response(JSON.stringify({ roomId }));
}

async function apiWebsocket(durableObject: DurableObjectNamespace<ConclaveRoom>, request: Request, roomId: string): Promise<Response> {
    const id = durableObject.idFromName(roomId);
    const obj = durableObject.get(id);
    return obj.fetch(request);
}