import React from 'react';
import { Crown, User, Check } from 'lucide-react';
import type { Participant } from '@conclave/shared';

interface Props {
  participants: (Participant & { vote: string | null })[];
  isRevealed: boolean;
  currentTaskName: string;
  myName: string;
}

export const ParticipantsBoard: React.FC<Props> = ({ participants, isRevealed, currentTaskName, myName }) => {
  const isCircle = participants.length <= 12 && participants.length > 0;

  if (!isCircle) {
    return (
      <div className="participants-grid">
        {participants.length === 0 && (
          <div className="empty-state">No participants yet.</div>
        )}
        {participants.map((p) => (
          <ParticipantCard key={p.id} participant={p} isRevealed={isRevealed} myName={myName} />
        ))}
      </div>
    );
  }

  const radius = Math.min(window.innerWidth / 3, 200); // responsive radius
  const angleStep = (2 * Math.PI) / participants.length;

  return (
    <div className="circle-container">
      <div className="circle-wrapper">
        <div className="circle-table">
           <span className="circle-table-text">
             {currentTaskName || "Waiting for a task..."}
           </span>
        </div>
        
        {participants.map((p, i) => {
          const angle = i * angleStep - Math.PI / 2; // start from top
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div 
              key={p.id}
              className="circle-item"
              style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
            >
              <ParticipantCard participant={p} isRevealed={isRevealed} myName={myName} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ParticipantCard = ({ participant: p, isRevealed, myName }: { participant: Participant & { vote: string | null }, isRevealed: boolean, myName: string }) => (
  <div className={`participant-card glass ${p.vote ? 'has-voted' : ''}`}>
    {p.isAdmin && <Crown size={14} className="participant-admin-icon" />}
    <div className="participant-avatar">
      <User size={16} color={p.vote ? 'var(--accent-color)' : 'var(--text-secondary)'} />
    </div>
    <span className="participant-name" title={p.name}>
      {p.name} {p.name === myName ? '(You)' : ''}
    </span>
    
    <div className={`participant-vote-box ${p.vote ? 'voted' : ''}`}>
      {isRevealed ? p.vote : (p.vote ? <Check size={18} /> : '')}
    </div>
  </div>
);
