import React, { useState } from 'react';
import { Eye, RotateCcw } from 'lucide-react';
import type { ConclaveActions, RoomState } from '../services/conclave';

interface Props {
  state: RoomState;
  actions: ConclaveActions;
  myVote: string | null;
}

export const AdminRemote: React.FC<Props> = ({ state, actions, myVote }) => {
  const [newTaskName, setNewTaskName] = useState('');
  
  const currentTask = state.tasks?.find(t => t.id === state.currentTaskId);
  const currentRound = currentTask?.rounds?.length ? currentTask.rounds[currentTask.rounds.length - 1] : null;
  const isRevealed = currentRound?.revealed || false;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      actions.addTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  return (
    <div className="remote-container">
      <div className="remote-box glass">
        <h2 className="remote-title">Remote Control</h2>
        
        <div className="remote-actions">
          <button onClick={() => actions.reveal()} disabled={isRevealed} className="premium-button">
            <Eye size={16} /> Reveal
          </button>
          <button onClick={() => actions.reset()} className="premium-button danger">
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="remote-box glass">
        <h3 className="remote-section-title">Tasks</h3>
        <form onSubmit={handleAddTask} className="remote-form">
          <input 
            type="text" 
            value={newTaskName} 
            onChange={(e) => setNewTaskName(e.target.value)} 
            placeholder="New task..." 
            className="premium-input"
          />
          <button type="submit" className="premium-button">+</button>
        </form>

        <div className="task-list">
          {state.tasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => actions.setTask(task.id)}
              className={`task-item ${state.currentTaskId === task.id ? 'active' : ''}`}
            >
              {task.name}
            </div>
          ))}
        </div>
      </div>

      <div className="remote-box glass">
        <h3 className="remote-section-title">Timer</h3>
        <div className="remote-actions">
           <button onClick={() => actions.setTimer(60000)} className="premium-button secondary" style={{padding: '0.5rem', fontSize: '0.8rem'}}>1m</button>
           <button onClick={() => actions.setTimer(120000)} className="premium-button secondary" style={{padding: '0.5rem', fontSize: '0.8rem'}}>2m</button>
           <button onClick={() => actions.setTimer(300000)} className="premium-button secondary" style={{padding: '0.5rem', fontSize: '0.8rem'}}>5m</button>
           <button onClick={() => actions.setTimer(null)} className="premium-button danger" style={{padding: '0.5rem', fontSize: '0.8rem'}}>Stop</button>
        </div>
      </div>

      <div className="remote-box glass">
        <h3 className="remote-section-title">Deck Configuration</h3>
        <div className="remote-actions" style={{ flexWrap: 'wrap' }}>
           <button onClick={() => actions.setDeck(['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'])} className="premium-button secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Standard</button>
           <button onClick={() => actions.setDeck(['1', '2', '3', '5', '8', '13', '21', '34', '55', '89'])} className="premium-button secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Fibonacci</button>
           <button onClick={() => actions.setDeck(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'])} className="premium-button secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>T-Shirt</button>
        </div>
      </div>

      {!isRevealed && currentTask && (
        <div className="remote-box glass">
          <h3 className="remote-section-title" style={{textAlign: 'center'}}>Secret Vote</h3>
          <div className="voting-cards">
            {(state.deck || []).map((card) => (
              <div
                key={card}
                onClick={() => actions.vote(myVote === card ? null : card)}
                className={`poker-card small ${myVote === card ? 'selected' : ''}`}
              >
                {card}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
