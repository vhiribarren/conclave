import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  children,
  ...props
}) => {
  const buttonClass = `premium-button ${variant === 'primary' ? '' : variant} ${className}`.trim();

  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  );
};

export default Button;