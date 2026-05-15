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
import React, { useState, useRef, useEffect } from 'react';
import { Eye, RotateCcw, Settings, Play, Pause, X, Layout, RotateCw, GripVertical, Smile, ListChecks, Crown, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { ConclaveActions, RoomState } from '../services/conclave';
import { DEFAULT_DECK } from 'conclave-shared';
import Button from './Button';
import Input from './Input';
import PokerCard from './PokerCard';
import { AggregationResult } from './AggregationResult';
import { TaskSelectionDialog } from './TaskSelectionDialog';
import { settings } from '../services/settings';
import { Modal, ModalTitle, ModalSubtitle } from './Modal';
import styles from './AdminPanel.module.css';

interface Props {
  state: RoomState;
  actions: ConclaveActions;
  isAdmin: boolean;
  myVote: string | null;
  onVote: (card: string) => void;
  roomId?: string;
  /** 'remote' wraps each section in a glass card; 'sidebar' uses a flat list layout */
  layout?: 'remote' | 'sidebar';
  autoReveal?: boolean;
  onAutoRevealChange?: (enabled: boolean) => void;
  /** Hide the inline vote cards section (e.g. when vote cards are shown elsewhere) */
  hideVoteCards?: boolean;
}

export const AdminPanel: React.FC<Props> = ({
  state,
  actions,
  isAdmin,
  myVote,
  onVote,
  roomId,
  layout = 'sidebar',
  autoReveal = false,
  onAutoRevealChange,
  hideVoteCards = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedDurationMs, setSelectedDurationMs] = useState(() => state.timerDurationMs);
  const [customTimerValue, setCustomTimerValue] = useState(() => String(state.timerDurationMs / 1000));

  // Sync local state when server state changes (e.g. from remote control)
  useEffect(() => {
    setSelectedDurationMs(state.timerDurationMs);
    setCustomTimerValue(String(state.timerDurationMs / 1000));
  }, [state.timerDurationMs]);
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
  const Section = ({ children, glass }: { children: React.ReactNode; glass?: boolean }) => (
    <div className={`${styles.section}${layout === 'remote' && glass ? ' glass' : ''}`}>{children}</div>
  );

  const SectionTitle = ({ children, className: cn }: { children: React.ReactNode; className?: string }) => (
    <span className={`${styles.sectionTitle} ${cn || ''}`}>{children}</span>
  );

  return (
    <div className={`${styles.panel} ${styles[layout]}`}>
      {/* ── Tabs (admin only) ─────────────────────────────────────── */}
      {isAdmin && (
        <div className={`${styles.tabs}${layout === 'remote' ? ' glass' : ''}`}>
          <button
            className={`${styles.tab} ${activeTab === 'control' ? styles.active : ''}`}
            onClick={() => setActiveTab('control')}
          >
            <Layout size={14} /> {t('admin.control')}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
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
              <div className={styles.cards}>
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
                {layout === 'remote' && <h2 className={`${styles.sectionTitle} ${styles.sectionTitleRemote}`}>{t('admin.actions')}</h2>}
                {layout === 'sidebar' && <SectionTitle>⚡ {t('admin.actions')}</SectionTitle>}
                <div className={styles.actions}>
                  {isRevealed ? (
                    <Button onClick={() => actions.adminReset()} className={styles.flexGrow}>
                      <RotateCcw size={15} /> {t('room.newVote')}
                    </Button>
                  ) : (
                    <>
                      {state.timerPausedRemainingMs !== null ? (
                        <>
                          <Button onClick={() => actions.adminResumeTimer()} variant="secondary" title={t('admin.resume')}>
                            <Play size={15} />
                          </Button>
                          <Button onClick={() => actions.adminSetTimer(null)} variant="danger" title={t('admin.timer')}>
                            <X size={15} />
                          </Button>
                        </>
                      ) : state.timerEndAt ? (
                        <>
                          <Button onClick={() => actions.adminPauseTimer()} variant="secondary" title={t('admin.pause')}>
                            <Pause size={15} />
                          </Button>
                          <Button onClick={() => actions.adminSetTimer(null)} variant="danger" title={t('admin.timer')}>
                            <X size={15} />
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => actions.adminSetTimer(selectedDurationMs)} variant="secondary" title={t('admin.start')}>
                          <Play size={15} /> <Timer size={15} /> {selectedDurationMs / 1000}s
                        </Button>
                      )}
                      <Button onClick={() => actions.adminReveal()} disabled={!state.participants.some(p => p.vote !== null)} className={styles.flexGrow}>
                        <Eye size={15} /> {t('room.reveal')}
                      </Button>
                    </>
                  )}
                </div>
              </Section>

              {/* ── Results (revealed) ──────────────────────────────── */}
              {isRevealed && (
                <Section glass>
                  {layout === 'sidebar' && <SectionTitle>📊 {t('room.results')}</SectionTitle>}
                  <AggregationResult participants={state.participants} deck={state.deck} roundVotes={state.anonymousVoting && currentRound?.revealed ? currentRound.votes : undefined} />
                </Section>
              )}

              {/* ── Current task ────────────────────────────────────── */}
              <Section glass>
                <SectionTitle>{layout === 'sidebar' ? `📋 ${t('admin.selectTask')}` : t('room.currentTask')}</SectionTitle>
                <div className={styles.voteSwitch} role="group" aria-label="Vote mode">
                  <button
                    type="button"
                    className={state.currentTaskId === null ? styles.active : ''}
                    onClick={() => actions.adminSetTask(null)}
                  >
                    {t('admin.adhocVote')}
                  </button>
                  <button
                    type="button"
                    className={state.currentTaskId !== null ? styles.active : ''}
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
                    <div className={styles.currentTask}>
                      <span>{currentTask?.name || t('admin.taskVote')}</span>
                      <small>
                        {currentTask
                          ? t('admin.round', { count: currentTask.rounds.length })
                          : t('admin.noTaskSelected')}
                      </small>
                    </div>
                    <div className={`${styles.actions} ${styles.taskActions}`}>
                      <Button onClick={() => nextTask && actions.adminSetTask(nextTask.id)} disabled={!nextTask} className={styles.taskActionsBtn}>
                        {t('admin.nextTask')}
                      </Button>
                      <Button onClick={() => setShowTaskSelector(true)} variant="secondary" className={styles.taskActionsBtn}>
                        <ListChecks size={15} /> {t('admin.selectTaskBtn')}
                      </Button>
                    </div>
                  </>
                )}
              </Section>

              {/* ── Admin secret vote (remote layout only) ──────────── */}
              {!isRevealed && layout === 'remote' && !hideVoteCards && (
                <Section glass>
                  <SectionTitle className={styles.sectionTitleCenter}>{t('admin.yourSecretVote')}</SectionTitle>
                  <div className={styles.adminVoteCards}>
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
        <div className={`animate-fade-in ${styles.settingsTab}`}>

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
            <div className={`${styles.actions} ${styles.actionsWrap}`}>
              {[15, 30, 45, 60].map(s => (
                <Button
                  key={s}
                  onClick={() => { setSelectedDurationMs(s * 1000); setCustomTimerValue(s.toString()); actions.adminSetTimerDuration(s * 1000); }}
                  variant={selectedDurationMs === s * 1000 ? 'primary' : 'secondary'}
                  size="small"
                >
                  {s >= 60 ? `${s / 60}m` : `${s}s`}
                </Button>
              ))}
            </div>
            <div className={styles.timerRow}>
              <div className={styles.timerWrapper}>
                <button
                  type="button"
                  className={styles.timerSpinBtn}
                  onClick={() => {
                    const val = Math.max(1, parseInt(customTimerValue) - 5);
                    setCustomTimerValue(String(val));
                    setSelectedDurationMs(val * 1000);
                    actions.adminSetTimerDuration(val * 1000);
                  }}
                >−</button>
                <Input
                  type="number"
                  active={![15, 30, 45, 60].includes(selectedDurationMs / 1000)}
                  value={customTimerValue}
                  onChange={(e) => {
                    setCustomTimerValue(e.target.value);
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) { setSelectedDurationMs(val * 1000); actions.adminSetTimerDuration(val * 1000); }
                  }}
                  placeholder="Custom"
                />
                <span className={styles.timerUnit}>s</span>
                <button
                  type="button"
                  className={styles.timerSpinBtn}
                  onClick={() => {
                    const val = parseInt(customTimerValue) + 5;
                    setCustomTimerValue(String(val));
                    setSelectedDurationMs(val * 1000);
                    actions.adminSetTimerDuration(val * 1000);
                  }}
                >+</button>
              </div>
            </div>
          </Section>

          {/* ── Deck editor ─────────────────────────────────────────── */}
          <Section glass>
            <SectionTitle>🃏 {t('settings.deckEditor')}</SectionTitle>
            <div className={styles.deckEditor} onDragOver={(e) => e.preventDefault()}>
              {(state.deck || []).map((card, idx) => {
                const isCustom = state.deckMode === 'custom';
                return (
                  <div
                    key={`card-${card}-${idx}`}
                    className={`${styles.deckChip} ${!isCustom ? styles.readOnly : ''}`}
                    draggable={isCustom}
                    onDragStart={() => isCustom && handleDragStart(idx)}
                    onDragOver={(e) => { e.preventDefault(); if (isCustom) handleDragOver(e, idx); }}
                    onDragEnd={isCustom ? handleDragEnd : undefined}
                  >
                    {isCustom && <GripVertical size={13} className={styles.deckChipGrip} />}
                    <span className={styles.deckChipValue}>{card}</span>
                    {isCustom && <X size={12} className={styles.deckChipRemove} onClick={() => removeCard(idx)} />}
                  </div>
                );
              })}
            </div>

            {state.deckMode === 'custom' ? (
              <div className={styles.deckEmojiPopover}>
                <form onSubmit={handleAddCard} className={`${styles.deckAddForm} animate-fade-in`}>
                  <div className={styles.deckAddRow}>
                    <Input
                      type="text"
                      placeholder={t('settings.cardPlaceholder')}
                      value={newCardValue}
                      onChange={(e) => setNewCardValue(e.target.value)}
                      maxLength={10}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className={styles.emojiBtn}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile size={18} />
                    </Button>
                  </div>
                  <Button type="submit">{t('settings.add')}</Button>
                </form>

                {showEmojiPicker && (
                  <div className={styles.deckEmojiPicker}>
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
              <div className={`animate-fade-in ${styles.deckReadonlyNotice}`}>
                <span>{t('settings.readOnly')}</span>
                <Button
                  onClick={() => setShowCustomizeConfirm(true)}
                  variant="secondary"
                  size="small"
                  className={styles.customizeBtn}
                >
                  {t('settings.customize')}
                </Button>
              </div>
            )}

            <div className={`${styles.actions} ${styles.actionsWrap} ${styles.deckPresets}`}>
              <Button
                onClick={() => updateDeck(DEFAULT_DECK, 'preset')}
                variant={state.deckMode === 'preset' && state.deck?.[0] === '0' ? 'primary' : 'secondary'}
                size="small"
              >
                {t('settings.standard')}
              </Button>
              <Button
                onClick={() => updateDeck(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'], 'preset')}
                variant={state.deckMode === 'preset' && state.deck?.[0] === '1' ? 'primary' : 'secondary'}
                size="small"
              >
                {t('settings.fibonacci')}
              </Button>
              <Button
                onClick={() => updateDeck(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'], 'preset')}
                variant={state.deckMode === 'preset' && state.deck?.[0] === 'XS' ? 'primary' : 'secondary'}
                size="small"
              >
                {t('settings.tshirt')}
              </Button>
              <Button
                onClick={() => updateDeck(savedCustomDeck, 'custom')}
                variant={state.deckMode === 'custom' ? 'primary' : 'secondary'}
                size="small"
                title="Use your custom deck"
              >
                <RotateCw size={13} /> {t('settings.custom')}
              </Button>
            </div>
          </Section>

          {/* ── Anonymous voting ──────────────────────────────────── */}
          <Section glass>
            <SectionTitle>🕵️ {t('settings.anonymousVoting')}</SectionTitle>
            <p className={styles.settingDesc}>
              {t('settings.anonymousVotingDesc')}
            </p>
            <div className={styles.voteSwitch} role="group" aria-label="Anonymous voting">
              <button
                type="button"
                className={!state.anonymousVoting ? styles.active : ''}
                onClick={() => actions.adminSetAnonymousVoting(false)}
              >
                {t('settings.anonymousVotingOff')}
              </button>
              <button
                type="button"
                className={state.anonymousVoting ? styles.active : ''}
                onClick={() => actions.adminSetAnonymousVoting(true)}
              >
                {t('settings.anonymousVotingOn')}
              </button>
            </div>
          </Section>

          {/* ── Auto-reveal ────────────────────────────────────────── */}
          <Section glass>
            <SectionTitle>⏱ {t('settings.autoReveal')}</SectionTitle>
            <p className={styles.settingDesc}>
              {t('settings.autoRevealDesc')}
            </p>
            <div className={styles.voteSwitch} role="group" aria-label="Auto-reveal">
              <button
                type="button"
                className={!autoReveal ? styles.active : ''}
                onClick={() => onAutoRevealChange?.(false)}
              >
                {t('settings.autoRevealOff')}
              </button>
              <button
                type="button"
                className={autoReveal ? styles.active : ''}
                onClick={() => onAutoRevealChange?.(true)}
              >
                {t('settings.autoRevealOn')}
              </button>
            </div>
          </Section>

          {/* ── Transfer admin ──────────────────────────────────────── */}
          <Section glass>
            <SectionTitle>👑 {t('settings.transferAdmin')}</SectionTitle>
            <p className={styles.settingDesc}>
              {t('settings.transferAdminDesc')}
            </p>
            <div className={`${styles.actions} ${styles.actionsWrap}`}>
              {state.participants
                .filter(p => !p.isAdmin)
                .map(p => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    size="small"
                    onClick={() => setTransferTarget({ id: p.id, name: p.name })}
                  >
                    <Crown size={13} /> {p.name}
                  </Button>
                ))}
              {state.participants.filter(p => !p.isAdmin).length === 0 && (
                <span className={styles.emptyPlaceholder}>
                  —
                </span>
              )}
            </div>
          </Section>
        </div>
      )}

      {showCustomizeConfirm && (
        <Modal onClose={() => setShowCustomizeConfirm(false)} maxWidth="24rem">
          <ModalTitle>{t('settings.customizeModal.title')}</ModalTitle>
          <ModalSubtitle>
            {t('settings.customizeModal.subtitle')}
          </ModalSubtitle>
          <div className={`${styles.actions} ${styles.modalActions}`}>
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
          <ModalTitle>{t('settings.transferModal.title')}</ModalTitle>
          <ModalSubtitle>
            {t('settings.transferModal.subtitle', { name: transferTarget.name })}
          </ModalSubtitle>
          <div className={`${styles.actions} ${styles.modalActions}`}>
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
