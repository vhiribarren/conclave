import React from 'react';
import type { Participant } from '@conclave/shared';

export const AggregationResult: React.FC<{ participants: (Participant & { vote: string | null })[] }> = ({ participants }) => {
  const votes = participants.map(p => p.vote).filter(v => v !== null && v !== '?' && v !== '☕') as string[];
  
  const counts: Record<string, number> = {};
  participants.forEach(p => {
    if (p.vote) {
      counts[p.vote] = (counts[p.vote] || 0) + 1;
    }
  });

  const numericVotes = votes.map(v => parseFloat(v)).filter(n => !isNaN(n));
  const avg = numericVotes.length > 0 ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1) : null;
  
  const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="aggregation-result glass animate-fade-in">
      <h3 className="aggregation-title">Results</h3>
      
      <div className="aggregation-stats">
        {avg !== null && (
          <div className="avg-box">
            <span className="avg-label">Average</span>
            <span className="avg-value">{avg}</span>
          </div>
        )}
        
        {sortedCounts.map(([vote, count]) => (
          <div key={vote} className="stat-box">
            <span className="stat-value">{vote}</span>
            <span className="stat-label">{count} {count === 1 ? 'vote' : 'votes'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
