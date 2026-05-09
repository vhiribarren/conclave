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
import { DurableObject } from "cloudflare:workers";
import type { RoomState } from "@conclave/shared";

export class ConclaveRoom extends DurableObject {
  private state: RoomState = {
    participants: [],
    revealed: false,
    currentTask: "",
  };

  private sessions = new Map<WebSocket, string>();

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<RoomState>("state");
      if (stored) {
        this.state = stored;
      }
    });
  }

  async fetch(request: Request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    await this.handleSession(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(ws: WebSocket) {
    ws.accept();

    ws.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        await this.handleMessage(ws, data);
      } catch (err) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    });

    ws.addEventListener("close", () => {
      const sessionId = this.sessions.get(ws);
      if (sessionId) {
        this.state.participants = this.state.participants.filter((p) => p.id !== sessionId);
        this.sessions.delete(ws);
        this.broadcastState();
      }
    });
  }

  async handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case "JOIN":
        const sessionId = Math.random().toString(36).substring(2, 15);
        this.sessions.set(ws, sessionId);
        const isFirst = this.state.participants.length === 0;
        this.state.participants.push({
          id: sessionId,
          name: data.name || "Anonymous",
          vote: null,
          isAdmin: isFirst,
          isSpectator: data.isSpectator || false,
        });
        this.broadcastState();
        break;

      case "VOTE":
        const sid = this.sessions.get(ws);
        const participant = this.state.participants.find((p) => p.id === sid);
        if (participant) {
          participant.vote = data.vote;
          this.broadcastState();
        }
        break;

      case "REVEAL":
        if (this.isAdmin(ws)) {
          this.state.revealed = true;
          this.broadcastState();
        }
        break;

      case "RESET":
        if (this.isAdmin(ws)) {
          this.state.revealed = false;
          this.state.participants.forEach((p) => (p.vote = null));
          this.broadcastState();
        }
        break;

      case "SET_TASK":
        if (this.isAdmin(ws)) {
          this.state.currentTask = data.task;
          this.broadcastState();
        }
        break;
    }
    await this.ctx.storage.put("state", this.state);
  }

  isAdmin(ws: WebSocket) {
    const sid = this.sessions.get(ws);
    return this.state.participants.find((p) => p.id === sid)?.isAdmin;
  }

  broadcastState() {
    const stateToSend = JSON.stringify({
      type: "STATE",
      payload: {
        ...this.state,
        participants: this.state.participants.map((p) => ({
          ...p,
          vote: this.state.revealed ? p.vote : p.vote ? "✓" : null,
        })),
      },
    });

    for (const [ws] of this.sessions) {
      try {
        ws.send(stateToSend);
      } catch (err) {
        // Handle closed connections
      }
    }
  }
}
