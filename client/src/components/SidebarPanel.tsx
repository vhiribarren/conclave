/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 */
import React, { useState } from 'react';
import { Eye, RotateCcw, Plus, Settings, Play, X, Trash2, Layout, Pause } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'control' | 'settings'>(isAdmin ? 'control' : 'control');
  const [newTaskName, setNewTaskName] = useState('');
  const [customTimerValue, setCustomTimerValue] = useState('30');
  const [selectedDurationMs, setSelectedDurationMs] = useState(30000);
  const [newCardValue, setNewCardValue] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim() && actions) {
      actions.addTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardValue.trim() && actions) {
      const newDeck = [...(state.deck || []), newCardValue.trim()];
      actions.setDeck(newDeck);
      setNewCardValue('');
    }
  };

  const removeCard = (index: number) => {
    if (actions) {
      const newDeck = [...(state.deck || [])];
      newDeck.splice(index, 1);
      actions.setDeck(newDeck);
    }
  };

  const setTimerDuration = (seconds: number) => {
    setSelectedDurationMs(seconds * 1000);
    setCustomTimerValue(seconds.toString());
  };

  const startTimer = () => {
    if (actions) {
      actions.setTimer(selectedDurationMs);
    }
  };

  return (
    <div className="sidebar-inner">
      {isAdmin && (
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'control' ? 'active' : ''}`}
            onClick={() => setActiveTab('control')}
          >
            <Layout size={14} /> Control
          </button>
          <button 
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={14} /> Settings
          </button>
        </div>
      )}

      {activeTab === 'control' ? (
        <>
          {/* ── REVEALED PHASE ─────────────────────────────────────── */}
          {isRevealed && (
            <div className="sidebar-section">
              <span className="sidebar-section-title">📊 Results</span>
              <AggregationResult participants={state.participants} />
            </div>
          )}

          {/* ── VOTING PHASE ───────────────────────────────────────── */}
          {!isRevealed && !isAdmin && (
            <div className="sidebar-section">
              <span className="sidebar-section-title">🎴 Pick a card</span>
              {hasCurrentTask ? (
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
              ) : (
                <div className="sidebar-empty">
                  <span>⏳ Waiting for a task…</span>
                </div>
              )}
            </div>
          )}

          {/* ── ADMIN CONTROLS ─────────────────────────────────────── */}
          {isAdmin && (
            <>
              <div className="sidebar-section">
                <span className="sidebar-section-title">⚡ Actions</span>
                <div className="sidebar-actions">
                  <button
                    onClick={() => actions?.reveal()}
                    disabled={!hasCurrentTask || isRevealed}
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
                    <RotateCcw size={15} /> Reset
                  </button>
                </div>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-section-title">⏱ Timer</span>
                <div className="sidebar-actions">
                  {state.timerPausedRemainingMs !== null ? (
                    <button onClick={() => actions?.resumeTimer()} className="premium-button accent" style={{ flex: 1 }}>
                      <Play size={14} /> Resume
                    </button>
                  ) : state.timerEndAt ? (
                    <button onClick={() => actions?.pauseTimer()} className="premium-button secondary" style={{ flex: 1 }}>
                      <Pause size={14} /> Pause
                    </button>
                  ) : (
                    <button onClick={startTimer} className="premium-button secondary" style={{ flex: 1 }}>
                      <Play size={14} /> Start ({selectedDurationMs / 1000}s)
                    </button>
                  )}
                  
                  {(state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                    <button 
                      onClick={() => actions?.setTimer(null)}
                      className="premium-button danger"
                      title="Reset timer"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="sidebar-section">
                <span className="sidebar-section-title">📋 Select Task</span>
                <div className="task-list" style={{ maxHeight: '35vh' }}>
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
                      No tasks yet. Go to Settings.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* ── SETTINGS TAB ────────────────────────────────────────── */
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="sidebar-section">
            <span className="sidebar-section-title">⏱ Timer Setup</span>
            <div className="sidebar-actions sidebar-actions--wrap">
              {[15, 30, 45, 60].map(s => (
                <button 
                  key={s}
                  onClick={() => setTimerDuration(s)}
                  className={`premium-button ${selectedDurationMs === s * 1000 ? 'accent' : 'secondary'} sidebar-chip`}
                >
                  {s >= 60 ? `${s/60}m` : `${s}s`}
                </button>
              ))}
            </div>
            <div className="timer-custom-row">
              <div className="timer-input-wrapper">
                <input 
                  type="number" 
                  className={`premium-input ${![15, 30, 45, 60].includes(selectedDurationMs / 1000) ? 'active' : ''}`}
                  value={customTimerValue}
                  onChange={(e) => {
                    setCustomTimerValue(e.target.value);
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) setSelectedDurationMs(val * 1000);
                  }}
                  placeholder="Custom"
                />
                <span className="timer-input-unit">s</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-section-title">📋 Task Preparation</span>
            <form onSubmit={handleAddTask} className="remote-form">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Add task..."
                className="premium-input"
              />
              <button type="submit" className="premium-button">
                <Plus size={15} />
              </button>
            </form>
            <div className="task-list" style={{ maxHeight: '20vh' }}>
              {state.tasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-item-content">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); actions?.deleteTask(task.id); }}
                      className="task-delete-btn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-section-title">🃏 Deck Editor</span>
            <div className="deck-editor">
              {(state.deck || []).map((card, idx) => (
                <div key={`${card}-${idx}`} className="deck-chip">
                  {card}
                  <X size={12} className="deck-chip-remove" onClick={() => removeCard(idx)} />
                </div>
              ))}
            </div>
            <form onSubmit={handleAddCard} className="deck-add-form">
              <input 
                type="text" 
                className="premium-input" 
                placeholder="Card value..." 
                value={newCardValue}
                onChange={(e) => setNewCardValue(e.target.value)}
                maxLength={10}
              />
              <button type="submit" className="premium-button">Add</button>
            </form>
            <div className="sidebar-actions sidebar-actions--wrap" style={{ marginTop: '0.75rem' }}>
              <button onClick={() => actions?.setDeck(['0','1','2','3','5','8','13','21','?','☕'])} className="premium-button secondary sidebar-chip">Standard</button>
              <button onClick={() => actions?.setDeck(['1','2','3','5','8','13','21','34','55','89'])} className="premium-button secondary sidebar-chip">Fibonacci</button>
              <button onClick={() => actions?.setDeck(['XS','S','M','L','XL','XXL','?'])} className="premium-button secondary sidebar-chip">T-Shirt</button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
