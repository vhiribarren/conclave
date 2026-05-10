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
import React, { useState, useRef } from 'react';
import { Eye, RotateCcw, Plus, Settings, Play, Pause, X, Trash2, Layout, RotateCw, GripVertical, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { ConclaveActions, RoomState } from '../services/conclave';
import Button from './Button';
import PokerCard from './PokerCard';
import './AdminRemote.css';
import { AggregationResult } from './AggregationResult';
import { settings } from '../services/settings';

interface Props {
  state: RoomState;
  actions: ConclaveActions;
  myVote: string | null;
  onVote: (card: string) => void;
}

export const AdminRemote: React.FC<Props> = ({ state, actions, myVote, onVote }) => {
  const [selectedDurationMs, setSelectedDurationMs] = useState(30000);
  const [newCardValue, setNewCardValue] = useState('');
  const [customTimerValue, setCustomTimerValue] = useState('30');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'settings'>('control');
  const [newTaskName, setNewTaskName] = useState('');
  const [localDeck, setLocalDeck] = useState<string[] | null>(null);
  const dragSourceIdx = useRef<number | null>(null);

  const [savedCustomDeck, setSavedCustomDeck] = useState<string[]>(() => {
    const saved = settings.getDeckCustom();
    return saved ? JSON.parse(saved) : ['1', '2', '3', '5', '8', '13', '?', '☕'];
  });

  const updateDeck = (newDeck: string[], mode: 'preset' | 'custom' = 'custom') => {
    setLocalDeck(null); // Force clear local temporary state
    actions.adminSetDeck(newDeck, mode);
    if (mode === 'custom') {
      setSavedCustomDeck(newDeck);
      settings.setDeckCustom(JSON.stringify(newDeck));
    }
  };

  const currentTask = state.tasks?.find(t => t.id === state.currentTaskId);
  const currentRound = currentTask
    ? (currentTask.rounds?.length ? currentTask.rounds[currentTask.rounds.length - 1] : null)
    : state.unassociatedRound;
  const isRevealed = currentRound?.revealed || false;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      actions.adminAddTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardValue.trim()) {
      updateDeck([...(state.deck || []), newCardValue.trim()]);
      setNewCardValue('');
    }
  };

  const removeCard = (index: number) => {
    const newDeck = [...(state.deck || [])];
    newDeck.splice(index, 1);
    updateDeck(newDeck);
  };

  const handleDragStart = (idx: number) => {
    dragSourceIdx.current = idx;
    setLocalDeck([...(state.deck || [])]);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSourceIdx.current === null || dragSourceIdx.current === idx || !localDeck) return;

    const newDeck = [...localDeck];
    const item = newDeck.splice(dragSourceIdx.current, 1)[0]!;
    newDeck.splice(idx, 0, item);

    setLocalDeck(newDeck);
    setSavedCustomDeck(newDeck);
    dragSourceIdx.current = idx;
  };

  const handleDragEnd = () => {
    if (localDeck) {
      updateDeck(localDeck, 'custom');
    }
    setLocalDeck(null);
    dragSourceIdx.current = null;
  };

  return (
    <div className="remote-container">
      <div className="admin-tabs glass">
        <button
          className={`admin-tab ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          <Layout size={16} /> Control
        </button>
        <button
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Settings
        </button>
      </div>

      {activeTab === 'control' ? (
        <>
          <div className="remote-box glass">
            <h2 className="remote-title">Actions</h2>
            <div className="remote-actions">
              <Button onClick={() => actions.adminReveal()} disabled={isRevealed}>
                <Eye size={16} /> Reveal
              </Button>
              <Button onClick={() => actions.adminReset()} variant="secondary">
                <RotateCcw size={16} /> Reset
              </Button>
            </div>
          </div>

          {!isRevealed && (
            <div className="remote-box glass">
              <h3 className="remote-section-title">Timer</h3>
              <div className="remote-actions">
                {state.timerPausedRemainingMs !== null ? (
                  <Button onClick={() => actions.adminResumeTimer()} style={{ flex: 1 }}>
                    <Play size={16} /> Resume
                  </Button>
                ) : state.timerEndAt ? (
                  <Button onClick={() => actions.adminPauseTimer()} variant="secondary" style={{ flex: 1 }}>
                    <Pause size={16} /> Pause
                  </Button>
                ) : (
                  <Button onClick={() => actions.adminSetTimer(selectedDurationMs)} variant="secondary" style={{ flex: 1 }}>
                    <Play size={16} /> Start ({selectedDurationMs / 1000}s)
                  </Button>
                )}

                {(state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                  <Button
                    onClick={() => actions.adminSetTimer(null)}
                    variant="danger"
                    title="Reset timer"
                  >
                    <RotateCcw size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {isRevealed && (
            <div className="remote-box glass animate-fade-in">
              <AggregationResult participants={state.participants} deck={state.deck} />
            </div>
          )}

          <div className="remote-box glass">
            <h3 className="remote-section-title">Current Task</h3>
            <div className="task-list">
              {state.tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => actions.adminSetTask(state.currentTaskId === task.id ? null : task.id)}
                  className={`task-item ${state.currentTaskId === task.id ? 'active' : ''}`}
                >
                  {task.name}
                </div>
              ))}
              {state.tasks.length === 0 && <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No tasks. Go to Settings.</p>}
            </div>
          </div>

          {!isRevealed && (
            <div className="remote-box glass">
              <h3 className="remote-section-title" style={{ textAlign: 'center' }}>Your Secret Vote</h3>
              <div className="voting-cards">
                {(state.deck || []).map((card) => (
                  <PokerCard
                    key={card}
                    value={card}
                    selected={myVote === card}
                    small
                    onClick={() => onVote(card)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── SETTINGS TAB ────────────────────────────────────────── */
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div className="remote-box glass">
            <h3 className="remote-section-title">Timer Duration</h3>
            <div className="remote-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              {[15, 30, 45, 60].map(s => (
                <Button
                  key={s}
                  onClick={() => { setSelectedDurationMs(s * 1000); setCustomTimerValue(s.toString()); }}
                  variant={selectedDurationMs === s * 1000 ? 'primary' : 'secondary'}
                  className="sidebar-chip"
                  style={{ padding: '0.4rem 0.8rem', minWidth: '3.5rem' }}
                >
                  {s >= 60 ? `${s / 60}m` : `${s}s`}
                </Button>
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

          <div className="remote-box glass">
            <h3 className="remote-section-title">Task Management</h3>
            <form onSubmit={handleAddTask} className="remote-form">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="New task..."
                className="premium-input"
              />
              <Button type="submit"><Plus size={16} /></Button>
            </form>
            <div className="task-list" style={{ marginTop: '0.5rem' }}>
              {state.tasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-item-content">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</span>
                    <button onClick={() => actions.adminDeleteTask(task.id)} className="task-delete-btn"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="remote-box glass">
            <h3 className="remote-section-title">Deck Editor</h3>
            <div className="deck-editor" onDragOver={(e) => e.preventDefault()}>
              {(localDeck || state.deck || []).map((card, idx) => {
                const isCustom = state.deckMode === 'custom' || localDeck !== null;
                return (
                  <div
                    key={`card-${idx}-${card}`}
                    className={`deck-chip ${!isCustom ? 'read-only' : ''}`}
                    draggable={isCustom}
                    onDragStart={() => isCustom && handleDragStart(idx)}
                    onDragOver={(e) => isCustom && handleDragOver(e, idx)}
                    onDragEnd={isCustom ? handleDragEnd : undefined}
                  >
                    {isCustom && <GripVertical size={14} className="deck-chip-grip" />}
                    <span className="deck-chip-value">{card}</span>
                    {isCustom && <X size={12} className="deck-chip-remove" onClick={() => removeCard(idx)} />}
                  </div>
                );
              })}
            </div>

            {state.deckMode === 'custom' ? (
              <div style={{ position: 'relative' }}>
                <form onSubmit={handleAddCard} className="deck-add-form animate-fade-in">
                  <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                    <input
                      type="text"
                      className="premium-input"
                      placeholder="Value..."
                      value={newCardValue}
                      onChange={(e) => setNewCardValue(e.target.value)}
                      maxLength={10}
                      style={{ flex: 1 }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      style={{ padding: '0 0.5rem' }}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={20} />
                    </Button>
                  </div>
                  <Button type="submit">Add</Button>
                </form>

                {showEmojiPicker && (
                  <div style={{ position: 'absolute', zIndex: 100, bottom: '100%', right: 0, marginBottom: '0.5rem' }}>
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setNewCardValue(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      theme={Theme.LIGHT}
                      lazyLoadEmojis={true}
                      height={350}
                      width={280}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Preset is read-only.</span>
                <Button
                  onClick={() => {
                    updateDeck(state.deck || [], 'custom');
                  }}
                  variant="secondary"
                  className="sidebar-chip"
                  style={{ marginLeft: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                >
                  Customize
                </Button>
              </div>
            )}

            <div className="remote-actions" style={{ flexWrap: 'wrap', marginTop: '0.75rem', gap: '0.5rem' }}>
              <Button onClick={() => updateDeck(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'], 'preset')} className={`sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === '0' ? '' : 'secondary'}`}>Standard</Button>
              <Button onClick={() => updateDeck(['1', '2', '3', '5', '8', '13', '21', '34', '55', '89'], 'preset')} className={`sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === '1' ? '' : 'secondary'}`}>Fibonacci</Button>
              <Button onClick={() => updateDeck(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'], 'preset')} className={`sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === 'XS' ? '' : 'secondary'}`}>T-Shirt</Button>
              <Button
                onClick={() => updateDeck(savedCustomDeck, 'custom')}
                className={`sidebar-chip ${state.deckMode === 'custom' ? '' : 'secondary'}`}
                title="Use your custom deck"
              >
                <RotateCw size={14} /> Custom
              </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
