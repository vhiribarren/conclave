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
import { Users, Plus, ArrowRight } from 'lucide-react';

const Landing = () => {
  const [roomName, setRoomName] = useState('');
  const navigate = useNavigate();

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 10);
    navigate(`/room/${roomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      navigate(`/room/${roomName.trim()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full glass p-8 text-center flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <Users size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Conclave
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Clean poker planning for remote teams.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={createRoom} className="premium-button flex items-center justify-center gap-2">
            <Plus size={18} />
            Create New Room
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--surface-border)' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>OR JOIN EXISTING</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--surface-border)' }}></div>
          </div>

          <form onSubmit={joinRoom} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Enter Room ID"
              className="premium-input"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button type="submit" className="premium-button flex items-center justify-center gap-2" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', boxShadow: 'none' }}>
              Join Room
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
      
      <div style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', gap: '1.5rem' }}>
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
