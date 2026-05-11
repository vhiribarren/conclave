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
import { ConclaveSocket, type ConclaveActions, type RoomState } from '../services/conclave';
import { getUserEmoji, getUserId, getUserName } from '../services/user';
import { addToHistory } from '../services/history';
import { settings } from '../services/settings';

const initialRoomState: RoomState = {
  participants: [],
  tasks: [],
  currentTaskId: null,
  deck: [],
  deckMode: 'preset',
  timerEndAt: null,
  timerPausedRemainingMs: null,
  adminId: null,
  unassociatedRound: { id: '', votes: {}, revealed: false }
};

interface Options {
  isRemoteView?: boolean;
  linkUserId?: string | null;
  linkName?: string | null;
}

export const useRoomSession = (roomId: string | undefined, options: Options = {}) => {
  const { isRemoteView = false, linkUserId, linkName } = options;
  const [name, setName] = useState(getUserName());
  const [mood, setMood] = useState(getUserEmoji());
  const [isJoined, setIsJoined] = useState(!!getUserName());
  const [state, setState] = useState<RoomState>(initialRoomState);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [actions, setActions] = useState<ConclaveActions | null>(null);
  const actionsRef = useRef<ConclaveActions | null>(null);
  const userId = getUserId();

  useEffect(() => {
    if (linkUserId && linkName) {
      settings.setUserId(linkUserId);
      settings.setUserName(linkName);
      window.history.replaceState({}, document.title, window.location.pathname + (isRemoteView ? '?remote=true' : ''));
      window.location.reload();
    }
  }, [linkUserId, linkName, isRemoteView]);

  useEffect(() => {
    let isMounted = true;
    let socketActions: ConclaveActions | null = null;

    if (isJoined && roomId && !linkUserId) {
      const timeoutId = setTimeout(() => {
        if (!isMounted) return;

        socketActions = ConclaveSocket.connect(roomId, userId, name, mood, (newState) => {
          if (isMounted) {
            setState(newState);
            setConnectionError(null);
            const isUserAdmin = newState.participants.find(p => p.id === userId)?.isAdmin;
            addToHistory(roomId, newState.name, isUserAdmin);
          }
        }, (error) => {
          if (isMounted) {
            setConnectionError(error);
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
  }, [isJoined, roomId, name, mood, userId, linkUserId]);

  const isAdmin = !!state.participants.find(p => p.id === userId)?.isAdmin;
  const currentTask = state.tasks?.find(t => t.id === state.currentTaskId);
  const currentRound = currentTask
    ? (currentTask.rounds?.length ? currentTask.rounds[currentTask.rounds.length - 1] : null)
    : state.unassociatedRound;
  const isRevealed = currentRound?.revealed || false;

  return {
    actions,
    actionsRef,
    connectionError,
    currentRound,
    currentTask,
    isAdmin,
    isJoined,
    isRevealed,
    mood,
    name,
    setIsJoined,
    setMood,
    setName,
    state,
    userId,
  };
};
