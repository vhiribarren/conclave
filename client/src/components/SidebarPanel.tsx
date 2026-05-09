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
import React, { useState } from 'react';
import { Eye, RotateCcw, Plus } from 'lucide-react';
import type { ConclaveActions, RoomState } from '../services/conclave';
import { AggregationResult } from './AggregationResult';

interface Props {
  state: RoomState;
  actions: ConclaveActions | null;
  isAdmin: boolean;
  myVote: string | null;
  onVote: (card: string) => void;
  isRevealed: boolean;
  hasCurrentTask: boolean;
}

export const SidebarPanel: React.FC<Props> = ({
  state,
  actions,
  isAdmin,
  myVote,
  onVote,
  isRevealed,
  hasCurrentTask,
}) => {
  const [newTaskName, setNewTaskName] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim() && actions) {
      actions.addTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  return (
    <div className="sidebar-inner">

      {/* ── REVEALED PHASE ─────────────────────────────────────── */}
      {isRevealed && (
        <>
          <div className="sidebar-section">
            <span className="sidebar-section-title">📊 Results</span>
            <AggregationResult participants={state.participants} />
          </div>

          {isAdmin && (
            <div className="sidebar-section">
              <span className="sidebar-section-title">⚡ Round</span>
              <div className="sidebar-actions">
                <button
                  onClick={() => actions?.reset()}
                  className="premium-button secondary"
                  style={{ flex: 1 }}
                >
                  <RotateCcw size={15} /> Reset round
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VOTING PHASE ───────────────────────────────────────── */}
      {!isRevealed && (
        <>
          {/* Card picker — all players */}
          {hasCurrentTask ? (
            <div className="sidebar-section">
              <span className="sidebar-section-title">🎴 Pick a card</span>
              <div className="sidebar-cards">
                {(state.deck || []).map((card) => (
                  <div
                    key={card}
                    onClick={() => onVote(card)}
                    className={`poker-card ${myVote === card ? 'selected' : ''}`}
                  >
                    {card}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !isAdmin && (
              <div className="sidebar-empty">
                <span>⏳ Waiting for a task…</span>
              </div>
            )
          )}

          {/* Admin controls */}
          {isAdmin && (
            <>
              <div className="sidebar-section">
                <span className="sidebar-section-title">⚡ Controls</span>
                <div className="sidebar-actions">
                  <button
                    onClick={() => actions?.reveal()}
                    disabled={!hasCurrentTask}
                    className="premium-button"
                    style={{ flex: 1 }}
                  >
                    <Eye size={15} /> Reveal
                  </button>
                  <button
                    onClick={() => actions?.reset()}
                    className="premium-button secondary"
                    title="Reset round"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-section-title">⏱ Timer</span>
                <div className="sidebar-actions sidebar-actions--wrap">
                  <button onClick={() => actions?.setTimer(60000)}  className="premium-button secondary sidebar-chip">1m</button>
                  <button onClick={() => actions?.setTimer(120000)} className="premium-button secondary sidebar-chip">2m</button>
                  <button onClick={() => actions?.setTimer(300000)} className="premium-button secondary sidebar-chip">5m</button>
                  <button onClick={() => actions?.setTimer(null)}   className="premium-button danger sidebar-chip">Stop</button>
                </div>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-section-title">📋 Tasks</span>
                <form onSubmit={handleAddTask} className="remote-form">
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="New task…"
                    className="premium-input"
                    style={{ fontSize: '0.875rem', padding: '9px 13px' }}
                  />
                  <button type="submit" className="premium-button" style={{ padding: '9px 13px', flexShrink: 0 }}>
                    <Plus size={15} />
                  </button>
                </form>
                <div className="task-list" style={{ maxHeight: '28vh' }}>
                  {state.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => actions?.setTask(task.id)}
                      className={`task-item ${state.currentTaskId === task.id ? 'active' : ''}`}
                    >
                      {task.name}
                    </div>
                  ))}
                  {state.tasks.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.5rem' }}>
                      No tasks yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-section-title">🃏 Deck</span>
                <div className="sidebar-actions sidebar-actions--wrap">
                  <button onClick={() => actions?.setDeck(['0','1','2','3','5','8','13','21','?','☕'])} className="premium-button secondary sidebar-chip">Standard</button>
                  <button onClick={() => actions?.setDeck(['1','2','3','5','8','13','21','34','55','89'])} className="premium-button secondary sidebar-chip">Fibonacci</button>
                  <button onClick={() => actions?.setDeck(['XS','S','M','L','XL','XXL','?'])} className="premium-button secondary sidebar-chip">T-Shirt</button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
