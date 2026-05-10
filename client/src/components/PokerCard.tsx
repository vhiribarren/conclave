import React from 'react';
import './PokerCard.css';

interface PokerCardProps {
  value: string;
  selected?: boolean;
  small?: boolean;
  onClick?: () => void;
  className?: string;
}

const PokerCard: React.FC<PokerCardProps> = ({
  value,
  selected = false,
  small = false,
  onClick,
  className = ''
}) => {
  const cardClass = `poker-card ${selected ? 'selected' : ''} ${small ? 'small' : ''} ${className}`.trim();

  return (
    <div className={cardClass} onClick={onClick}>
      {value}
    </div>
  );
};

export default PokerCard;