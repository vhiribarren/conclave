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
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import { AdminPanel } from '../components/AdminPanel';
import PokerCard from '../components/PokerCard';
import { LanguageSelector } from '../components/LanguageSelector';
import { Modal } from '../components/Modal';
import { useCurrentRoomSession } from './RoomSessionLayout';
import './Room.css';
import './RoomRemote.css';

const RoomRemote = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    actions,
    actionsRef,
    connectionError,
    connectionStatus,
    currentRound,
    isAdmin,
    isJoined,
    name,
    setIsJoined,
    setName,
    state,
  } = useCurrentRoomSession();
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voteBarCollapsed, setVoteBarCollapsed] = useState(false);

  useEffect(() => {
    if (currentRound?.id) {
      setMyVote(null);
    }
  }, [currentRound?.id]);

  const handleVote = (card: string) => {
    const newVote = myVote === card ? null : card;
    setMyVote(newVote);
    actionsRef.current?.userVote(newVote);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsJoined(true);
    }
  };

  if (connectionError) {
    return (
      <div className="page-container animate-fade-in">
        <div className="landing-card glass" style={{ textAlign: 'center' }}>
          <h2 className="modal-title" style={{ color: 'var(--danger-color)' }}>{t('room.roomNotFound')}</h2>
          <p className="modal-subtitle">{connectionError}</p>
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
          <p className="modal-subtitle">{t('room.joinSubtitleRemote')}</p>
          <form onSubmit={handleJoin} className="landing-form">
            <input
              type="text"
              placeholder={t('room.yourName')}
              className="premium-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Button type="submit">{t('common.enterRoom')}</Button>
          </form>
        </Modal>
      )}
      <div className={`room-container ${!isJoined ? 'blurred' : ''}`}>
        <header className="header glass">
          <div className="header-left">
            <div className="header-logo">C</div>
            <div>
              <h1 className="header-title">{state.name || roomId}</h1>
              <div className="header-subtitle">
                <span className={`header-dot ${connectionStatus !== 'connected' ? 'disconnected' : ''}`}></span>
                {connectionStatus === 'connected'
                  ? `${state.participants.length} ${t('common.online')} · ${t('common.remote')}`
                  : t('common.reconnecting')
                }
              </div>
            </div>
          </div>
          <div className="header-actions">
            <LanguageSelector />
            <button onClick={() => navigate(`/room/${roomId}`)} className="icon-button danger" title={t('room.leaveRemote')}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="room-layout">
          <main className="room-main">
            {isAdmin && actions && (
              <div className="remote-container">
                <AdminPanel state={state} actions={actions} myVote={myVote} onVote={handleVote} roomId={roomId} isAdmin={true} layout="remote" />
              </div>            )}
            {!isAdmin && (
              <div className="page-container">
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {t('room.remoteAdminOnly')}
                </p>
              </div>
            )}
          </main>
        </div>

        {/* Sticky vote bar for admin on mobile */}
        {isAdmin && !currentRound?.revealed && (
          <div className={`remote-vote-bar glass ${voteBarCollapsed ? 'collapsed' : ''}`}>
            <button
              className="remote-vote-bar-toggle"
              onClick={() => setVoteBarCollapsed(!voteBarCollapsed)}
              aria-label={voteBarCollapsed ? 'Expand vote panel' : 'Collapse vote panel'}
            >
              <span className="remote-vote-bar-title">
                {t('admin.yourSecretVote')}
                {voteBarCollapsed && myVote && (
                  <span className="remote-vote-bar-current">{myVote}</span>
                )}
              </span>
              {voteBarCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {!voteBarCollapsed && (
              <div className="remote-vote-bar-cards">
                {(state.deck || []).map((card) => (
                  <PokerCard
                    key={card}
                    value={card}
                    selected={myVote === card}
                    small
                    onClick={() => handleVote(card)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default RoomRemote;
