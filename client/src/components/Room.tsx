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
import { Share2, LogOut, Crown, Check, Eye, RotateCcw, User } from 'lucide-react';

import { ConclaveSocket, type RoomState, type ConclaveActions } from '../services/conclave';

const CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState(localStorage.getItem('conclave_name') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [state, setState] = useState<RoomState>({ participants: [], revealed: false, currentTask: '' });
  const [myVote, setMyVote] = useState<string | null>(null);
  const actionsRef = useRef<ConclaveActions | null>(null);

  useEffect(() => {
    if (isJoined && roomId) {
      const actions = ConclaveSocket.connect(roomId, name, (newState) => {
        setState(newState);
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
      localStorage.setItem('conclave_name', name.trim());
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
    alert('Link copied to clipboard!');
  };

  const isAdmin = state.participants.find(p => p.isAdmin && p.name === name);

  if (!isJoined) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md w-full glass p-8 text-center flex flex-col gap-6">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Join Room</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Enter your name to start voting.</p>
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Your Name"
              className="premium-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="premium-button">Enter Room</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="glass m-4 p-4 flex items-center justify-between border-none rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            C
          </div>
          <div>
            <h1 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{roomId}</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{state.participants.length} online</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleCopyLink} className="p-2 rounded-lg hover:bg-black/5 transition-colors" title="Copy Link">
            <Share2 size={18} />
          </button>
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-black/5 transition-colors text-red-500" title="Leave">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-6 md:gap-8 overflow-y-auto">
        {/* Task Section */}
        <div className="w-full max-w-2xl mx-auto text-center flex flex-col gap-2">
          <h2 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.5px' }}>Current Task</h2>
          <div className="glass p-5 text-lg font-medium">
            {state.currentTask || "Waiting for a task..."}
          </div>
        </div>

        {/* Participants Grid */}
        <div className="flex-1 w-full max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 content-start">
          {state.participants.map((p) => (
            <div key={p.id} className={`glass p-4 flex flex-col items-center gap-3 relative transition-all duration-300 ${p.vote ? 'border-indigo-200' : ''}`}>
              {p.isAdmin && <Crown size={12} className="absolute top-2 right-2 text-amber-500" />}
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                <User size={20} color={p.vote ? 'var(--accent-color)' : 'var(--text-secondary)'} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name} {p.name === name ? '(You)' : ''}</span>
              
              <div className={`w-12 h-16 rounded-lg border flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                p.vote 
                  ? 'border-indigo-100 bg-indigo-50/50 text-indigo-600' 
                  : 'border-slate-100 bg-slate-50/30 text-transparent'
              }`}>
                {state.revealed ? p.vote : (p.vote ? <Check size={20} /> : '')}
              </div>
            </div>
          ))}
        </div>

        {/* Voting Section */}
        {!state.revealed && (
          <div className="glass p-5 w-full sm:w-fit mx-auto flex flex-col gap-4 items-center mb-4 sticky bottom-4 shadow-lg">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Pick a card</span>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {CARDS.map((card) => (
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

        {/* Admin Controls */}
        {isAdmin && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-2 bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl">
            <button onClick={handleReveal} className="premium-button flex items-center gap-2">
              <Eye size={16} /> Reveal
            </button>
            <button onClick={handleReset} className="premium-button flex items-center gap-2" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', boxShadow: 'none' }}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Room;
