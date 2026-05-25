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
import React, { useRef, useEffect, useState } from 'react';
import { Crown, Check } from 'lucide-react';
import type { Participant } from 'conclave-shared';
import { TimerDisplay } from './TimerDisplay';
import styles from './ParticipantsBoard.module.css';

export type LayoutMode = 'auto' | 'grid';

const ScaledGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState(130);

  const MAX_CARD = 130;
  const MIN_CARD = 70;
  const BASE_GAP = 24;
  const CARD_ASPECT = 1.7; // full card height/width including padding and internal gaps

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const updateSize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const containerHeight = window.innerHeight - rect.top - 16;
        const containerWidth = container.clientWidth;
        if (containerHeight <= 0 || containerWidth <= 0) return;

        const grid = container.querySelector('[data-grid]') as HTMLElement | null;
        if (!grid) return;
        const cardCount = grid.children.length;
        if (cardCount === 0) { setCardSize(MAX_CARD); return; }

        const colsForSize = (size: number) => {
          const gap = BASE_GAP * (size / MAX_CARD);
          return Math.max(1, Math.floor((containerWidth + gap) / (size + gap)));
        };

        const fitsAt = (size: number) => {
          const gap = BASE_GAP * (size / MAX_CARD);
          const cols = colsForSize(size);
          const rows = Math.ceil(cardCount / cols);
          const totalHeight = rows * size * CARD_ASPECT + (rows - 1) * gap;
          return totalHeight <= containerHeight;
        };

        if (fitsAt(MAX_CARD)) { setCardSize(MAX_CARD); return; }

        let cols = colsForSize(MAX_CARD);
        let size = MAX_CARD;

        while (size > MIN_CARD) {
          cols++;
          const divisor = cols + (cols - 1) * BASE_GAP / MAX_CARD;
          size = Math.min(MAX_CARD, Math.floor(containerWidth / divisor));

          if (size < MIN_CARD) { size = MIN_CARD; break; }
          if (fitsAt(size)) break;
        }

        setCardSize(size);
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    window.addEventListener('resize', updateSize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [children]);

  const sizeRatio = cardSize / 130;

  return (
    <div ref={containerRef} className={styles.gridWrapper}>
      <div
        data-grid
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
          gap: `${Math.max(0.5, 1.5 * sizeRatio)}rem`,
          '--card-size': `${cardSize}px`,
          '--size-ratio': `${sizeRatio}`,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
};

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
  const canUseCircle = participants.length <= 8 && participants.length > 0;
  const useCircle = layoutMode === 'auto' && canUseCircle;

  if (!useCircle) {
    return (
      <ScaledGrid>
        {participants.length === 0 && (
          <div className={styles.emptyState}>No participants yet.</div>
        )}
        {participants.map((p) => (
          <ParticipantCard key={p.id} participant={p} isRevealed={isRevealed} myName={myName} />
        ))}
      </ScaledGrid>
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
    <div className={styles.avatar}>
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
