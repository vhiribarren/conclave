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
import type { RoomState, Task, Round, ServerMessage } from "conclave-shared";
import { DEFAULT_DECK } from "conclave-shared";
import { SqlKvStorage } from "./kv-storage";

const INACTIVITY_ALARM_MS = 48 * 60 * 60 * 1000 // 48H

/**
 * Mapping between private userId (known only to the user) and publicId (visible to all participants).
 * Persisted in SQL so it survives hibernation and DO restarts.
 */
type UserIdMapping = Record<string, string>; // userId -> publicId

export class ConclaveRoom extends DurableObject {
  private kv = new SqlKvStorage(this.ctx.storage.sql);

  // State uses publicIds everywhere: participants[].id, adminId, round votes keys
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

  // userId -> publicId mapping, persisted in SQL under key "userIdMapping"
  private userIdMapping: UserIdMapping = {};

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = this.kv.get<RoomState>("state");
      if (stored) {
        this.state = stored;
      }
      const mapping = this.kv.get<UserIdMapping>("userIdMapping");
      if (mapping) {
        this.userIdMapping = mapping;
      }
    });
  }

  async createRoom(adminId: string, roomTitle: string | undefined) {
      console.log(`Creating new room - roomId: ${this.ctx.id.name}, adminId: ${adminId}, roomTitle: ${roomTitle}`);
      // adminId here is the userId from the creator; generate a publicId for them
      const publicId = this.generatePublicId();
      this.userIdMapping[adminId] = publicId;
      this.state.created = true;
      this.state.name = roomTitle;
      this.state.adminId = publicId;
      this.kv.put("state", this.state);
      this.kv.put("userIdMapping", this.userIdMapping);
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

  async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    this.handleDisconnect(_ws);
  }

  async webSocketError(_ws: WebSocket, _error: unknown) {
    this.handleDisconnect(_ws);
  }

  private handleDisconnect(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as { publicId?: string };
    if (attachment?.publicId) {
      // Check if another WebSocket with the same publicId is still connected
      const hasOtherConnection = this.ctx.getWebSockets().some((other) => {
        if (other === ws) return false;
        const otherAttachment = other.deserializeAttachment() as { publicId?: string };
        return otherAttachment?.publicId === attachment.publicId;
      });
      if (!hasOtherConnection) {
        this.state.participants = this.state.participants.filter((p) => p.id !== attachment.publicId);
        this.broadcastState();
        this.kv.put("state", this.state);
      }
    }
  }

  private updateAlarm() {
    this.ctx.storage.setAlarm(Date.now() + INACTIVITY_ALARM_MS);
  }

  async alarm() {
    // Destroy room after inactivity
    await this.ctx.storage.deleteAll();
    for (const ws of this.ctx.getWebSockets()) {
      ws.close(1000, `Room expired after ${INACTIVITY_ALARM_MS/(1000*60*60)}H of inactivity`);
    }
  }

  async handleMessage(ws: WebSocket, data: any) {
    const attachment = (ws.deserializeAttachment() || {}) as { publicId?: string };

    switch (data.type) {
      case "USER_JOIN":
        const userId = data.userId || Math.random().toString(36).substring(2, 15);

        // Resolve or create publicId for this userId
        let publicId = this.userIdMapping[userId];
        if (!publicId) {
          publicId = this.generatePublicId();
          this.userIdMapping[userId] = publicId;
          this.kv.put("userIdMapping", this.userIdMapping);
        }

        // Store publicId in the WebSocket attachment (survives hibernation)
        ws.serializeAttachment({ publicId });
        
        // Remove old participant if they reconnected
        this.state.participants = this.state.participants.filter((p) => p.id !== publicId);

        this.state.participants.push({
          id: publicId,
          name: data.name || "Anonymous",
          mood: data.mood || "🦊",
          vote: null,
          isAdmin: publicId === this.state.adminId,
        });
        ws.send(JSON.stringify({ type: "JOINED", publicId } satisfies ServerMessage));

        this.broadcastState();
        break;

      case "USER_UPDATE_PROFILE": {
        const p = this.state.participants.find((p) => p.id === attachment.publicId);
        if (!p) {
          console.error(`USER_UPDATE_PROFILE: Participant not found for publicId ${attachment.publicId}`);
          return;
        }
        p.name = data.name || p.name;
        p.mood = data.mood || p.mood;
        this.broadcastState();
        break;
      }

      case "USER_VOTE": {
        const participant = this.state.participants.find((p) => p.id === attachment.publicId);
        if (!participant) {
          console.error(`USER_VOTE: Participant not found for publicId ${attachment.publicId}`);
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
      }

      case "ADMIN_REVEAL":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_REVEAL: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        {
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
        }
        break;

      case "ADMIN_RESET":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_RESET: Unauthorized access from publicId ${attachment.publicId}`);
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
          console.error(`ADMIN_ADD_TASK: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        if (!data.name) {
          console.error("ADMIN_ADD_TASK: Missing task name");
          return;
        }
        {
          const newTask: Task = {
            id: Math.random().toString(36).substring(2, 10),
            name: data.name,
            rounds: [{ id: Math.random().toString(36).substring(2, 10), votes: {}, revealed: false }]
          };
          this.state.tasks.push(newTask);
          if (!this.state.currentTaskId) {
            this.state.currentTaskId = newTask.id;
          }
        }
        this.broadcastState();
        break;

      case "ADMIN_RENAME_TASK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_RENAME_TASK: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        if (!data.taskId || !data.name) {
          console.error("ADMIN_RENAME_TASK: Missing taskId or name");
          return;
        }
        {
          const task = this.state.tasks.find(t => t.id === data.taskId);
          if (task) {
            task.name = data.name;
          }
        }
        this.broadcastState();
        break;

      case "ADMIN_SET_TASK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_SET_TASK: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        this.state.currentTaskId = data.taskId;
        this.state.timerEndAt = null;
        this.state.timerPausedRemainingMs = null;
        this.broadcastState();
        break;
      
      case "ADMIN_DELETE_TASK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_DELETE_TASK: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        if (!data.taskId) {
          console.error("ADMIN_DELETE_TASK: Missing taskId");
          return;
        }
        this.state.tasks = this.state.tasks.filter(t => t.id !== data.taskId);
        if (this.state.currentTaskId === data.taskId) {
          this.state.currentTaskId = this.state.tasks.length > 0 ? this.state.tasks[0]?.id ?? null : null;
          this.state.timerEndAt = null;
        }
        this.broadcastState();
        break;

      case "ADMIN_SET_DECK":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_SET_DECK: Unauthorized access from publicId ${attachment.publicId}`);
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
          console.error(`ADMIN_SET_TIMER: Unauthorized access from publicId ${attachment.publicId}`);
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
          console.error(`ADMIN_PAUSE_TIMER: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        if (!this.state.timerEndAt) return;
        this.state.timerPausedRemainingMs = Math.max(0, this.state.timerEndAt - Date.now());
        this.state.timerEndAt = null;
        this.broadcastState();
        break;

      case "ADMIN_RESUME_TIMER":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_RESUME_TIMER: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        if (this.state.timerPausedRemainingMs === null) return;
        this.state.timerEndAt = Date.now() + this.state.timerPausedRemainingMs;
        this.state.timerPausedRemainingMs = null;
        this.broadcastState();
        break;

      case "ADMIN_TRANSFER_ADMIN":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_TRANSFER_ADMIN: Unauthorized access from publicId ${attachment.publicId}`);
          return;
        }
        if (!data.targetUserId) {
          console.error("ADMIN_TRANSFER_ADMIN: Missing targetUserId");
          return;
        }
        {
          // data.targetUserId is a publicId sent by the client
          const targetPublicId = data.targetUserId;
          const currentAdmin = this.state.participants.find((p) => p.id === attachment.publicId);
          const targetUser = this.state.participants.find((p) => p.id === targetPublicId);
          if (currentAdmin && targetUser) {
            this.state.adminId = targetPublicId;
            currentAdmin.isAdmin = false;
            targetUser.isAdmin = true;
            this.broadcastState();
          }
        }
        break;
      
      case "ADMIN_RENAME_ROOM":
        if (!this.isAdmin(ws)) {
          console.error(`ADMIN_RENAME_ROOM: Unauthorized access from publicId ${attachment.publicId}`);
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
    this.kv.put("state", this.state);
  }

  private isAdmin(ws: WebSocket): boolean {
    const attachment = ws.deserializeAttachment() as { publicId?: string };
    return !!this.state.participants.find((p) => p.id === attachment?.publicId)?.isAdmin;
  }

  private generatePublicId(): string {
    return crypto.randomUUID();
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
      serverTime: Date.now(),
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
