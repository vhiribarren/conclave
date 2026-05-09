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
  participants: Participant[];
  tasks: Task[];
  currentTaskId: string | null;
  deck: string[];
  timerEndAt: number | null;
}

export type SocketMessage = 
  | { type: 'JOIN'; userId: string; name: string; isSpectator?: boolean }
  | { type: 'VOTE'; vote: string | null }
  | { type: 'REVEAL' }
  | { type: 'RESET' }
  | { type: 'SET_TASK'; taskId: string }
  | { type: 'ADD_TASK'; name: string }
  | { type: 'SET_DECK'; deck: string[] }
  | { type: 'SET_TIMER'; durationMs: number | null }
  | { type: 'TRANSFER_ADMIN'; targetUserId: string };

export * from './id';
