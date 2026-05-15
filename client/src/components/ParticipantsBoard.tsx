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
import React from 'react';
import { Crown, Check } from 'lucide-react';
import type { Participant } from 'conclave-shared';
import { TimerDisplay } from './TimerDisplay';
import styles from './ParticipantsBoard.module.css';

export type LayoutMode = 'auto' | 'grid';

interface Props {
  participants: (Participant & { vote: string | null })[];
  isRevealed: boolean;
  currentTaskName: string;
  myName: string;
  layoutMode: LayoutMode;
  timerEndAt: number | null;
  timerPausedRemainingMs: number | null;
}

export const ParticipantsBoard: React.FC<Props> = ({ participants, isRevealed, currentTaskName, myName, layoutMode, timerEndAt, timerPausedRemainingMs }) => {
  const canUseCircle = participants.length <= 12 && participants.length > 0;
  const useCircle = layoutMode === 'auto' && canUseCircle;

  if (!useCircle) {
    return (
      <div className={styles.gridWrapper}>
        <div className={styles.grid}>
          {participants.length === 0 && (
            <div className={styles.emptyState}>No participants yet.</div>
          )}
          {participants.map((p) => (
            <ParticipantCard key={p.id} participant={p} isRevealed={isRevealed} myName={myName} />
          ))}
        </div>
      </div>
    );
  }

  const angleStep = (2 * Math.PI) / participants.length;

  return (
    <div className={styles.circleContainer}>
      <div className={styles.circleWrapper}>
        <div className={styles.circleTable}>
           {(timerEndAt || timerPausedRemainingMs !== null) ? (
             <TimerDisplay timerEndAt={timerEndAt} timerPausedRemainingMs={timerPausedRemainingMs} />
           ) : (
             <span className={styles.circleTableText}>
               {currentTaskName || "Quick Vote"}
             </span>
           )}
        </div>
        
        {participants.map((p, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const xPct = 50 + Math.cos(angle) * 38;
          const yPct = 50 + Math.sin(angle) * 38;
          
          return (
            <div 
              key={p.id}
              className={styles.circleItem}
              style={{ top: `${yPct}%`, left: `${xPct}%`, transform: 'translate(-50%, -50%)' }}
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
  <div className={`${styles.card} glass ${p.vote ? styles.hasVoted : ''}`}>
    {p.isAdmin && <Crown size={14} className={styles.adminIcon} />}
    <div className={styles.avatar} style={{ fontSize: '1.8rem' }}>
      {p.mood || '🦊'}
    </div>
    <span className={styles.name} title={p.name}>
      {p.name} {p.name === myName ? '(You)' : ''}
    </span>
    
    <div className={`${styles.voteBox} ${p.vote ? styles.voted : ''}`}>
      {isRevealed ? p.vote : (p.vote ? <Check size={18} /> : '')}
    </div>
  </div>
);
