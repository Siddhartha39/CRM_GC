import React from 'react';

export function Card({
  children,
  className = '',
  tape = false,
  tapeColor = 'yellow', // 'yellow', 'blue', 'red'
  onClick,
  ...props
}) {
  const tapeColorClass = tapeColor === 'blue'
    ? 'washi-tape washi-tape-blue'
    : tapeColor === 'red'
    ? 'washi-tape washi-tape-red'
    : 'washi-tape';

  return (
    <div
      onClick={onClick}
      className={`card-hand relative p-5 bg-paper-white ${className}`}
      {...props}
    >
      {tape && <div className={tapeColorClass} />}
      {children}
    </div>
  );
}
