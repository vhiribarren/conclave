import React from 'react';
import { Crown, Check } from 'lucide-react';
import type { Participant } from '@conclave/shared';

export type LayoutMode = 'auto' | 'grid';

interface Props {
  participants: (Participant & { vote: string | null })[];
  isRevealed: boolean;
  currentTaskName: string;
  myName: string;
  layoutMode: LayoutMode;
}

export const ParticipantsBoard: React.FC<Props> = ({ participants, isRevealed, currentTaskName, myName, layoutMode }) => {
  const canUseCircle = participants.length <= 12 && participants.length > 0;
  const useCircle = layoutMode === 'auto' && canUseCircle;

  if (!useCircle) {
    return (
      <div className="participants-grid-wrapper">
        <div className="participants-grid">
          {participants.length === 0 && (
            <div className="empty-state">No participants yet.</div>
          )}
          {participants.map((p) => (
            <ParticipantCard key={p.id} participant={p} isRevealed={isRevealed} myName={myName} />
          ))}
        </div>
      </div>
    );
  }

  const radius = Math.min(window.innerWidth / 3, 200);
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
          const angle = i * angleStep - Math.PI / 2;
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
    <div className="participant-avatar" style={{ fontSize: '1.8rem' }}>
      {p.mood || '🦊'}
    </div>
    <span className="participant-name" title={p.name}>
      {p.name} {p.name === myName ? '(You)' : ''}
    </span>
    
    <div className={`participant-vote-box ${p.vote ? 'voted' : ''}`}>
      {isRevealed ? p.vote : (p.vote ? <Check size={18} /> : '')}
    </div>
  </div>
);
