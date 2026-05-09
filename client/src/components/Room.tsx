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
import { Share2, LogOut, Eye, RotateCcw, Smartphone, List, Plus, UserCog, Settings } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { ConclaveSocket, type RoomState, type ConclaveActions } from '../services/conclave';
import { getUserId, getUserName, setUserName } from '../services/user';
import { addToHistory } from '../services/history';
import { ParticipantsBoard } from './ParticipantsBoard';
import { AggregationResult } from './AggregationResult';
import { TimerDisplay } from './TimerDisplay';
import { AdminRemote } from './AdminRemote';


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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const actionsRef = useRef<ConclaveActions | null>(null);

  useEffect(() => {
    if (isJoined && roomId && !linkUserId) {
      const actions = ConclaveSocket.connect(roomId, userId, name, (newState) => {
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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim() && actionsRef.current) {
      actionsRef.current.addTask(newTaskName.trim());
      setNewTaskName('');
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
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
          <button onClick={() => setShowUserSettings(true)} className="icon-button" title="User Settings">
            <UserCog size={18} />
          </button>
          {isAdmin && !isRemoteView && (
            <button onClick={() => setShowQR(true)} className="icon-button accent" title="Remote Control">
              <Smartphone size={18} />
            </button>
          )}
          <button onClick={handleCopyLink} className="icon-button" title="Copy Link">
            <Share2 size={18} />
          </button>
          <button onClick={() => navigate('/')} className="icon-button danger" title="Leave">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Timer Section */}
        {state.timerEndAt && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <TimerDisplay timerEndAt={state.timerEndAt} />
          </div>
        )}

        {/* Task Section */}
        <div className="task-section">
          <h2 className="task-title">Current Task</h2>
          <div className="task-box glass">
            {currentTask?.name || "Waiting for a task..."}
          </div>
        </div>

        {isRemoteView && isAdmin && actionsRef.current ? (
          <AdminRemote state={state} actions={actionsRef.current} myVote={myVote} />
        ) : (
          <>
            <ParticipantsBoard 
              participants={state.participants} 
              isRevealed={isRevealed} 
              currentTaskName={currentTask?.name || ''} 
              myName={name} 
            />

            {isRevealed && <AggregationResult participants={state.participants} />}

            {!isRevealed && currentTask && (
              <div className="voting-section glass">
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
          </>
        )}

        {/* Admin Controls on Desktop */}
        {isAdmin && !isRemoteView && (
          <div className="admin-controls glass">
            <button onClick={() => setShowTaskModal(true)} className="premium-button secondary">
              <List size={18} /> Tasks
            </button>
            <button onClick={() => setShowRoomSettings(true)} className="premium-button secondary">
              <Settings size={18} /> Settings
            </button>
            <button onClick={handleReveal} disabled={isRevealed} className="premium-button">
              <Eye size={18} /> Reveal
            </button>
            <button onClick={handleReset} className="premium-button secondary">
              <RotateCcw size={18} /> Reset
            </button>
          </div>
        )}
      </main>
    </div>

    {showTaskModal && (
      <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
        <div className="modal-content glass animate-fade-in" onClick={e => e.stopPropagation()}>
          <h3 className="modal-title">Manage Tasks</h3>
          <form onSubmit={handleAddTask} className="remote-form">
            <input 
              type="text" 
              value={newTaskName} 
              onChange={(e) => setNewTaskName(e.target.value)} 
              placeholder="Enter a new task..." 
              className="premium-input"
              autoFocus
            />
            <button type="submit" className="premium-button">
              <Plus size={18} /> Add
            </button>
          </form>

          <div className="task-list" style={{ textAlign: 'left' }}>
            {state.tasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => actionsRef.current?.setTask(task.id)}
                className={`task-item ${state.currentTaskId === task.id ? 'active' : ''}`}
              >
                {task.name}
              </div>
            ))}
            {state.tasks.length === 0 && (
              <p className="modal-subtitle" style={{textAlign: 'center', marginTop: '1rem'}}>No tasks yet.</p>
            )}
          </div>
          
          <button onClick={() => setShowTaskModal(false)} className="premium-button secondary">Close</button>
        </div>
      </div>
    )}

    {showRoomSettings && actionsRef.current && (
      <div className="modal-overlay" onClick={() => setShowRoomSettings(false)}>
        <div className="modal-content glass animate-fade-in" onClick={e => e.stopPropagation()}>
          <h3 className="modal-title">Room Settings</h3>
          
          <div className="remote-box" style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '1rem' }}>
            <h3 className="remote-section-title" style={{ textAlign: 'center' }}>Timer</h3>
            <div className="remote-actions" style={{ justifyContent: 'center' }}>
               <button onClick={() => { actionsRef.current?.setTimer(60000); setShowRoomSettings(false); }} className="premium-button secondary" style={{padding: '0.5rem', fontSize: '0.8rem'}}>1m</button>
               <button onClick={() => { actionsRef.current?.setTimer(120000); setShowRoomSettings(false); }} className="premium-button secondary" style={{padding: '0.5rem', fontSize: '0.8rem'}}>2m</button>
               <button onClick={() => { actionsRef.current?.setTimer(300000); setShowRoomSettings(false); }} className="premium-button secondary" style={{padding: '0.5rem', fontSize: '0.8rem'}}>5m</button>
               <button onClick={() => { actionsRef.current?.setTimer(null); setShowRoomSettings(false); }} className="premium-button danger" style={{padding: '0.5rem', fontSize: '0.8rem'}}>Stop</button>
            </div>
          </div>

          <div className="remote-box" style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '1rem' }}>
            <h3 className="remote-section-title" style={{ textAlign: 'center' }}>Deck Configuration</h3>
            <div className="remote-actions" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
               <button onClick={() => { actionsRef.current?.setDeck(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕']); setShowRoomSettings(false); }} className="premium-button secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Standard</button>
               <button onClick={() => { actionsRef.current?.setDeck(['1', '2', '3', '5', '8', '13', '21', '34', '55', '89']); setShowRoomSettings(false); }} className="premium-button secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Fibonacci</button>
               <button onClick={() => { actionsRef.current?.setDeck(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?']); setShowRoomSettings(false); }} className="premium-button secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>T-Shirt</button>
            </div>
          </div>

          <button onClick={() => setShowRoomSettings(false)} className="premium-button secondary" style={{ marginTop: '1rem' }}>Close</button>
        </div>
      </div>
    )}

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
            <button type="submit" className="premium-button">Update Name</button>
          </form>
          <button onClick={() => setShowUserSettings(false)} className="premium-button secondary">Cancel</button>
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
