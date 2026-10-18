import React from 'react';

export function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'muted' | 'sticky' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  let variantClass = 'btn-hand';
  if (variant === 'secondary') {
    variantClass = 'btn-hand btn-hand-secondary';
  } else if (variant === 'muted') {
    variantClass = 'btn-hand btn-hand-muted';
  } else if (variant === 'sticky') {
    variantClass = 'btn-hand btn-hand-sticky';
  } else if (variant === 'danger') {
    variantClass = 'btn-hand bg-red-100 text-danger border-danger hover:bg-danger hover:text-white';
  }

  const sizeClasses = {
    sm: 'text-sm py-1 px-2.5 min-h-[36px]',
    md: 'text-base py-1.5 px-4 min-h-[44px]',
    lg: 'text-lg py-2.5 px-6 min-h-[48px]',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${variantClass} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />}
      <span>{children}</span>
    </button>
  );
}
