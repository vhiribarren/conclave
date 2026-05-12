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
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Edit2, ListChecks, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Round, Task } from 'conclave-shared';
import Button from '../components/Button';
import { LanguageSelector } from '../components/LanguageSelector';
import { Modal } from '../components/Modal';
import { setUserEmoji, setUserName } from '../services/user';
import { useCurrentRoomSession } from './RoomSessionLayout';
import './RoomTasks.css';

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

const RoomTasks = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const selectedTask = useMemo(() => {
    return state.tasks.find(task => task.id === (selectedTaskId || state.currentTaskId)) || state.tasks[0] || null;
  }, [selectedTaskId, state.currentTaskId, state.tasks]);

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

  const saveRename = (event: React.FormEvent) => {
    event.preventDefault();
    if (!actions || !editingTaskId || !editingName.trim()) return;
    actions.adminRenameTask(editingTaskId, editingName.trim());
    setEditingTaskId(null);
    setEditingName('');
  };

  const renderRoundSummary = (round: Round | undefined, emptyLabel: string) => {
    const summary = summarizeVotes(round, state.deck);
    const totalVotes = Object.keys(round?.votes || {}).length;

    if (!round) {
      return <p className="tasks-empty">{emptyLabel}</p>;
    }

    if (!round.revealed) {
      return (
        <div className="tasks-round-state">
          <span className="tasks-status-dot" />
          {t('tasks.votingInProgress')}
          <strong>{totalVotes}</strong>
        </div>
      );
    }

    if (summary.length === 0) {
      return <p className="tasks-empty">{t('tasks.noVotesCast')}</p>;
    }

    return (
      <div className="tasks-results-list">
        {summary.map(([vote, count]) => {
          const percent = Math.round((count / totalVotes) * 100);
          return (
            <div key={vote} className="tasks-result-row">
              <span className="tasks-vote-value">{vote}</span>
              <div className="tasks-result-bar">
                <span style={{ width: `${percent}%` }} />
              </div>
              <span className="tasks-result-meta">{count} / {totalVotes}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (connectionError) {
    return (
      <div className="page-container animate-fade-in">
        <div className="tasks-error glass">
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
          <h2 className="modal-title">{t('room.joinTitle')}</h2>
          <p className="modal-subtitle">{t('room.joinSubtitleTasks')}</p>
          <form onSubmit={handleJoin} className="landing-form">
            <input
              type="text"
              placeholder={t('room.yourName')}
              className="premium-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
            <input
              type="text"
              aria-label="Avatar"
              className="premium-input"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              maxLength={4}
            />
            <Button type="submit">{t('common.enterRoom')}</Button>
          </form>
        </Modal>
      )}

      <div className={`tasks-page ${!isJoined ? 'blurred' : ''}`}>
        <header className="tasks-header glass">
          <div className="tasks-header-title">
            <div className="header-logo">C</div>
            <div>
              <h1>{t('tasks.title')}</h1>
              <p>{state.name || roomId}</p>
            </div>
          </div>
          <div className="tasks-header-actions">
            <LanguageSelector />
            <button onClick={() => navigate(`/room/${roomId}`)} className="premium-button secondary">
              <ArrowLeft size={16} /> {t('tasks.backToRoom')}
            </button>
          </div>
        </header>

        <main className="tasks-layout">
          <section className="tasks-list-panel glass">
            <div className="tasks-panel-heading">
              <div>
                <span className="tasks-kicker">{isAdmin ? t('tasks.roomBacklog') : t('tasks.roomTasks')}</span>
                <h2>{t('tasks.taskCount', { count: state.tasks.length })}</h2>
              </div>
            </div>

            {isAdmin && (
              <form onSubmit={handleAddTask} className="tasks-add-form">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(event) => setNewTaskName(event.target.value)}
                  placeholder={t('tasks.addPlaceholder')}
                  className="premium-input"
                />
                <button type="submit" className="premium-button" disabled={!newTaskName.trim()}>
                  <Plus size={16} />
                </button>
              </form>
            )}

            <div className="tasks-list">
              {state.tasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                const isCurrent = state.currentTaskId === task.id;
                const lastRound = task.rounds[task.rounds.length - 1];

                return (
                  <article
                    key={task.id}
                    className={`tasks-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="tasks-list-main">
                      <span className="tasks-list-name">{task.name}</span>
                      <span className="tasks-list-meta">
                        {t('tasks.round', { count: task.rounds.length })}
                        {lastRound?.revealed ? ` · ${t('tasks.revealed').toLowerCase()}` : ` · ${t('tasks.open').toLowerCase()}`}
                      </span>
                    </div>
                    {isCurrent && <span className="tasks-current-badge">{t('tasks.current')}</span>}
                  </article>
                );
              })}

              {state.tasks.length === 0 && (
                <div className="tasks-empty-state">
                  <ListChecks size={28} />
                  <p>{t('tasks.noTaskYet')}</p>
                </div>
              )}
            </div>
          </section>

          <section className="tasks-detail-panel glass">
            {selectedTask ? (
              <>
                <div className="tasks-detail-header">
                  <div>
                    <span className="tasks-kicker">{t('tasks.selectedTask')}</span>
                    {editingTaskId === selectedTask.id ? (
                      <form onSubmit={saveRename} className="tasks-rename-form">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className="premium-input"
                          autoFocus
                        />
                        <button type="submit" className="icon-button success" title="Save">
                          <Check size={16} />
                        </button>
                        <button type="button" className="icon-button danger" onClick={() => setEditingTaskId(null)} title="Cancel">
                          <X size={16} />
                        </button>
                      </form>
                    ) : (
                      <h2>{selectedTask.name}</h2>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="tasks-detail-actions">
                      <button
                        onClick={() => actions?.adminSetTask(state.currentTaskId === selectedTask.id ? null : selectedTask.id)}
                        className="premium-button"
                      >
                        {state.currentTaskId === selectedTask.id ? t('tasks.unselect') : t('tasks.select')}
                      </button>
                      <button onClick={() => startRename(selectedTask)} className="icon-button" title={t('tasks.renameTask')}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => actions?.adminDeleteTask(selectedTask.id)} className="icon-button danger" title={t('tasks.deleteTask')}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="tasks-round-card">
                  <div className="tasks-round-card-header">
                    <h3>{t('tasks.latestRound')}</h3>
                    <span>{latestRound ? getRoundLabel(selectedTask, latestRound) : t('tasks.noRound')}</span>
                  </div>
                  {renderRoundSummary(latestRound, t('tasks.noRoundYet'))}
                </div>

                <div className="tasks-history">
                  <h3>{t('tasks.previousRounds')}</h3>
                  {previousRounds.length > 0 ? (
                    previousRounds.map(round => (
                      <div key={round.id} className="tasks-history-item">
                        <div className="tasks-round-card-header">
                          <span>{getRoundLabel(selectedTask, round)}</span>
                          <span>{round.revealed ? t('tasks.revealed') : t('tasks.open')}</span>
                        </div>
                        {renderRoundSummary(round, t('tasks.noVotes'))}
                      </div>
                    ))
                  ) : (
                    <p className="tasks-empty">{t('tasks.noPreviousRound')}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="tasks-empty-state tasks-empty-state--large">
                <ListChecks size={36} />
                <p>{t('tasks.selectOrCreate')}</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
};

export default RoomTasks;
