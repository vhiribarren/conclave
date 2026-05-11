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
export interface Participant {
  id: string;
  name: string;
  mood: string;
  vote: string | null;
  isAdmin: boolean;
  isSpectator: boolean;
}

export interface Round {
  id: string;
  votes: Record<string, string>; // participant.id -> vote
  revealed: boolean;
}

export interface Task {
  id: string;
  name: string;
  rounds: Round[];
}

export const DEFAULT_DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export interface RoomState {
  created?: boolean;
  name?: string;
  participants: Participant[];
  tasks: Task[];
  currentTaskId: string | null;
  deck: string[];
  deckMode: 'preset' | 'custom';
  timerEndAt: number | null;
  timerPausedRemainingMs: number | null;
  adminId: string | null;
  unassociatedRound: Round;
}

export type SocketMessage = 
  | { type: 'USER_JOIN'; userId: string; name: string; mood: string; isSpectator?: boolean }
  | { type: 'USER_UPDATE_PROFILE'; name: string; mood: string }
  | { type: 'USER_VOTE'; vote: string | null }
  | { type: 'ADMIN_REVEAL' }
  | { type: 'ADMIN_RESET' }
  | { type: 'ADMIN_SET_TASK'; taskId: string | null }
  | { type: 'ADMIN_ADD_TASK'; name: string }
  | { type: 'ADMIN_RENAME_TASK'; taskId: string; name: string }
  | { type: 'ADMIN_DELETE_TASK'; taskId: string }
  | { type: 'ADMIN_SET_DECK'; deck: string[]; mode: 'preset' | 'custom' }
  | { type: 'ADMIN_SET_TIMER'; durationMs: number | null }
  | { type: 'ADMIN_PAUSE_TIMER' }
  | { type: 'ADMIN_RESUME_TIMER' }
  | { type: 'ADMIN_TRANSFER_ADMIN'; targetUserId: string }
  | { type: 'ADMIN_RENAME_ROOM'; name: string };

export * from './id';
