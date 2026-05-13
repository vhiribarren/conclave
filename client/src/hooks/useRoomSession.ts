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
import { useEffect, useRef, useState } from 'react';
import { ConclaveSocket, type ConclaveActions, type RoomState, type ConnectionStatus } from '../services/conclave';
import { getUserEmoji, getUserId, getUserName } from '../services/user';
import { addToHistory } from '../services/history';

const initialRoomState: RoomState = {
  participants: [],
  tasks: [],
  currentTaskId: null,
  deck: [],
  deckMode: 'preset',
  timerEndAt: null,
  timerPausedRemainingMs: null,
  timerDurationMs: 30000,
  adminId: null,
  unassociatedRound: { id: '', votes: {}, revealed: false },
  anonymousVoting: false,
};

interface Options {
  linkUserId?: string | null;
}

export const useRoomSession = (roomId: string | undefined, options: Options = {}) => {
  const { linkUserId } = options;
  const effectiveUserId = linkUserId || getUserId();
  const [name, setName] = useState(getUserName());
  const [mood, setMood] = useState(getUserEmoji());
  const [isJoined, setIsJoined] = useState(!!getUserName());
  const [state, setState] = useState<RoomState>(initialRoomState);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [actions, setActions] = useState<ConclaveActions | null>(null);
  const actionsRef = useRef<ConclaveActions | null>(null);

  useEffect(() => {
    let isMounted = true;
    let socketActions: ConclaveActions | null = null;

    if (isJoined && roomId) {
      const timeoutId = setTimeout(() => {
        if (!isMounted) return;

        socketActions = ConclaveSocket.connect(roomId, effectiveUserId, name, mood, (myPublicId) => {
          if (isMounted) {
            setPublicId(myPublicId);
          }
        }, (newState) => {
          if (isMounted) {
            setState(newState);
            setConnectionError(null);
            addToHistory(roomId, newState.name, newState.participants.find(p => p.id === publicId)?.isAdmin);
          }
        }, (error) => {
          if (isMounted) {
            setConnectionError(error);
          }
        }, (status) => {
          if (isMounted) {
            setConnectionStatus(status);
          }
        });
        actionsRef.current = socketActions;
        setActions(socketActions);
      }, 100);

      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
        if (socketActions) {
          socketActions.userDisconnect();
          actionsRef.current = null;
          setActions(null);
        }
      };
    }
  }, [isJoined, roomId, name, mood, effectiveUserId]);

  const isAdmin = !!state.participants.find(p => p.id === publicId)?.isAdmin;
  const currentTask = state.tasks?.find(t => t.id === state.currentTaskId);
  const currentRound = currentTask
    ? (currentTask.rounds?.length ? currentTask.rounds[currentTask.rounds.length - 1] : null)
    : state.unassociatedRound;
  const isRevealed = currentRound?.revealed || false;

  return {
    actions,
    actionsRef,
    connectionError,
    connectionStatus,
    currentRound,
    currentTask,
    isAdmin,
    isJoined,
    isRevealed,
    mood,
    name,
    publicId,
    setIsJoined,
    setMood,
    setName,
    state,
    userId: effectiveUserId,
  };
};
