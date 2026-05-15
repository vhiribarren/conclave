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
import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import styles from './TimerDisplay.module.css';

interface Props {
  timerEndAt: number | null;
  timerPausedRemainingMs: number | null;
}

export const TimerDisplay: React.FC<Props> = ({ timerEndAt, timerPausedRemainingMs }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (timerPausedRemainingMs !== null) {
      setTimeLeft(timerPausedRemainingMs);
      return;
    }

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
  }, [timerEndAt, timerPausedRemainingMs]);

  if ((timerEndAt === null && timerPausedRemainingMs === null) || timeLeft === null) {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const isUrgent = timeLeft > 0 && timeLeft <= 10000;
  const isFinished = timeLeft === 0;

  return (
    <div className={`${styles.display} ${isFinished ? styles.finished : isUrgent ? styles.urgent : ''}`}>
      <Timer size={20} className={isFinished || isUrgent ? styles.iconBounce : ''} />
      <span>{formattedTime}</span>
    </div>
  );
};
