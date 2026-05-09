import { DurableObject } from "cloudflare:workers";

interface Participant {
  id: string;
  name: string;
  vote: string | null;
  isAdmin: boolean;
  isSpectator: boolean;
}

interface RoomState {
  participants: Participant[];
  revealed: boolean;
  currentTask: string;
}

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

    const [client, server] = new WebSocketPair();
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
