import React from 'react';
import type { Participant } from 'conclave-shared';
import { Trophy } from 'lucide-react';
import './AggregationResult.css';

interface Props {
  participants: (Participant & { vote: string | null })[];
  deck?: string[];
}

export const AggregationResult: React.FC<Props> = ({ participants, deck = [] }) => {
  const votes = participants.map(p => p.vote).filter(v => v !== null) as string[];
  
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
    <div className="aggregation-result glass animate-fade-in">
      <h3 className="aggregation-title">Results</h3>
      
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
