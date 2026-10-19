import React from 'react';

/**
 * Neumorphic Soft UI Card
 * Molded from the base cool grey surface with dual opposing shadows.
 */
export function Card({
  children,
  className = '',
  variant = 'flat', // 'flat', 'flat-hover', 'pressed', 'pressed-deep', 'sm'
  onClick,
  ...props
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'pressed':
        return 'shadow-neu-pressed rounded-[24px]';
      case 'pressed-deep':
        return 'shadow-neu-pressed-deep rounded-[24px]';
      case 'sm':
        return 'shadow-neu-flat-sm rounded-2xl';
      case 'flat-hover':
      default:
        return 'shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-0.5 transition-all duration-300 rounded-[32px]';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-background text-foreground p-6 ${getVariantClass()} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
