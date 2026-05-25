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
import { SqlKvStorage, SqlKvStore } from "./kv-storage";
import { RoomLogger } from "./logger";

const INACTIVITY_ALARM_MS = 48 * 60 * 60 * 1000 // 48H
const KV_STATE = "state";
const KV_USER_ID_MAPPING = "userIdMapping";

/**
 * Mapping between private userId (known only to the user) and publicId (visible to all participants).
 * Persisted in SQL so it survives hibernation and DO restarts.
 */
type UserIdMapping = Record<string, string>; // userId -> publicId

export class ConclaveRoom extends DurableObject {
  private store: SqlKvStore | null = null;
  private readonly log: RoomLogger;

  // State uses publicIds everywhere: participants[].id, adminId, round votes keys
  private state: RoomState = {
    participants: [],
    tasks: [],
    currentTaskId: null,
    deck: DEFAULT_DECK,
    deckMode: 'preset',
    timerEndAt: null,
    timerPausedRemainingMs: null,
    timerDurationMs: 30000,
    adminId: null,
    unassociatedRound: { id: Math.random().toString(36).substring(2, 10), votes: {}, revealed: false },
    anonymousVoting: false,
  };

  // userId -> publicId mapping, persisted in SQL under key "userIdMapping"
  private userIdMapping: UserIdMapping = {};

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    const roomId = this.ctx.id.name ?? this.ctx.id.toString().slice(0, 8);
    this.log = new RoomLogger(roomId);
    this.ctx.blockConcurrencyWhile(async () => {
      const kvStorage = new SqlKvStorage(this.ctx.storage.sql);
      if (!kvStorage.isInitialized()) return;
      const store = kvStorage.getOrCreateStore();
      this.store = store;
      const storedState = store.get<RoomState>(KV_STATE);
      if (storedState) {
        this.state = storedState;
      }
      const storedUserIdMapping = store.get<UserIdMapping>(KV_USER_ID_MAPPING);
      if (storedUserIdMapping) {
        this.userIdMapping = storedUserIdMapping;
      }
      this.log.info(`State restored - ${this.state.participants.length} participant(s)`);
    });
  }

  async createRoom(adminId: string, roomTitle: string | undefined) {
      this.log.info(`Creating room - adminId: ${adminId}, title: ${roomTitle ?? "(none)"}`);
      const kvStorage = new SqlKvStorage(this.ctx.storage.sql);
      this.store = kvStorage.getOrCreateStore();
      // adminId here is the userId from the creator; generate a publicId for them
      const publicId = this.generatePublicId();
      this.userIdMapping[adminId] = publicId;
      this.state.name = roomTitle;
      this.state.adminId = publicId;
      this.store.put(KV_STATE, this.state);
      this.store.put(KV_USER_ID_MAPPING, this.userIdMapping);
      this.updateAlarm();
  }

  async fetch(request: Request) {    
    if (!this.store) {
      this.log.debug("Fetch on non-existent room, returning 404");
      return new Response("Room does not exist", { status: 404 });
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      this.log.warn("Non-WebSocket request received");
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
      this.log.debug(`Message received: ${data.type}`);
      await this.handleMessage(ws, data);
    } catch (err) {
      this.log.error("Failed to handle message:", err);
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
        this.log.info(`Participant disconnected: ${attachment.publicId}`);
        this.state.participants = this.state.participants.filter((p) => p.id !== attachment.publicId);
        this.broadcastState();
        this.store!.put(KV_STATE, this.state);
      }
    }
  }

  private updateAlarm() {
    this.ctx.storage.setAlarm(Date.now() + INACTIVITY_ALARM_MS);
  }

  async alarm() {
    this.log.info(`Room expired after ${INACTIVITY_ALARM_MS/(1000*60*60)}H of inactivity, destroying`);
    await this.ctx.storage.deleteAll();
    for (const ws of this.ctx.getWebSockets()) {
      ws.close(1000, `Room expired after ${INACTIVITY_ALARM_MS/(1000*60*60)}H of inactivity`);
    }
  }

  async handleMessage(ws: WebSocket, data: any) {
    const senderPublicId = (ws.deserializeAttachment() as { publicId?: string })?.publicId;

    switch (data.type) {
      case "USER_JOIN":
        const userId = data.userId || Math.random().toString(36).substring(2, 15);

        // Resolve or create publicId for this userId
        let publicId = this.userIdMapping[userId];
        if (!publicId) {
          publicId = this.generatePublicId();
          this.userIdMapping[userId] = publicId;
          this.store!.put(KV_USER_ID_MAPPING, this.userIdMapping);
        }

        // Store publicId in the WebSocket attachment (survives hibernation)
        ws.serializeAttachment({ publicId });
        
        // Check if another WebSocket with this publicId is already connected (multi-device)
        const hasExistingConnection = this.ctx.getWebSockets().some((other) => {
          if (other === ws) return false;
          const otherAttachment = other.deserializeAttachment() as { publicId?: string };
          return otherAttachment?.publicId === publicId;
        });

        if (hasExistingConnection) {
          // Multi-device (e.g. desktop + remote) — keep existing participant as-is
        } else {
          // Single device reconnect or first join — update participant entry
          this.state.participants = this.state.participants.filter((p) => p.id !== publicId);
          this.state.participants.push({
            id: publicId,
            name: data.name || "Anonymous",
            mood: data.mood || "🦊",
            vote: null,
            isAdmin: publicId === this.state.adminId,
          });
        }
        ws.send(JSON.stringify({ type: "JOINED", publicId } satisfies ServerMessage));
        this.log.info(`User joined: ${publicId} (${data.name || "Anonymous"})`);

        this.broadcastState();
        break;

      case "USER_UPDATE_PROFILE": {
        const p = this.state.participants.find((p) => p.id === senderPublicId);
        if (!p) {
          this.log.warn(`USER_UPDATE_PROFILE: Participant not found for publicId ${senderPublicId}`);
          return;
        }
        p.name = data.name || p.name;
        p.mood = data.mood || p.mood;
        this.broadcastState();
        break;
      }

      case "USER_VOTE": {
        const participant = this.state.participants.find((p) => p.id === senderPublicId);
        if (!participant) {
          this.log.warn(`USER_VOTE: Participant not found for publicId ${senderPublicId}`);
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
        if (!this.assertAdmin(senderPublicId, "ADMIN_REVEAL")) return;
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
        if (!this.assertAdmin(senderPublicId, "ADMIN_RESET")) return;
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
        if (!this.assertAdmin(senderPublicId, "ADMIN_ADD_TASK")) return;
        if (!data.name) {
          this.log.warn(`ADMIN_ADD_TASK: Missing task name`);
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
        if (!this.assertAdmin(senderPublicId, "ADMIN_RENAME_TASK")) return;
        if (!data.taskId || !data.name) {
          this.log.warn(`ADMIN_RENAME_TASK: Missing taskId or name`);
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
        if (!this.assertAdmin(senderPublicId, "ADMIN_SET_TASK")) return;
        this.state.currentTaskId = data.taskId;
        this.state.timerEndAt = null;
        this.state.timerPausedRemainingMs = null;
        this.broadcastState();
        break;
      
      case "ADMIN_DELETE_TASK":
        if (!this.assertAdmin(senderPublicId, "ADMIN_DELETE_TASK")) return;
        if (!data.taskId) {
          this.log.warn(`ADMIN_DELETE_TASK: Missing taskId`);
          return;
        }
        this.state.tasks = this.state.tasks.filter(t => t.id !== data.taskId);
        if (this.state.currentTaskId === data.taskId) {
          this.state.currentTaskId = this.state.tasks.length > 0 ? this.state.tasks[0]?.id ?? null : null;
          this.state.timerEndAt = null;
        }
        this.broadcastState();
        break;

      case "ADMIN_REORDER_TASKS":
        if (!this.assertAdmin(senderPublicId, "ADMIN_REORDER_TASKS")) return;
        if (!Array.isArray(data.taskIds)) {
          this.log.warn(`ADMIN_REORDER_TASKS: Invalid taskIds format`);
          return;
        }
        {
          const reordered: Task[] = [];
          for (const id of data.taskIds) {
            const task = this.state.tasks.find(t => t.id === id);
            if (task) reordered.push(task);
          }
          // Keep any tasks not in the list at the end (safety)
          for (const task of this.state.tasks) {
            if (!reordered.includes(task)) reordered.push(task);
          }
          this.state.tasks = reordered;
        }
        this.broadcastState();
        break;

      case "ADMIN_SET_DECK":
        if (!this.assertAdmin(senderPublicId, "ADMIN_SET_DECK")) return;
        if (!Array.isArray(data.deck)) {
          this.log.warn(`ADMIN_SET_DECK: Invalid deck format`);
          return;
        }
        this.state.deck = data.deck;
        this.state.deckMode = data.mode || 'custom';
        this.broadcastState();
        break;

      case "ADMIN_SET_TIMER":
        if (!this.assertAdmin(senderPublicId, "ADMIN_SET_TIMER")) return;
        this.state.timerPausedRemainingMs = null;
        if (data.durationMs === null) {
          this.state.timerEndAt = null;
        } else {
          this.state.timerEndAt = Date.now() + data.durationMs;
        }
        this.broadcastState();
        break;

      case "ADMIN_PAUSE_TIMER":
        if (!this.assertAdmin(senderPublicId, "ADMIN_PAUSE_TIMER")) return;
        if (!this.state.timerEndAt) return;
        this.state.timerPausedRemainingMs = Math.max(0, this.state.timerEndAt - Date.now());
        this.state.timerEndAt = null;
        this.broadcastState();
        break;

      case "ADMIN_RESUME_TIMER":
        if (!this.assertAdmin(senderPublicId, "ADMIN_RESUME_TIMER")) return;
        if (this.state.timerPausedRemainingMs === null) return;
        this.state.timerEndAt = Date.now() + this.state.timerPausedRemainingMs;
        this.state.timerPausedRemainingMs = null;
        this.broadcastState();
        break;

      case "ADMIN_TRANSFER_ADMIN":
        if (!this.assertAdmin(senderPublicId, "ADMIN_TRANSFER_ADMIN")) return;
        if (!data.targetUserId) {
          this.log.warn(`ADMIN_TRANSFER_ADMIN: Missing targetUserId`);
          return;
        }
        {
          // data.targetUserId is a publicId sent by the client
          const targetPublicId = data.targetUserId;
          const currentAdmin = this.state.participants.find((p) => p.id === senderPublicId);
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
        if (!this.assertAdmin(senderPublicId, "ADMIN_RENAME_ROOM")) return;
        if (!data.name) {
          this.log.warn(`ADMIN_RENAME_ROOM: Missing name`);
          return;
        }
        this.state.name = data.name;
        this.broadcastState();
        break;

      case "ADMIN_SET_ANONYMOUS_VOTING":
        if (!this.assertAdmin(senderPublicId, "ADMIN_SET_ANONYMOUS_VOTING")) return;
        this.state.anonymousVoting = !!data.enabled;
        this.broadcastState();
        break;

      case "ADMIN_SET_TIMER_DURATION":
        if (!this.assertAdmin(senderPublicId, "ADMIN_SET_TIMER_DURATION")) return;
        if (typeof data.durationMs === 'number' && data.durationMs > 0) {
          this.state.timerDurationMs = data.durationMs;
          this.broadcastState();
        }
        break;
    }
    this.store!.put(KV_STATE, this.state);
  }

  private isAdmin(publicId: string | undefined): boolean {
    return !!this.state.participants.find((p) => p.id === publicId)?.isAdmin;
  }

  /** Returns true if the publicId belongs to an admin. Logs a warning and returns false otherwise. */
  private assertAdmin(publicId: string | undefined, action: string): boolean {
    if (this.isAdmin(publicId)) return true;
    this.log.warn(`${action}: Unauthorized access from publicId ${publicId}`);
    return false;
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

    // In anonymous mode after reveal, don't send individual votes — only aggregation matters
    // Also anonymize round vote keys so the client can't correlate votes to participants
    const anonymizeRound = (round: Round): Round => {
      if (!this.state.anonymousVoting || !round.revealed) return round;
      const values = Object.values(round.votes);
      const anonymizedVotes: Record<string, string> = {};
      values.forEach((v, i) => { anonymizedVotes[String(i)] = v; });
      return { ...round, votes: anonymizedVotes };
    };

    const stateToSend = JSON.stringify({
      type: "STATE",
      serverTime: Date.now(),
      payload: {
        ...this.state,
        unassociatedRound: anonymizeRound(this.state.unassociatedRound),
        tasks: this.state.tasks.map(task => ({
          ...task,
          rounds: task.rounds.map(r => anonymizeRound(r)),
        })),
        participants: this.state.participants.map((p) => {
          const vote = currentRound?.votes[p.id] || null;
          let displayVote: string | null;
          if (this.state.anonymousVoting) {
            // Before reveal: show checkmark if voted; after reveal: hide individual votes
            displayVote = (!currentRound?.revealed && vote) ? "✓" : null;
          } else {
            displayVote = currentRound?.revealed ? vote : vote ? "✓" : null;
          }
          return {
            ...p,
            vote: displayVote,
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
