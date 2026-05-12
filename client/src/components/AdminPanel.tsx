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
import { Eye, RotateCcw, Settings, Play, Pause, X, Layout, RotateCw, GripVertical, Smile, ListChecks, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { ConclaveActions, RoomState } from '../services/conclave';
import { DEFAULT_DECK } from 'conclave-shared';
import Button from './Button';
import PokerCard from './PokerCard';
import { AggregationResult } from './AggregationResult';
import { TaskSelectionDialog } from './TaskSelectionDialog';
import { settings } from '../services/settings';
import { Modal } from './Modal';
import './AdminPanel.css';

interface Props {
  state: RoomState;
  actions: ConclaveActions;
  isAdmin: boolean;
  myVote: string | null;
  onVote: (card: string) => void;
  roomId?: string;
  /** 'remote' wraps each section in a glass card; 'sidebar' uses a flat list layout */
  layout?: 'remote' | 'sidebar';
}

export const AdminPanel: React.FC<Props> = ({
  state,
  actions,
  isAdmin,
  myVote,
  onVote,
  roomId,
  layout = 'sidebar',
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedDurationMs, setSelectedDurationMs] = useState(30000);
  const [customTimerValue, setCustomTimerValue] = useState('30');
  const [newCardValue, setNewCardValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'settings'>('control');
  const dragSourceIdx = useRef<number | null>(null);

  const [savedCustomDeck, setSavedCustomDeck] = useState<string[]>(() => {
    const saved = settings.getDeckCustom();
    return saved ? JSON.parse(saved) : ['1', '2', '3', '5', '8', '13', '?', '☕'];
  });
  const [showCustomizeConfirm, setShowCustomizeConfirm] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string } | null>(null);

  const currentTask = state.tasks?.find(t => t.id === state.currentTaskId) ?? null;
  const currentTaskIndex = currentTask ? state.tasks.findIndex(t => t.id === currentTask.id) : -1;
  const nextTask = state.currentTaskId === null
    ? state.tasks[0] ?? null
    : state.tasks[currentTaskIndex + 1] ?? null;
  const currentRound = currentTask
    ? (currentTask.rounds?.length ? currentTask.rounds[currentTask.rounds.length - 1] : null)
    : state.unassociatedRound;
  const isRevealed = currentRound?.revealed ?? false;

  const updateDeck = (newDeck: string[], mode: 'preset' | 'custom' = 'custom') => {
    actions.adminSetDeck(newDeck, mode);
    if (mode === 'custom') {
      setSavedCustomDeck(newDeck);
      settings.setDeckCustom(JSON.stringify(newDeck));
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

  const dragOverIdx = useRef<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragSourceIdx.current = idx;
    dragOverIdx.current = idx;
  };

  const handleDragOver = (_e: React.DragEvent, idx: number) => {
    dragOverIdx.current = idx;
  };

  const handleDragEnd = () => {
    const from = dragSourceIdx.current;
    const to = dragOverIdx.current;
    if (from !== null && to !== null && from !== to) {
      const deck = [...(state.deck || [])];
      const item = deck.splice(from, 1)[0]!;
      deck.splice(to, 0, item);
      updateDeck(deck, 'custom');
    }
    dragSourceIdx.current = null;
    dragOverIdx.current = null;
  };

  // Wrap a section depending on layout mode
  const Section = ({ children, glass }: { children: React.ReactNode; glass?: boolean }) =>
    layout === 'remote' ? (
      <div className={`panel-section${glass ? ' glass' : ''}`}>{children}</div>
    ) : (
      <div className="panel-section">{children}</div>
    );

  const SectionTitle = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <span className="panel-section-title" style={style}>{children}</span>
  );

  return (
    <div className="admin-panel">
      {/* ── Tabs (admin only) ─────────────────────────────────────── */}
      {isAdmin && (
        <div className={`admin-tabs${layout === 'remote' ? ' glass' : ''}`}>
          <button
            className={`admin-tab ${activeTab === 'control' ? 'active' : ''}`}
            onClick={() => setActiveTab('control')}
          >
            <Layout size={14} /> {t('admin.control')}
          </button>
          <button
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={14} /> {t('admin.settings')}
          </button>
        </div>
      )}

      {activeTab === 'control' ? (
        <>
          {/* ── Non-admin: pick a card ─────────────────────────────── */}
          {!isRevealed && !isAdmin && (
            <Section>
              <SectionTitle>🎴 {t('room.pickACard')}</SectionTitle>
              <div className="sidebar-cards">
                {(state.deck || []).map((card) => (
                  <PokerCard
                    key={card}
                    value={card}
                    selected={myVote === card}
                    onClick={() => onVote(card)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ── Non-admin: tasks link ──────────────────────────────── */}
          {!isAdmin && roomId && (
            <Section>
              <SectionTitle>📋 {t('tasks.title')}</SectionTitle>
              <Button onClick={() => navigate(`/room/${roomId}/tasks`)} variant="secondary">
                <ListChecks size={15} /> {t('room.viewTasks')}
              </Button>
            </Section>
          )}

          {/* ── Admin: actions ────────────────────────────────────── */}
          {isAdmin && (
            <>
              <Section glass>
                {layout === 'remote' && <h2 className="panel-section-title" style={{ color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.875rem' }}>{t('admin.actions')}</h2>}
                {layout === 'sidebar' && <SectionTitle>⚡ {t('admin.actions')}</SectionTitle>}
                <div className="panel-actions">
                  <Button onClick={() => actions.adminReveal()} disabled={isRevealed} style={{ flex: 1 }}>
                    <Eye size={15} /> {t('room.reveal')}
                  </Button>
                  <Button onClick={() => actions.adminReset()} variant="secondary">
                    <RotateCcw size={15} /> {t('room.reset')}
                  </Button>
                </div>
              </Section>

              {/* ── Results (revealed) ──────────────────────────────── */}
              {isRevealed && (
                <Section glass>
                  {layout === 'sidebar' && <SectionTitle>📊 {t('room.results')}</SectionTitle>}
                  <AggregationResult participants={state.participants} deck={state.deck} />
                </Section>
              )}

              {/* ── Timer (voting phase) ────────────────────────────── */}
              {!isRevealed && (
                <Section glass>
                  <SectionTitle>{layout === 'sidebar' ? `⏱ ${t('admin.timer')}` : t('admin.timer')}</SectionTitle>
                  <div className="panel-actions">
                    {state.timerPausedRemainingMs !== null ? (
                      <Button onClick={() => actions.adminResumeTimer()} style={{ flex: 1 }}>
                        <Play size={15} /> {t('admin.resume')}
                      </Button>
                    ) : state.timerEndAt ? (
                      <Button onClick={() => actions.adminPauseTimer()} variant="secondary" style={{ flex: 1 }}>
                        <Pause size={15} /> {t('admin.pause')}
                      </Button>
                    ) : (
                      <Button onClick={() => actions.adminSetTimer(selectedDurationMs)} variant="secondary" style={{ flex: 1 }}>
                        <Play size={15} /> {t('admin.start')} ({selectedDurationMs / 1000}s)
                      </Button>
                    )}
                    {(state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                      <Button onClick={() => actions.adminSetTimer(null)} variant="danger" title="Reset timer">
                        <RotateCcw size={15} />
                      </Button>
                    )}
                  </div>
                </Section>
              )}

              {/* ── Current task ────────────────────────────────────── */}
              <Section glass>
                <SectionTitle>{layout === 'sidebar' ? `📋 ${t('admin.selectTask')}` : t('room.currentTask')}</SectionTitle>
                <div className="vote-mode-switch" role="group" aria-label="Vote mode">
                  <button
                    type="button"
                    className={state.currentTaskId === null ? 'active' : ''}
                    onClick={() => actions.adminSetTask(null)}
                  >
                    {t('admin.adhocVote')}
                  </button>
                  <button
                    type="button"
                    className={state.currentTaskId !== null ? 'active' : ''}
                    onClick={() => {
                      if (state.currentTaskId === null && state.tasks[0]) {
                        actions.adminSetTask(state.tasks[0].id);
                      }
                    }}
                    disabled={state.tasks.length === 0}
                  >
                    {t('admin.taskVote')}
                  </button>
                </div>
                {state.currentTaskId !== null && (
                  <>
                    <div className="panel-current-task">
                      <span>{currentTask?.name || t('admin.taskVote')}</span>
                      <small>
                        {currentTask
                          ? t('admin.round', { count: currentTask.rounds.length })
                          : t('admin.noTaskSelected')}
                      </small>
                    </div>
                    <div className="panel-actions task-session-actions">
                      <Button onClick={() => nextTask && actions.adminSetTask(nextTask.id)} disabled={!nextTask}>
                        {t('admin.nextTask')}
                      </Button>
                      <Button onClick={() => setShowTaskSelector(true)} variant="secondary">
                        <ListChecks size={15} /> {t('admin.selectTaskBtn')}
                      </Button>
                    </div>
                  </>
                )}
              </Section>

              {/* ── Admin secret vote (remote layout only) ──────────── */}
              {!isRevealed && layout === 'remote' && (
                <Section glass>
                  <SectionTitle style={{ textAlign: 'center' }}>{t('admin.yourSecretVote')}</SectionTitle>
                  <div className="voting-cards admin-vote-cards">
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
                </Section>
              )}
            </>
          )}
        </>
      ) : (
        /* ── SETTINGS TAB ─────────────────────────────────────────── */
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Tasks setup ─────────────────────────────────────────── */}
          {roomId && (
            <Section glass>
              <SectionTitle>📋 {t('settings.tasksSetup')}</SectionTitle>
              <Button onClick={() => navigate(`/room/${roomId}/tasks`)} variant="secondary">
                <ListChecks size={15} /> {t('settings.manageTasks')}
              </Button>
            </Section>
          )}

          {/* ── Timer duration ──────────────────────────────────────── */}
          <Section glass>
            <SectionTitle>⏱ {t('settings.timerDuration')}</SectionTitle>
            <div className="panel-actions panel-actions--wrap">
              {[15, 30, 45, 60].map(s => (
                <Button
                  key={s}
                  onClick={() => { setSelectedDurationMs(s * 1000); setCustomTimerValue(s.toString()); }}
                  variant={selectedDurationMs === s * 1000 ? 'primary' : 'secondary'}
                  className="sidebar-chip"
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
          </Section>

          {/* ── Deck editor ─────────────────────────────────────────── */}
          <Section glass>
            <SectionTitle>🃏 {t('settings.deckEditor')}</SectionTitle>
            <div className="deck-editor" onDragOver={(e) => e.preventDefault()}>
              {(state.deck || []).map((card, idx) => {
                const isCustom = state.deckMode === 'custom';
                return (
                  <div
                    key={`card-${card}-${idx}`}
                    className={`deck-chip ${!isCustom ? 'read-only' : ''}`}
                    draggable={isCustom}
                    onDragStart={() => isCustom && handleDragStart(idx)}
                    onDragOver={(e) => { e.preventDefault(); if (isCustom) handleDragOver(e, idx); }}
                    onDragEnd={isCustom ? handleDragEnd : undefined}
                  >
                    {isCustom && <GripVertical size={13} className="deck-chip-grip" />}
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
                      placeholder={t('settings.cardPlaceholder')}
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
                      <Smile size={18} />
                    </Button>
                  </div>
                  <Button type="submit">{t('settings.add')}</Button>
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
                <span>{t('settings.readOnly')}</span>
                <Button
                  onClick={() => setShowCustomizeConfirm(true)}
                  variant="secondary"
                  className="sidebar-chip"
                  style={{ marginLeft: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                >
                  {t('settings.customize')}
                </Button>
              </div>
            )}

            <div className="panel-actions panel-actions--wrap" style={{ marginTop: '0.75rem' }}>
              <Button
                onClick={() => updateDeck(DEFAULT_DECK, 'preset')}
                variant={state.deckMode === 'preset' && state.deck?.[0] === '0' ? 'primary' : 'secondary'}
                className="sidebar-chip"
              >
                {t('settings.standard')}
              </Button>
              <Button
                onClick={() => updateDeck(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'], 'preset')}
                variant={state.deckMode === 'preset' && state.deck?.[0] === '1' ? 'primary' : 'secondary'}
                className="sidebar-chip"
              >
                {t('settings.fibonacci')}
              </Button>
              <Button
                onClick={() => updateDeck(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'], 'preset')}
                variant={state.deckMode === 'preset' && state.deck?.[0] === 'XS' ? 'primary' : 'secondary'}
                className="sidebar-chip"
              >
                {t('settings.tshirt')}
              </Button>
              <Button
                onClick={() => updateDeck(savedCustomDeck, 'custom')}
                variant={state.deckMode === 'custom' ? 'primary' : 'secondary'}
                className="sidebar-chip"
                title="Use your custom deck"
              >
                <RotateCw size={13} /> {t('settings.custom')}
              </Button>
            </div>
          </Section>

          {/* ── Transfer admin ──────────────────────────────────────── */}
          <Section glass>
            <SectionTitle>👑 {t('settings.transferAdmin')}</SectionTitle>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
              {t('settings.transferAdminDesc')}
            </p>
            <div className="panel-actions panel-actions--wrap">
              {state.participants
                .filter(p => !p.isAdmin)
                .map(p => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    className="sidebar-chip"
                    onClick={() => setTransferTarget({ id: p.id, name: p.name })}
                  >
                    <Crown size={13} /> {p.name}
                  </Button>
                ))}
              {state.participants.filter(p => !p.isAdmin).length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  —
                </span>
              )}
            </div>
          </Section>
        </div>
      )}

      {showCustomizeConfirm && (
        <Modal onClose={() => setShowCustomizeConfirm(false)} maxWidth="24rem">
          <h2 className="modal-title">{t('settings.customizeModal.title')}</h2>
          <p className="modal-subtitle">
            {t('settings.customizeModal.subtitle')}
          </p>
          <div className="panel-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setShowCustomizeConfirm(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => { updateDeck(state.deck || [], 'custom'); setShowCustomizeConfirm(false); }}>{t('common.confirm')}</Button>
          </div>
        </Modal>
      )}

      {showTaskSelector && (
        <TaskSelectionDialog
          actions={actions}
          currentTaskId={state.currentTaskId}
          onClose={() => setShowTaskSelector(false)}
          tasks={state.tasks}
        />
      )}

      {transferTarget && (
        <Modal onClose={() => setTransferTarget(null)} maxWidth="24rem">
          <h2 className="modal-title">{t('settings.transferModal.title')}</h2>
          <p className="modal-subtitle">
            {t('settings.transferModal.subtitle', { name: transferTarget.name })}
          </p>
          <div className="panel-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setTransferTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => { actions.adminTransferAdmin(transferTarget.id); setTransferTarget(null); }}>
              <Crown size={14} /> {t('settings.transferModal.confirm')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
