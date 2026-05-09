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
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowRight, History, Clock, Crown } from 'lucide-react';
import { getUserName, setUserName } from '../services/user';
import { getHistory, type HistoryEntry } from '../services/history';

const Landing = () => {
  const [roomName, setRoomName] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [userName, setUserNameInput] = useState(getUserName());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [history] = useState<HistoryEntry[]>(getHistory());
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const createRoom = async () => {
    if (userName.trim()) {
      setUserName(userName.trim());
    }
    try {
      setIsLoading(true);
      const host = import.meta.env.PROD ? '' : `http://${window.location.hostname}:8787`;
      const res = await fetch(`${host}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/room/${data.roomId}`);
      }
    } catch (err) {
      console.error('Failed to create room', err);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setUserName(userName.trim());
    }
    if (roomName.trim()) {
      navigate(`/room/${roomName.trim()}`);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="landing-card glass">
        <div className="landing-glow-1"></div>
        <div className="landing-glow-2"></div>
        
        <div className="landing-header">
          <div className="landing-icon-wrapper">
            <Users size={32} color="white" />
          </div>
          <h1 className="landing-title">
            Conclave
          </h1>
          <p className="landing-subtitle">
            Clean poker planning for remote teams.
          </p>
        </div>

        <div className="landing-form">
          <div style={{ textAlign: 'center', marginBottom: '-0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Your Profile Name
          </div>
          <input
            type="text"
            placeholder="e.g. Alice"
            className="premium-input"
            value={userName}
            onChange={(e) => setUserNameInput(e.target.value)}
            style={{ textAlign: 'center', fontWeight: 'bold' }}
          />

          <div className="landing-divider" style={{ margin: '0.5rem 0' }}>
            <div className="landing-divider-line"></div>
          </div>

          <button onClick={() => setShowCreateModal(true)} disabled={isLoading} className="premium-button">
            <Plus size={18} />
            {isLoading ? 'Creating...' : 'Create New Room'}
          </button>
          
          <div className="landing-divider">
            <div className="landing-divider-line"></div>
            <span className="landing-divider-text">or join existing</span>
            <div className="landing-divider-line"></div>
          </div>

          <form onSubmit={joinRoom} className="landing-form">
            <input
              type="text"
              placeholder="Enter Room ID"
              className="premium-input"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={{ textAlign: 'center' }}
            />
            <button type="submit" className="premium-button secondary">
              Join Room
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {history.length > 0 && (
          <div className="landing-history glass">
            <div className="history-header">
              <History size={16} />
              <span>Recent Rooms</span>
            </div>
            <div className="history-list">
              {history.map(entry => (
                <div 
                  key={entry.id} 
                  className="history-item"
                  onClick={() => navigate(`/room/${entry.id}`)}
                >
                  <div className="history-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="history-name">{entry.name || entry.id}</span>
                      {entry.isAdmin && <Crown size={14} color="#f59e0b" fill="#f59e0b" style={{ opacity: 0.8 }} />}
                    </div>
                    <span className="history-id">{entry.id}</span>
                  </div>
                  <div className="history-meta">
                    <Clock size={12} />
                    <span>{new Date(entry.visitedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create New Room</h2>
            <p className="modal-subtitle">Give your room a title (optional).</p>
            <form onSubmit={(e) => { e.preventDefault(); createRoom(); }} className="landing-form">
              <div style={{ textAlign: 'center', marginBottom: '-0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Room Title
              </div>
              <input
                type="text"
                placeholder="e.g. Sprint Planning #42"
                className="premium-input"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                style={{ textAlign: 'center' }}
                autoFocus
              />
              <button type="submit" disabled={isLoading} className="premium-button">
                {isLoading ? 'Creating...' : 'Confirm & Create'}
              </button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="premium-button secondary">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
      
      <div className="landing-footer">
        <span>No auth</span>
        <span>•</span>
        <span>Real-time</span>
        <span>•</span>
        <span>Free</span>
      </div>
    </div>
  );
};

export default Landing;
