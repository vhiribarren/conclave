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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronRight, GripVertical, ListChecks, Play, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Round, Task } from 'conclave-shared';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import Input from '../components/Input';
import Logo from '../components/Logo';
import { Modal, ModalTitle, ModalSubtitle } from '../components/Modal';
import { setUserEmoji, setUserName } from '../services/user';
import { useCurrentRoomSession } from './RoomSessionLayout';
import styles from './RoomTasks.module.css';

const MOBILE_BREAKPOINT = 860;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
};

const summarizeVotes = (round: Round | undefined, deck: string[]) => {
  const counts: Record<string, number> = {};
  Object.values(round?.votes || {}).forEach((vote) => {
    counts[vote] = (counts[vote] || 0) + 1;
  });

  return Object.entries(counts).sort(([a], [b]) => {
    const idxA = deck.indexOf(a);
    const idxB = deck.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
};

const getRoundLabel = (task: Task, round: Round) => {
  const index = task.rounds.findIndex(item => item.id === round.id);
  return index === -1 ? 'Round' : `Round ${index + 1}`;
};

/** Returns the vote value(s) with the highest count */
const getMajorityVotes = (round: Round | undefined, deck: string[]): string[] => {
  const summary = summarizeVotes(round, deck);
  if (summary.length === 0) return [];
  const maxCount = Math.max(...summary.map(([, count]) => count));
  return summary.filter(([, count]) => count === maxCount).map(([vote]) => vote);
};

/** Collapsible round result component */
const CollapsibleRound: React.FC<{
  round: Round | undefined;
  emptyLabel: string;
  label: string;
  sublabel?: string;
  deck: string[];
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
}> = ({ round, emptyLabel, label, sublabel, deck, defaultOpen = false, alwaysOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || alwaysOpen);
  const { t } = useTranslation();
  const summary = summarizeVotes(round, deck);
  const totalVotes = Object.keys(round?.votes || {}).length;
  const majorityVotes = getMajorityVotes(round, deck);
  const expanded = alwaysOpen || isOpen;

  if (!round) {
    return (
      <div className={styles.roundCard}>
        <div className={styles.roundCardHeader}>
          <span className={styles.roundLabel}>{label}</span>
          {sublabel && <span className={styles.roundSublabel}>{sublabel}</span>}
        </div>
        <p className={styles.empty}>{emptyLabel}</p>
      </div>
    );
  }

  if (!round.revealed) {
    return (
      <div className={styles.roundCard}>
        <div className={styles.roundCardHeader}>
          <span className={styles.roundLabel}>{label}</span>
        </div>
        <div className={styles.roundState}>
          <span className={styles.statusDot} />
          {t('tasks.votingInProgress')}
        </div>
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <div className={styles.roundCard}>
        <div className={styles.roundCardHeader}>
          <span className={styles.roundLabel}>{label}</span>
          {sublabel && <span className={styles.roundSublabel}>{sublabel}</span>}
        </div>
        <p className={styles.empty}>{t('tasks.noVotesCast')}</p>
      </div>
    );
  }

  return (
    <div className={styles.roundCard}>
      {alwaysOpen ? (
        <div className={styles.roundCardHeader}>
          <span className={styles.roundLabel}>{label}</span>
          {sublabel && <span className={styles.roundSublabel}>{sublabel}</span>}
          <span className={styles.majoritySummary}>
            {majorityVotes.map(vote => (
              <span key={vote} className={styles.majorityChip}>{vote}</span>
            ))}
          </span>
        </div>
      ) : (
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={expanded}
        >
          <span className={styles.collapseIcon}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className={styles.roundLabel}>{label}</span>
          {sublabel && <span className={styles.roundSublabel}>{sublabel}</span>}
          <span className={styles.majoritySummary}>
            {majorityVotes.map(vote => (
              <span key={vote} className={styles.majorityChip}>{vote}</span>
            ))}
          </span>
        </button>
      )}

      {expanded && (
        <div className={styles.resultsList}>
          {summary.map(([vote, count]) => {
            const percent = Math.round((count / totalVotes) * 100);
            return (
              <div key={vote} className={styles.resultRow}>
                <span className={styles.voteValue}>{vote}</span>
                <div className={styles.resultBar}>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <span className={styles.resultMeta}>{count} / {totalVotes}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RoomTasks = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    actions,
    connectionError,
    isAdmin,
    isJoined,
    mood,
    name,
    setIsJoined,
    setMood,
    setName,
    state,
  } = useCurrentRoomSession();
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mobileDetailTaskId, setMobileDetailTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteTask = useMemo(() => {
    if (!confirmDeleteId) return null;
    return state.tasks.find(t => t.id === confirmDeleteId) || null;
  }, [confirmDeleteId, state.tasks]);

  // Drag and drop state
  const dragSourceIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  const selectedTask = useMemo(() => {
    return state.tasks.find(task => task.id === (selectedTaskId || state.currentTaskId)) || state.tasks[0] || null;
  }, [selectedTaskId, state.currentTaskId, state.tasks]);

  const mobileDetailTask = useMemo(() => {
    if (!mobileDetailTaskId) return null;
    return state.tasks.find(task => task.id === mobileDetailTaskId) || null;
  }, [mobileDetailTaskId, state.tasks]);

  const latestRound = selectedTask?.rounds[selectedTask.rounds.length - 1];
  const previousRounds = selectedTask?.rounds.slice(0, -1).reverse() || [];

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim()) {
      setUserName(name);
      setUserEmoji(mood);
      setIsJoined(true);
    }
  };

  const handleAddTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTaskName.trim() || !actions) return;
    actions.adminAddTask(newTaskName.trim());
    setNewTaskName('');
  };

  const startRename = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingName(task.name);
  };

  const saveRename = (taskId: string) => {
    if (!actions || !editingName.trim()) return;
    actions.adminRenameTask(taskId, editingName.trim());
    setEditingTaskId(null);
    setEditingName('');
  };

  const cancelRename = () => {
    setEditingTaskId(null);
    setEditingName('');
  };

  const handleNameKeyDown = (event: React.KeyboardEvent, taskId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveRename(taskId);
    } else if (event.key === 'Escape') {
      cancelRename();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: React.DragEvent, idx: number) => {
    dragSourceIdx.current = idx;
    dragOverIdx.current = idx;
    event.dataTransfer.effectAllowed = 'move';
    // Use a transparent drag image to avoid the default ghost saccade
    if (!dragImageRef.current) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.top = '-9999px';
      el.style.left = '-9999px';
      el.style.width = '1px';
      el.style.height = '1px';
      document.body.appendChild(el);
      dragImageRef.current = el;
    }
    event.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
    setDragOverIndex(idx);
  };

  const handleDragOver = useCallback((event: React.DragEvent, idx: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverIdx.current !== idx) {
      dragOverIdx.current = idx;
      setDragOverIndex(idx);
    }
  }, []);

  const handleDragEnd = () => {
    const from = dragSourceIdx.current;
    const to = dragOverIdx.current;
    if (from !== null && to !== null && from !== to && actions) {
      const taskIds = state.tasks.map(t => t.id);
      const [moved] = taskIds.splice(from, 1);
      taskIds.splice(to, 0, moved!);
      actions.adminReorderTasks(taskIds);
    }
    dragSourceIdx.current = null;
    dragOverIdx.current = null;
    setDragOverIndex(null);
  };

  const handleStartVote = (taskId: string) => {
    if (!actions) return;
    actions.adminSetTask(taskId);
    navigate(`/room/${roomId}`);
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmDeleteId(taskId);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      actions?.adminDeleteTask(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };


  if (connectionError) {
    return (
      <div className="page-container animate-fade-in">
        <div className={`${styles.error} glass`}>
          <h2>{t('room.roomNotFound')}</h2>
          <p>{connectionError}</p>
          <Button onClick={() => navigate('/')}>{t('common.returnHome')}</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isJoined && (
        <Modal>
          <ModalTitle>{t('room.joinTitle')}</ModalTitle>
          <ModalSubtitle>{t('room.joinSubtitleTasks')}</ModalSubtitle>
          <form onSubmit={handleJoin}>
            <Input
              type="text"
              placeholder={t('room.yourName')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
            <Input
              type="text"
              aria-label="Avatar"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              maxLength={4}
            />
            <Button type="submit">{t('common.enterRoom')}</Button>
          </form>
        </Modal>
      )}

      <div className={`${styles.page} ${!isJoined ? styles.blurred : ''}`}>
        <header className={`${styles.header} glass`}>
          <div className={styles.headerTitle}>
            <Logo />
            <div>
              <h1>{t('tasks.title')}</h1>
              <p>{state.name || roomId}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button onClick={() => navigate(`/room/${roomId}`)} variant="secondary">
              <ArrowLeft size={16} /> {t('tasks.backToRoom')}
            </Button>
          </div>
        </header>

        <main className={styles.layout}>
          <section className={`${styles.listPanel} glass`}>
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.kicker}>{isAdmin ? t('tasks.roomBacklog') : t('tasks.roomTasks')}</span>
                <h2>{t('tasks.taskCount', { count: state.tasks.length })}</h2>
              </div>
            </div>

            {isAdmin && (
              <form onSubmit={handleAddTask} className={styles.addForm}>
                <Input
                  type="text"
                  value={newTaskName}
                  onChange={(event) => setNewTaskName(event.target.value)}
                  placeholder={t('tasks.addPlaceholder')}
                />
                <Button type="submit" disabled={!newTaskName.trim()}>
                  <Plus size={16} />
                </Button>
              </form>
            )}

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thName}>{t('tasks.taskName')}</th>
                    <th className={styles.thResult}>{t('tasks.result')}</th>
                    {isAdmin && <th className={styles.thActions}></th>}
                  </tr>
                </thead>
                <tbody>
                  {state.tasks.map((task, idx) => {
                    const isSelected = selectedTask?.id === task.id;
                    const isCurrent = state.currentTaskId === task.id;
                    const isEditing = editingTaskId === task.id;
                    const isDragOver = dragOverIndex === idx && dragSourceIdx.current !== idx;

                    return (
                      <tr
                        key={task.id}
                        className={`${styles.tableRow} ${isSelected ? styles.selected : ''} ${isDragOver ? styles.dragOver : ''}`}
                        onClick={() => {
                          if (isEditing) return;
                          if (isMobile) {
                            setMobileDetailTaskId(task.id);
                          } else {
                            setSelectedTaskId(task.id);
                          }
                        }}
                        draggable={isAdmin && !isEditing}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                      >
                        <td className={styles.cellName}>
                          {isAdmin && !isEditing && (
                            <GripVertical size={14} className={styles.gripIcon} />
                          )}
                          {isEditing ? (
                            <div className={styles.inlineEdit}>
                              <input
                                type="text"
                                className={styles.inlineInput}
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => handleNameKeyDown(e, task.id)}
                                onBlur={() => saveRename(task.id)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <IconButton
                                type="button"
                                variant="success"
                                title="Save"
                                onClick={(e) => { e.stopPropagation(); saveRename(task.id); }}
                              >
                                <Check size={14} />
                              </IconButton>
                              <IconButton
                                type="button"
                                variant="danger"
                                title="Cancel"
                                onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                              >
                                <X size={14} />
                              </IconButton>
                            </div>
                          ) : (
                            <span
                              className={`${styles.taskName} ${isAdmin ? styles.taskNameEditable : ''}`}
                              onDoubleClick={(e) => {
                                if (isAdmin && !isMobile) {
                                  e.stopPropagation();
                                  startRename(task);
                                }
                              }}
                              onTouchStart={(e) => {
                                if (!isAdmin) return;
                                const timer = setTimeout(() => {
                                  e.preventDefault();
                                  startRename(task);
                                }, 500);
                                (e.currentTarget as HTMLElement).dataset.longPressTimer = String(timer);
                              }}
                              onTouchEnd={(e) => {
                                const timer = (e.currentTarget as HTMLElement).dataset.longPressTimer;
                                if (timer) clearTimeout(Number(timer));
                              }}
                              onTouchMove={(e) => {
                                const timer = (e.currentTarget as HTMLElement).dataset.longPressTimer;
                                if (timer) clearTimeout(Number(timer));
                              }}
                              title={isAdmin ? t('tasks.clickToEdit') : undefined}
                            >
                              {task.name}
                            </span>
                          )}
                        </td>
                        <td className={styles.cellResult}>
                          {(() => {
                            const lastRevealedRound = [...task.rounds].reverse().find(r => r.revealed);
                            if (!lastRevealedRound) {
                              return <span className={styles.noResult}>—</span>;
                            }
                            const majority = getMajorityVotes(lastRevealedRound, state.deck);
                            return majority.map(vote => (
                              <span key={vote} className={styles.majorityChip}>{vote}</span>
                            ));
                          })()}
                        </td>
                        {isAdmin && (
                          <td className={styles.cellActions} onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              onClick={() => handleStartVote(task.id)}
                              title={t('tasks.startVote')}
                              className={`${styles.voteBtn} ${isCurrent ? styles.voteBtnActive : ''}`}
                            >
                              <Play size={14} />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDeleteTask(task.id)}
                              variant="danger"
                              title={t('tasks.deleteTask')}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {state.tasks.length === 0 && (
                <div className={styles.emptyState}>
                  <ListChecks size={28} />
                  <p>{t('tasks.noTaskYet')}</p>
                </div>
              )}
            </div>
          </section>

          {!isMobile && (
            <section className={`${styles.detailPanel} glass`}>
              {selectedTask ? (
                <>
                  <div className={styles.detailHeader}>
                    <div>
                      <span className={styles.kicker}>{t('tasks.selectedTask')}</span>
                      <h2>{selectedTask.name}</h2>
                    </div>
                  </div>

                  <CollapsibleRound
                    key={latestRound?.id ?? selectedTask.id}
                    round={latestRound}
                    emptyLabel={t('tasks.noRoundYet')}
                    label={t('tasks.latestRound')}
                    sublabel={latestRound ? getRoundLabel(selectedTask, latestRound) : t('tasks.noRound')}
                    deck={state.deck}
                    alwaysOpen={true}
                  />

                  {previousRounds.length > 0 && (
                    <div className={styles.history}>
                      <h3>{t('tasks.previousRounds')}</h3>
                      {previousRounds.map(round => (
                        <CollapsibleRound
                          key={round.id}
                          round={round}
                          emptyLabel={t('tasks.noVotes')}
                          label={getRoundLabel(selectedTask, round)}
                          sublabel={round.revealed ? t('tasks.revealed') : t('tasks.open')}
                          deck={state.deck}
                        />
                      ))}
                    </div>
                  )}

                  {previousRounds.length === 0 && (
                    <p className={styles.empty}>{t('tasks.noPreviousRound')}</p>
                  )}
                </>
              ) : (
                <div className={`${styles.emptyState} ${styles.emptyStateLarge}`}>
                  <ListChecks size={36} />
                  <p>{t('tasks.selectOrCreate')}</p>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {isMobile && mobileDetailTask && (() => {
        const mLatestRound = mobileDetailTask.rounds[mobileDetailTask.rounds.length - 1];
        const mPreviousRounds = mobileDetailTask.rounds.slice(0, -1).reverse();
        return (
          <Modal onClose={() => setMobileDetailTaskId(null)} maxWidth="95vw">
            <div className={styles.mobileDetail}>
              <div className={styles.mobileDetailHeader}>
                <h2>{mobileDetailTask.name}</h2>
                <IconButton onClick={() => setMobileDetailTaskId(null)} title={t('common.close')}>
                  <X size={18} />
                </IconButton>
              </div>

              <CollapsibleRound
                key={mLatestRound?.id ?? mobileDetailTask.id}
                round={mLatestRound}
                emptyLabel={t('tasks.noRoundYet')}
                label={t('tasks.latestRound')}
                sublabel={mLatestRound ? getRoundLabel(mobileDetailTask, mLatestRound) : t('tasks.noRound')}
                deck={state.deck}
                alwaysOpen={true}
              />

              {mPreviousRounds.length > 0 && (
                <div className={styles.history}>
                  <h3>{t('tasks.previousRounds')}</h3>
                  {mPreviousRounds.map(round => (
                    <CollapsibleRound
                      key={round.id}
                      round={round}
                      emptyLabel={t('tasks.noVotes')}
                      label={getRoundLabel(mobileDetailTask, round)}
                      sublabel={round.revealed ? t('tasks.revealed') : t('tasks.open')}
                      deck={state.deck}
                    />
                  ))}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {confirmDeleteTask && (
        <Modal onClose={() => setConfirmDeleteId(null)} maxWidth="24rem">
          <div className={styles.confirmModal}>
            <h3>{t('tasks.confirmDeleteTitle')}</h3>
            <p>{t('tasks.confirmDeleteMessage', { name: confirmDeleteTask.name })}</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                {t('tasks.deleteTask')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default RoomTasks;
