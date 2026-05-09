import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface Props {
  timerEndAt: number | null;
}

export const TimerDisplay: React.FC<Props> = ({ timerEndAt }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!timerEndAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, timerEndAt - Date.now());
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [timerEndAt]);

  if (timerEndAt === null || timeLeft === null) {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const isUrgent = timeLeft > 0 && timeLeft <= 10000;
  const isFinished = timeLeft === 0;

  return (
    <div className={`timer-display ${isFinished ? 'finished' : isUrgent ? 'urgent' : ''}`}>
      <Timer size={20} className={isFinished || isUrgent ? 'timer-icon-bounce' : ''} />
      <span>{formattedTime}</span>
    </div>
  );
};
