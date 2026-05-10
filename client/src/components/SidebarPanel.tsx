/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 */
import React, { useState, useEffect, useRef } from 'react';
import { Eye, RotateCcw, Plus, Settings, Play, X, Trash2, Layout, Pause, RotateCw, GripVertical, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localDeck, setLocalDeck] = useState<string[] | null>(null);
  const dragSourceIdx = useRef<number | null>(null);

  const [savedCustomDeck, setSavedCustomDeck] = useState<string[]>(() => {
    const saved = localStorage.getItem('conclave_custom_deck');
    return saved ? JSON.parse(saved) : ['1','2','3','5','8','13','?','☕'];
  });

  const updateDeck = (newDeck: string[], mode: 'preset' | 'custom' = 'custom') => {
    if (window.confirm(`Are you sure you want to change the deck to ${mode}? This will clear all current votes.`)) {
      actions.adminSetDeck(newDeck, mode);
    }
    if (mode === 'custom') {
      setSavedCustomDeck(newDeck);
      localStorage.setItem('conclave_custom_deck', JSON.stringify(newDeck));
    }
  };

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
      const newDeck = [...(state.deck || []), newCardValue.trim()];
      updateDeck(newDeck);
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
    const item = newDeck.splice(dragSourceIdx.current, 1)[0];
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

  const setTimerDuration = (seconds: number) => {
    setSelectedDurationMs(seconds * 1000);
    setCustomTimerValue(seconds.toString());
  };

  const handleSetTimer = () => {
    if (selectedDurationMs > 0) {
      actions.adminSetTimer(selectedDurationMs);
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

          {/* ── VOTING PHASE ───────────────────────────────────────── */}
          {!isRevealed && !isAdmin && (
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
          )}

          {/* ── ADMIN CONTROLS ─────────────────────────────────────── */}
          {isAdmin && (
            <>
              <div className="sidebar-section">
                <span className="sidebar-section-title">⚡ Actions</span>
                <div className="sidebar-actions">
                  <button
                    onClick={() => actions?.adminReveal()}
                    disabled={isRevealed}
                    className="premium-button"
                    style={{ flex: 1 }}
                  >
                    <Eye size={15} /> Reveal
                  </button>
                  <button
                    onClick={() => actions?.adminReset()}
                    className="premium-button secondary"
                    title="Reset round"
                  >
                    <RotateCcw size={15} /> Reset
                  </button>
                </div>
              </div>

              {isRevealed && (
                <div className="sidebar-section animate-fade-in">
                  <span className="sidebar-section-title">📊 Results</span>
                  <AggregationResult participants={state.participants} />
                </div>
              )}

              {!isRevealed && (
                <div className="sidebar-section">
                  <span className="sidebar-section-title">⏱ Timer</span>
                <div className="sidebar-actions">
                  {state.timerPausedRemainingMs !== null ? (
                    <button onClick={() => actions?.adminResumeTimer()} className="premium-button accent" style={{ flex: 1 }}>
                      <Play size={14} /> Resume
                    </button>
                  ) : state.timerEndAt ? (
                    <button onClick={() => actions?.adminPauseTimer()} className="premium-button secondary" style={{ flex: 1 }}>
                      <Pause size={14} /> Pause
                    </button>
                  ) : (
                    <button onClick={handleSetTimer} className="premium-button secondary" style={{ flex: 1 }}>
                      <Play size={14} /> Start ({selectedDurationMs / 1000}s)
                    </button>
                  )}
                  
                  {(state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                    <button 
                      onClick={() => actions?.adminSetTimer(null)}
                      className="premium-button danger"
                      title="Reset timer"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="sidebar-section">
                <span className="sidebar-section-title">📋 Select Task</span>
                <div className="task-list" style={{ maxHeight: '35vh' }}>
                  {state.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => actions?.adminSetTask(state.currentTaskId === task.id ? null : task.id)}
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
                        onClick={(e) => { e.stopPropagation(); actions?.adminDeleteTask(task.id); }}
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
                    {isCustom && <GripVertical size={12} className="deck-chip-grip" />}
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
                      placeholder="Card value..." 
                      value={newCardValue}
                      onChange={(e) => setNewCardValue(e.target.value)}
                      maxLength={10}
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      className="premium-button secondary" 
                      style={{ padding: '0 0.5rem' }}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={18} />
                    </button>
                  </div>
                  <button type="submit" className="premium-button">Add</button>
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
                      width={300}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.03)', borderRadius: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>This preset is read-only.</span>
                <button 
                  onClick={() => {
                    updateDeck(state.deck || [], 'custom');
                  }}
                  className="premium-button secondary sidebar-chip"
                  style={{ marginLeft: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Customize
                </button>
              </div>
            )}
            <div className="sidebar-actions sidebar-actions--wrap" style={{ marginTop: '0.75rem' }}>
              <button onClick={() => updateDeck(['0','1','2','3','5','8','13','21','?','☕'], 'preset')} className={`premium-button sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === '0' ? 'accent' : 'secondary'}`}>Standard</button>
              <button onClick={() => updateDeck(['1','2','3','5','8','13','21','34','55','89'], 'preset')} className={`premium-button sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === '1' ? 'accent' : 'secondary'}`}>Fibonacci</button>
              <button onClick={() => updateDeck(['XS','S','M','L','XL','XXL','?'], 'preset')} className={`premium-button sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === 'XS' ? 'accent' : 'secondary'}`}>T-Shirt</button>
              <button 
                onClick={() => updateDeck(savedCustomDeck, 'custom')} 
                className={`premium-button sidebar-chip ${state.deckMode === 'custom' ? 'accent' : 'secondary'}`}
                title="Use your custom deck"
              >
                <RotateCw size={12} /> Custom
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
