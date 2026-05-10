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
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, LogOut, Smartphone, UserCog, ChevronLeft, CircleDot, LayoutGrid, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

import { ConclaveSocket, type RoomState, type ConclaveActions } from '../services/conclave';
import { getUserId, getUserName, setUserName, getUserEmoji, setUserEmoji } from '../services/user';
import { addToHistory } from '../services/history';
import { ParticipantsBoard, type LayoutMode } from './ParticipantsBoard';
import { AggregationResult } from './AggregationResult';
import { TimerDisplay } from './TimerDisplay';
import { AdminRemote } from './AdminRemote';
import { SidebarPanel } from './SidebarPanel';


const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const isRemoteView = searchParams.get('remote') === 'true';
  const linkUserId = searchParams.get('linkUserId');
  const linkName = searchParams.get('name');

  useEffect(() => {
    if (linkUserId && linkName) {
      localStorage.setItem('conclave.user_id', linkUserId);
      localStorage.setItem('conclave.name', linkName);
      // Clean up URL to prevent sharing identity further
      window.history.replaceState({}, document.title, window.location.pathname + (isRemoteView ? '?remote=true' : ''));
      window.location.reload(); // Reload to pick up new ID from services
    }
  }, [linkUserId, linkName, isRemoteView]);

  const [name, setName] = useState(getUserName());
  const [mood, setMood] = useState(getUserEmoji());
  const [isJoined, setIsJoined] = useState(!!getUserName());
  const userId = getUserId();
  const [state, setState] = useState<RoomState>({ 
    participants: [], 
    tasks: [],
    currentTaskId: null,
    deck: [],
    timerEndAt: null
  });
  const [myVote, setMyVote] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showEmojiPickerJoin, setShowEmojiPickerJoin] = useState(false);
  const [showEmojiPickerSettings, setShowEmojiPickerSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const actionsRef = useRef<ConclaveActions | null>(null);

  useEffect(() => {
    if (isJoined && roomId && !linkUserId) {
      const actions = ConclaveSocket.connect(roomId, userId, name, mood, (newState) => {
        setState(newState);
        setConnectionError(null);
        if (roomId) {
          const isUserAdmin = newState.participants.find(p => p.id === userId)?.isAdmin;
          addToHistory(roomId, newState.name, isUserAdmin);
        }
      }, (error) => {
        setConnectionError(error);
      });
      
      actionsRef.current = actions;

      return () => {
        actions.disconnect();
      };
    }
  }, [isJoined, roomId, name]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setUserName(name);
      setUserEmoji(mood);
      if (actionsRef.current) {
        actionsRef.current.updateUser(name, mood);
      }
      setIsJoined(true);
    }
  };

  const handleVote = (card: string) => {
    const newVote = myVote === card ? null : card;
    setMyVote(newVote);
    actionsRef.current?.vote(newVote);
  };

  const handleReveal = () => actionsRef.current?.reveal();
  const handleReset = () => {
    setMyVote(null);
    actionsRef.current?.reset();
  };


  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const isAdmin = state.participants.find(p => p.isAdmin && p.name === name);

  const currentTask = state.tasks?.find(t => t.id === state.currentTaskId);
  const currentRound = currentTask?.rounds?.length ? currentTask.rounds[currentTask.rounds.length - 1] : null;
  const isRevealed = currentRound?.revealed || false;

  const renderOnboardingModal = () => (
    <div className="modal-overlay">
      <div className="modal-content glass animate-fade-in">
        <h2 className="modal-title">Join Room</h2>
        <p className="modal-subtitle">Enter your name to start voting.</p>
        <form onSubmit={handleJoin} className="landing-form">
          <input
            type="text"
            placeholder="Your Name"
            className="premium-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Choose your avatar</span>
            <button 
              type="button" 
              className="icon-button" 
              style={{ fontSize: '2.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '1rem' }}
              onClick={() => setShowEmojiPickerJoin(!showEmojiPickerJoin)}
            >
              {mood}
            </button>
            
            {showEmojiPickerJoin && (
              <div style={{ position: 'absolute', zIndex: 100, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <EmojiPicker 
                  onEmojiClick={(emojiData) => {
                    setMood(emojiData.emoji);
                    setShowEmojiPickerJoin(false);
                  }}
                  theme={Theme.LIGHT}
                  lazyLoadEmojis={true}
                  searchDisabled={false}
                  skinTonesDisabled={true}
                  height={450}
                  width={350}
                />
              </div>
            )}
          </div>

          <button type="submit" className="premium-button">Enter Room</button>
        </form>
      </div>
    </div>
  );

  if (connectionError) {
    return (
      <div className="page-container animate-fade-in">
        <div className="landing-card glass" style={{ textAlign: 'center' }}>
          <h2 className="modal-title" style={{ color: 'var(--danger-color)' }}>Room Not Found</h2>
          <p className="modal-subtitle">{connectionError}</p>
          <button onClick={() => navigate('/')} className="premium-button">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isJoined && renderOnboardingModal()}
      <div className={`room-container ${!isJoined ? 'blurred' : ''}`}>
      {/* Header */}
      <header className="header glass">
        <div className="header-left">
          <div className="header-logo">C</div>
          <div>
            <h1 className="header-title">{state.name || roomId}</h1>
            <div className="header-subtitle">
              <span className="header-dot"></span>
              {state.participants.length} online
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          {/* Layout toggle — only in main (non-remote) view */}
          {!isRemoteView && (
            <>
              <div className="header-separator" />
              <div className="layout-toggle-container" style={{ alignSelf: 'center' }}>
                <button
                  id="layout-btn-circle"
                  className={`layout-toggle-btn ${layoutMode === 'auto' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('auto')}
                  title="Vue circulaire"
                  disabled={state.participants.length > 12 || state.participants.length === 0}
                >
                  <CircleDot size={16} />
                </button>
                <button
                  id="layout-btn-grid"
                  className={`layout-toggle-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('grid')}
                  title="Vue grille"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              <div className="header-separator" />
            </>
          )}
          <button onClick={() => setShowUserSettings(true)} className="icon-button" title="User Settings">
            <UserCog size={18} />
          </button>
          {isAdmin && !isRemoteView && (
            <button onClick={() => setShowQR(true)} className="icon-button accent" title="Remote Control">
              <Smartphone size={18} />
            </button>
          )}
          <button onClick={() => setShowShareModal(true)} className="icon-button" title="Share Room">
            <Share2 size={18} />
          </button>
          <button onClick={() => navigate('/')} className="icon-button danger" title="Leave">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="room-layout">
        {isRemoteView && isAdmin && actionsRef.current ? (
          // ── Remote / mobile admin view ───────────────────────────────
          <main className="room-main">
            <AdminRemote state={state} actions={actionsRef.current} myVote={myVote} />
          </main>
        ) : (
          <>
            {/* ── Left column: participants ──────────────────────────── */}
            <main className="room-main">
              { (state.timerEndAt || state.timerPausedRemainingMs !== null) && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <TimerDisplay 
                    timerEndAt={state.timerEndAt} 
                    timerPausedRemainingMs={state.timerPausedRemainingMs} 
                  />
                </div>
              )}

              <div className="task-section">
                <h2 className="task-title">Current Task</h2>
                <div className="task-box glass">
                  {currentTask?.name || 'Waiting for a task…'}
                </div>
              </div>

              <ParticipantsBoard
                participants={state.participants}
                isRevealed={isRevealed}
                currentTaskName={currentTask?.name || ''}
                myName={name}
                layoutMode={layoutMode}
              />

              {/* Mobile-only: aggregation result below participants */}
              {isRevealed && (
                <div className="aggregation-mobile">
                  <AggregationResult participants={state.participants} />
                </div>
              )}

              {/* Mobile-only: voting cards sticky bottom */}
              {!isRevealed && currentTask && !isAdmin && (
                <div className="voting-section glass mobile-voting">
                  <span className="voting-title">Pick a card</span>
                  <div className="voting-cards">
                    {(state.deck || []).map((card) => (
                      <div
                        key={card}
                        onClick={() => handleVote(card)}
                        className={`poker-card ${myVote === card ? 'selected' : ''}`}
                      >
                        {card}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile-only: admin controls fixed bottom */}
              {isAdmin && (
                <div className="admin-controls glass mobile-admin">
                  <button onClick={handleReveal} disabled={isRevealed} className="premium-button">
                    Reveal
                  </button>
                  <button onClick={handleReset} className="premium-button secondary">
                    Reset
                  </button>
                </div>
              )}
            </main>

            {/* ── Right column: sidebar ──────────────────────────────── */}
            <aside className={`room-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
              <button
                className="sidebar-toggle-btn"
                onClick={() => setSidebarCollapsed((c) => !c)}
                title={sidebarCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <ChevronLeft size={18} />
              </button>
              <SidebarPanel
                state={state}
                actions={actionsRef.current}
                isAdmin={!!isAdmin}
                myVote={myVote}
                onVote={handleVote}
                isRevealed={isRevealed}
                hasCurrentTask={!!currentTask}
              />
            </aside>
          </>
        )}
      </div>
    </div>


    {showUserSettings && (
      <div className="modal-overlay" onClick={() => setShowUserSettings(false)}>
        <div className="modal-content glass animate-fade-in" onClick={e => e.stopPropagation()}>
          <h3 className="modal-title">User Settings</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleJoin(e); setShowUserSettings(false); }} className="landing-form">
            <input
              type="text"
              placeholder="Your Name"
              className="premium-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Change your avatar</span>
              <button 
                type="button" 
                className="icon-button" 
                style={{ fontSize: '2.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.4)', borderRadius: '1rem' }}
                onClick={() => setShowEmojiPickerSettings(!showEmojiPickerSettings)}
              >
                {mood}
              </button>
              
              {showEmojiPickerSettings && (
                <div style={{ position: 'absolute', zIndex: 100, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => {
                      setMood(emojiData.emoji);
                      setShowEmojiPickerSettings(false);
                    }}
                    theme={Theme.LIGHT}
                    lazyLoadEmojis={true}
                    height={450}
                    width={350}
                  />
                </div>
              )}
            </div>

            <button type="submit" className="premium-button">Update Profile</button>
          </form>
          <button onClick={() => setShowUserSettings(false)} className="premium-button secondary">Cancel</button>
        </div>
      </div>
    )}

    {showShareModal && (
      <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
        <div className="modal-content glass animate-fade-in" onClick={e => e.stopPropagation()}>
          <h3 className="modal-title">Share Room</h3>
          <p className="modal-subtitle">Invite others to join this session.</p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', margin: '1rem 0'}}>
            <div style={{background: 'white', padding: '1rem', borderRadius: '1rem'}} className="animate-fade-in">
              <QRCodeSVG value={window.location.href} size={180} />
            </div>

            <div style={{width: '100%', textAlign: 'left'}}>
              <span style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Room ID</span>
              <div className="premium-input" style={{marginTop: '0.25rem', background: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '0.9rem'}}>
                {roomId}
              </div>
            </div>

            <div style={{width: '100%', textAlign: 'left'}}>
              <span style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Invite Link</span>
              <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.25rem'}}>
                <input 
                  type="text" 
                  readOnly 
                  value={window.location.href} 
                  className="premium-input" 
                  style={{fontSize: '0.85rem', flex: 1}}
                />
                <button onClick={handleCopyLink} className={`premium-button ${copySuccess ? 'success' : 'secondary'}`} style={{padding: '0.5rem 1rem', flexShrink: 0}}>
                  {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          </div>
          
          <button onClick={() => setShowShareModal(false)} className="premium-button secondary">Close</button>
        </div>
      </div>
    )}

    {showQR && (
      <div className="modal-overlay" onClick={() => {setShowQR(false); setIsQRVisible(false);}}>
        <div className="modal-content glass animate-fade-in" onClick={e => e.stopPropagation()}>
          <h3 className="modal-title">Admin Remote Control</h3>
          <p className="modal-subtitle">Open the remote control in a new window, or scan the QR code with your phone.</p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', margin: '1rem 0'}}>
            <a 
              href={`${window.location.origin}/room/${roomId}?remote=true&linkUserId=${userId}&name=${encodeURIComponent(name)}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="premium-button" 
              style={{textDecoration: 'none'}}
            >
              <Smartphone size={18} /> Open Remote in New Tab
            </a>
            
            <button 
              onClick={() => setIsQRVisible(!isQRVisible)} 
              className="premium-button secondary" 
              style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
            >
              {isQRVisible ? 'Hide QR Code' : 'Show QR Code'}
            </button>
            
            {isQRVisible && (
              <div style={{background: 'white', padding: '1rem', borderRadius: '1rem', alignSelf: 'center'}} className="animate-fade-in">
                <QRCodeSVG value={`${window.location.origin}/room/${roomId}?remote=true&linkUserId=${userId}&name=${encodeURIComponent(name)}`} size={200} />
              </div>
            )}
          </div>
          
          <button onClick={() => {setShowQR(false); setIsQRVisible(false);}} className="premium-button secondary">Close</button>
        </div>
      </div>
    )}
    </>
  );
};

export default Room;
