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
import type { RoomState, Task, Round } from "conclave-shared";
import { DEFAULT_DECK } from "conclave-shared";

export class ConclaveRoom extends DurableObject {
  private state: RoomState = {
    created: false,
    participants: [],
    tasks: [],
    currentTaskId: null,
    deck: DEFAULT_DECK,
    deckMode: 'preset',
    timerEndAt: null,
    timerPausedRemainingMs: null,
    adminId: null,
    unassociatedRound: { id: Math.random().toString(36).substring(2, 10), votes: {}, revealed: false },
  };

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<RoomState>("state");
      if (stored) {
        this.state = stored;
      }
    });
  }

  async createRoom(adminId: string, roomTitle: string | undefined) {
      console.log("Initializing room...");
      this.state.created = true;
      this.state.name = roomTitle;
      this.state.adminId = adminId;
      await this.ctx.storage.put("state", this.state);
      this.updateAlarm();
  }

  async fetch(request: Request) {    
    if (!this.state.created) {
      return new Response("Room does not exist", { status: 404 });
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    this.updateAlarm();
    try {
      const data = JSON.parse(message as string);
      console.log(`Received message: ${data.type}`);
      await this.handleMessage(ws, data);
    } catch (err) {
      console.error("Error handling message:", err);
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.handleDisconnect(ws);
  }

  private handleDisconnect(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as { sessionId?: string };
    if (attachment && attachment.sessionId) {
      this.state.participants = this.state.participants.filter((p) => p.id !== attachment.sessionId);
      this.broadcastState();
      this.ctx.storage.put("state", this.state);
    }
  }

  private updateAlarm() {
    // 48 hours from now
    this.ctx.storage.setAlarm(Date.now() + 48 * 60 * 60 * 1000);
  }

  async alarm() {
    // Destroy room after 48h of inactivity
    await this.ctx.storage.deleteAll();
    for (const ws of this.ctx.getWebSockets()) {
      ws.close(1000, "Room expired after 48h of inactivity");
    }
  }

  async handleMessage(ws: WebSocket, data: any) {
    const attachment = (ws.deserializeAttachment() || {}) as { sessionId?: string };

    switch (data.type) {
      case "USER_JOIN":
        const sessionId = data.userId || Math.random().toString(36).substring(2, 15);
        ws.serializeAttachment({ ...attachment, sessionId });
        
        // Remove old participant if they reconnected
        this.state.participants = this.state.participants.filter((p) => p.id !== sessionId);

        this.state.participants.push({
          id: sessionId,
          name: data.name || "Anonymous",
          mood: data.mood || "🦊",
          vote: null,
          isAdmin: sessionId === this.state.adminId,
          isSpectator: data.isSpectator || false,
        });
        this.broadcastState();
        break;

      case "USER_UPDATE_PROFILE":
        const p = this.state.participants.find((p) => p.id === attachment.sessionId);
        if (!p) {
          console.error(`USER_UPDATE_PROFILE: Participant not found for session ${attachment.sessionId}`);
          return;
        }
        p.name = data.name || p.name;
        p.mood = data.mood || p.mood;
        this.broadcastState();
        break;

      case "USER_VOTE":
        const participant = this.state.participants.find((p) => p.id === attachment.sessionId);
        if (!participant) {
          console.error(`USER_VOTE: Participant not found for session ${attachment.sessionId}`);
          return;
        }
        
        let currentRound: Round | undefined;
        if (this.state.currentTaskId) {
          const task = this.state.tasks.find(t => t.id === this.state.currentTaskId);
          if (task && task.rounds.length > 0) {
            currentRound = task.rounds[task.rounds.length - 1];
          }
        } else {
          currentRound = this.state.unassociatedRound;
        }

        if (currentRound && !currentRound.revealed) {
          if (data.vote === null) {
            delete currentRound.votes[participant.id];
          } else {
            currentRound.votes[participant.id] = data.vote;
          }
          this.broadcastState();
        }
        break;

      case "ADMIN_REVEAL":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_REVEAL: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        let roundToReveal: Round | undefined;
        if (this.state.currentTaskId) {
          const task = this.state.tasks.find(t => t.id === this.state.currentTaskId);
          if (task && task.rounds.length > 0) {
            roundToReveal = task.rounds[task.rounds.length - 1];
          }
        } else {
          roundToReveal = this.state.unassociatedRound;
        }

        if (roundToReveal) {
          roundToReveal.revealed = true;
          this.state.timerEndAt = null;
          this.state.timerPausedRemainingMs = null;
          this.broadcastState();
        }
        break;

      case "ADMIN_RESET":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_RESET: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (this.state.currentTaskId) {
          const task = this.state.tasks.find(t => t.id === this.state.currentTaskId);
          if (task) {
            task.rounds.push({ id: Math.random().toString(36).substring(2, 10), votes: {}, revealed: false });
          }
        } else {
          this.state.unassociatedRound = { id: Math.random().toString(36).substring(2, 10), votes: {}, revealed: false };
        }
        this.state.timerEndAt = null;
        this.state.timerPausedRemainingMs = null;
        this.broadcastState();
        break;

      case "ADMIN_ADD_TASK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_ADD_TASK: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (!data.name) {
          console.error("ADMIN_ADD_TASK: Missing task name");
          return;
        }
        const newTask: Task = {
          id: Math.random().toString(36).substring(2, 10),
          name: data.name,
          rounds: [{ id: Math.random().toString(36).substring(2, 10), votes: {}, revealed: false }]
        };
        this.state.tasks.push(newTask);
        if (!this.state.currentTaskId) {
          this.state.currentTaskId = newTask.id;
        }
        this.broadcastState();
        break;

      case "ADMIN_SET_TASK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_SET_TASK: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        this.state.currentTaskId = data.taskId;
        this.state.timerEndAt = null;
        this.state.timerPausedRemainingMs = null;
        this.broadcastState();
        break;
      
      case "ADMIN_DELETE_TASK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_DELETE_TASK: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (!data.taskId) {
          console.error("ADMIN_DELETE_TASK: Missing taskId");
          return;
        }
        this.state.tasks = this.state.tasks.filter(t => t.id !== data.taskId);
        if (this.state.currentTaskId === data.taskId) {
          this.state.currentTaskId = this.state.tasks.length > 0 ? this.state.tasks[0]?.id : null;
          this.state.timerEndAt = null;
        }
        this.broadcastState();
        break;

      case "ADMIN_SET_DECK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_SET_DECK: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (!Array.isArray(data.deck)) {
          console.error("ADMIN_SET_DECK: Invalid deck format");
          return;
        }
        this.state.deck = data.deck;
        this.state.deckMode = data.mode || 'custom';
        this.broadcastState();
        break;

      case "ADMIN_SET_TIMER":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_SET_TIMER: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        this.state.timerPausedRemainingMs = null;
        if (data.durationMs === null) {
          this.state.timerEndAt = null;
        } else {
          this.state.timerEndAt = Date.now() + data.durationMs;
        }
        this.broadcastState();
        break;

      case "ADMIN_PAUSE_TIMER":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_PAUSE_TIMER: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (!this.state.timerEndAt) return;
        this.state.timerPausedRemainingMs = Math.max(0, this.state.timerEndAt - Date.now());
        this.state.timerEndAt = null;
        this.broadcastState();
        break;

      case "ADMIN_RESUME_TIMER":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_RESUME_TIMER: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (this.state.timerPausedRemainingMs === null) return;
        this.state.timerEndAt = Date.now() + this.state.timerPausedRemainingMs;
        this.state.timerPausedRemainingMs = null;
        this.broadcastState();
        break;

      case "ADMIN_TRANSFER_ADMIN":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_TRANSFER_ADMIN: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (!data.targetUserId) {
          console.error("ADMIN_TRANSFER_ADMIN: Missing targetUserId");
          return;
        }
        const currentAdmin = this.state.participants.find((p) => p.id === attachment.sessionId);
        const targetUser = this.state.participants.find((p) => p.id === data.targetUserId);
        if (currentAdmin && targetUser) {
          this.state.adminId = data.targetUserId;
          currentAdmin.isAdmin = false;
          targetUser.isAdmin = true;
          this.broadcastState();
        }
        break;
      
      case "ADMIN_RENAME_ROOM":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_RENAME_ROOM: Unauthorized access from session ${attachment.sessionId}`);
          return;
        }
        if (!data.name) {
          console.error("ADMIN_RENAME_ROOM: Missing name");
          return;
        }
        this.state.name = data.name;
        this.broadcastState();
        break;
    }
    await this.ctx.storage.put("state", this.state);
  }

  isAdmin(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as { sessionId?: string };
    return this.state.participants.find((p) => p.id === attachment?.sessionId)?.isAdmin;
  }

  broadcastState() {
    let currentRound: Round | null = null;
    if (this.state.currentTaskId) {
      const task = this.state.tasks.find(t => t.id === this.state.currentTaskId);
      if (task && task.rounds.length > 0) {
        currentRound = task.rounds[task.rounds.length - 1] || null;
      }
    } else {
      currentRound = this.state.unassociatedRound;
    }

    const stateToSend = JSON.stringify({
      type: "STATE",
      payload: {
        ...this.state,
        participants: this.state.participants.map((p) => {
          const vote = currentRound?.votes[p.id] || null;
          return {
            ...p,
            vote: currentRound?.revealed ? vote : vote ? "✓" : null,
          };
        }),
      },
    });

    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(stateToSend);
      } catch (err) {
        // Handle closed connections
      }
    }
  }
}
