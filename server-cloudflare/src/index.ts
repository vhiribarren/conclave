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
export { ConclaveRoom } from "./conclave-room";
import { generateRoomId } from "conclave-shared";

export interface Env {
  CONCLAVE_ROOM: DurableObjectNamespace;
}

const API_PREFIX = "/api/"
const API_ROOM_CREATE = `${API_PREFIX}rooms/create`;
const API_WEBSOCKET = `${API_PREFIX}ws`;

export default {
  async fetch(request: Request, env: Env) {
    const method = request.method;
    const url = new URL(request.url);
    const pathname = url.pathname;

    console.log(`Called URL: ${url}`)

    if (!pathname.startsWith(API_PREFIX)) {
        console.log(`${pathname} does not match pattern ${API_PREFIX}, bailing out.`);
        return new Response("Resource not managed.", { status: 404 });
    }

    // TODO: scope to EU jurisdiction
    const scopedDurableObject = env.CONCLAVE_ROOM;

    if (method === "POST" && pathname === API_ROOM_CREATE) {
      return await apiRoomCreate(scopedDurableObject, request);
    }
    if (pathname === API_WEBSOCKET) {
      return await apiWebsocket(scopedDurableObject, request, url);
    }

  return new Response("Resource does not exist in this scope", { status: 404 });
  },
};

async function apiRoomCreate(durableObject: DurableObjectNamespace, request: Request): Promise<Response> {
      const { name } = await request.json() as { name?: string };
      const roomId = generateRoomId();
      const id = durableObject.idFromName(roomId);
      const obj = durableObject.get(id);
      await obj.fetch(new Request("http://do/init", { 
        method: "POST",
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" }
      }));
      return new Response(JSON.stringify({ roomId }));
}

async function apiWebsocket(durableObject: DurableObjectNamespace, request: Request, url: URL): Promise<Response> {
    const roomId = url.searchParams.get("roomId");
    if (!roomId) {
      return new Response("Missing roomId", { status: 400 });
    }
    const id = durableObject.idFromName(roomId);
    const obj = durableObject.get(id);
    return obj.fetch(request);
}