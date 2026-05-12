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
import type { Participant } from 'conclave-shared';
import { Trophy } from 'lucide-react';
import './AggregationResult.css';

interface Props {
  participants: (Participant & { vote: string | null })[];
  deck?: string[];
  /** When provided (anonymous mode), votes are read from the round instead of participants */
  roundVotes?: Record<string, string>;
}

export const AggregationResult: React.FC<Props> = ({ participants, deck = [], roundVotes }) => {
  const votes = roundVotes
    ? Object.values(roundVotes)
    : participants.map(p => p.vote).filter(v => v !== null) as string[];
  
  if (votes.length === 0) return null;

  const counts: Record<string, number> = {};
  votes.forEach(v => {
    counts[v] = (counts[v] || 0) + 1;
  });

  const totalVotes = votes.length;
  const maxVotes = Math.max(...Object.values(counts));

  // Sort by inverse deck order. If not in deck, put at the end.
  const sortedVotes = Object.entries(counts).sort(([valA], [valB]) => {
    const idxA = deck.indexOf(valA);
    const idxB = deck.indexOf(valB);
    
    // If both in deck, sort by index descending
    if (idxA !== -1 && idxB !== -1) return idxB - idxA;
    // If only one in deck, the one in deck comes first
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    // Otherwise sort alphabetically
    return valA.localeCompare(valB);
  });

  return (
    <div className="aggregation-result animate-fade-in">
      <div className="aggregation-list">
        {sortedVotes.map(([vote, count]) => {
          const percentage = Math.round((count / totalVotes) * 100);
          const isWinner = count === maxVotes && totalVotes > 0;
          
          return (
            <div key={vote} className={`stat-row ${isWinner ? 'winner' : ''}`}>
              <div className="stat-card-value">
                {vote}
                {isWinner && <Trophy size={14} className="winner-icon" />}
              </div>
              
              <div className="stat-bar-container">
                <div 
                  className="stat-bar-fill" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="stat-meta">
                <span className="stat-count">{count} {count === 1 ? 'vote' : 'votes'}</span>
                <span className="stat-percent">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
