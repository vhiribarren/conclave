import React, { useState, useEffect, useRef } from 'react';
import { Eye, RotateCcw, Plus, Settings, Play, X, Trash2, Layout, RotateCw, GripVertical, Smile } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { ConclaveActions, RoomState } from '../services/conclave';

interface Props {
  state: RoomState;
  actions: ConclaveActions;
  myVote: string | null;
}

export const AdminRemote: React.FC<Props> = ({ state, actions, myVote }) => {
  const [selectedDurationMs, setSelectedDurationMs] = useState(30000);
  const [newCardValue, setNewCardValue] = useState('');
  const [customTimerValue, setCustomTimerValue] = useState('30');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'settings'>('control');
  const [newTaskName, setNewTaskName] = useState('');
  const [localDeck, setLocalDeck] = useState<string[] | null>(null);
  const dragSourceIdx = useRef<number | null>(null);

  const [savedCustomDeck, setSavedCustomDeck] = useState<string[]>(() => {
    const saved = localStorage.getItem('conclave_custom_deck');
    return saved ? JSON.parse(saved) : ['1','2','3','5','8','13','?','☕'];
  });

  const updateDeck = (newDeck: string[], mode: 'preset' | 'custom' = 'custom') => {
    setLocalDeck(null); // Force clear local temporary state
    actions.setDeck(newDeck, mode);
    if (mode === 'custom') {
      setSavedCustomDeck(newDeck);
      localStorage.setItem('conclave_custom_deck', JSON.stringify(newDeck));
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
      actions.addTask(newTaskName.trim());
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
              <button onClick={() => actions.reveal()} disabled={isRevealed} className="premium-button">
                <Eye size={16} /> Reveal
              </button>
              <button onClick={() => actions.reset()} className="premium-button secondary">
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </div>

          <div className="remote-box glass">
            <h3 className="remote-section-title">Timer</h3>
            <div className="remote-actions">
              {state.timerPausedRemainingMs !== null ? (
                <button onClick={() => actions.resumeTimer()} className="premium-button accent" style={{ flex: 1 }}>
                  <Play size={16} /> Resume
                </button>
              ) : state.timerEndAt ? (
                <button onClick={() => actions.pauseTimer()} className="premium-button secondary" style={{ flex: 1 }}>
                  <Pause size={16} /> Pause
                </button>
              ) : (
                <button onClick={() => actions.setTimer(selectedDurationMs)} className="premium-button secondary" style={{ flex: 1 }}>
                  <Play size={16} /> Start ({selectedDurationMs / 1000}s)
                </button>
              )}

              {(state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                <button 
                  onClick={() => actions.setTimer(null)}
                  className="premium-button danger"
                  title="Reset timer"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="remote-box glass">
            <h3 className="remote-section-title">Current Task</h3>
            <div className="task-list">
              {state.tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => actions.setTask(state.currentTaskId === task.id ? null : task.id)}
                  className={`task-item ${state.currentTaskId === task.id ? 'active' : ''}`}
                >
                  {task.name}
                </div>
              ))}
              {state.tasks.length === 0 && <p style={{textAlign:'center', fontSize:'0.8rem', color:'var(--text-secondary)'}}>No tasks. Go to Settings.</p>}
            </div>
          </div>

          {!isRevealed && (
            <div className="remote-box glass">
              <h3 className="remote-section-title" style={{textAlign: 'center'}}>Your Secret Vote</h3>
              <div className="voting-cards">
                {(state.deck || []).map((card) => (
                  <div
                    key={card}
                    onClick={() => actions.vote(myVote === card ? null : card)}
                    className={`poker-card small ${myVote === card ? 'selected' : ''}`}
                  >
                    {card}
                  </div>
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
                <button 
                  key={s}
                  onClick={() => { setSelectedDurationMs(s * 1000); setCustomTimerValue(s.toString()); }}
                  className={`premium-button ${selectedDurationMs === s * 1000 ? 'accent' : 'secondary'} sidebar-chip`}
                  style={{ padding: '0.4rem 0.8rem', minWidth: '3.5rem' }}
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
              <button type="submit" className="premium-button"><Plus size={16} /></button>
            </form>
            <div className="task-list" style={{ marginTop: '0.5rem' }}>
              {state.tasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-item-content">
                    <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{task.name}</span>
                    <button onClick={() => actions.deleteTask(task.id)} className="task-delete-btn"><Trash2 size={14}/></button>
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
                    <button 
                      type="button" 
                      className="premium-button secondary" 
                      style={{ padding: '0 0.5rem' }}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={20} />
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
                      width={280}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Preset is read-only.</span>
                <button 
                  onClick={() => {
                    updateDeck(state.deck || [], 'custom');
                  }}
                  className="premium-button secondary sidebar-chip"
                  style={{ marginLeft: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                >
                  Customize
                </button>
              </div>
            )}

            <div className="remote-actions" style={{ flexWrap: 'wrap', marginTop: '0.75rem', gap: '0.5rem' }}>
               <button onClick={() => updateDeck(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'], 'preset')} className={`premium-button sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === '0' ? 'accent' : 'secondary'}`}>Standard</button>
               <button onClick={() => updateDeck(['1', '2', '3', '5', '8', '13', '21', '34', '55', '89'], 'preset')} className={`premium-button sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === '1' ? 'accent' : 'secondary'}`}>Fibonacci</button>
               <button onClick={() => updateDeck(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'], 'preset')} className={`premium-button sidebar-chip ${state.deckMode === 'preset' && state.deck?.[0] === 'XS' ? 'accent' : 'secondary'}`}>T-Shirt</button>
               <button 
                onClick={() => updateDeck(savedCustomDeck, 'custom')} 
                className={`premium-button sidebar-chip ${state.deckMode === 'custom' ? 'accent' : 'secondary'}`}
                title="Use your custom deck"
               >
                 <RotateCw size={14} /> Custom
               </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
