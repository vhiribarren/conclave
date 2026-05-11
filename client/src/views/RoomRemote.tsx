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
import { LogOut } from 'lucide-react';
import Button from '../components/Button';
import { AdminPanel } from '../components/AdminPanel';
import { useCurrentRoomSession } from './RoomSessionLayout';
import './Room.css';
import './RoomRemote.css';

const RoomRemote = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    actions,
    actionsRef,
    connectionError,
    currentRound,
    isAdmin,
    isJoined,
    name,
    setIsJoined,
    setName,
    state,
  } = useCurrentRoomSession();
  const [myVote, setMyVote] = useState<string | null>(null);

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
          <h2 className="modal-title" style={{ color: 'var(--danger-color)' }}>Room Not Found</h2>
          <p className="modal-subtitle">{connectionError}</p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isJoined && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-fade-in">
            <h2 className="modal-title">Join Room</h2>
            <p className="modal-subtitle">Enter your name to start.</p>
            <form onSubmit={handleJoin} className="landing-form">
              <input
                type="text"
                placeholder="Your Name"
                className="premium-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <Button type="submit">Enter Room</Button>
            </form>
          </div>
        </div>
      )}
      <div className={`room-container ${!isJoined ? 'blurred' : ''}`}>
        <header className="header glass">
          <div className="header-left">
            <div className="header-logo">C</div>
            <div>
              <h1 className="header-title">{state.name || roomId}</h1>
              <div className="header-subtitle">
                <span className="header-dot"></span>
                {state.participants.length} online · Remote
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate(`/room/${roomId}`)} className="icon-button danger" title="Leave Remote">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="room-layout">
          <main className="room-main">
            {isAdmin && actions && (
              <div className="remote-container">
                <AdminPanel state={state} actions={actions} myVote={myVote} onVote={handleVote} roomId={roomId} isAdmin={true} layout="remote" />
              </div>
            )}
            {!isAdmin && (
              <div className="page-container">
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Remote control is only available for admins.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default RoomRemote;
