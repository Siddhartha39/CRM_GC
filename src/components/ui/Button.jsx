import React from 'react';

/**
 * Neumorphic Soft UI Button
 * Features tactile dual shadows, smooth micro-interactions, and accessible focus states.
 */
export function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'muted' | 'outline' | 'danger' | 'success' | 'sticky'
  size = 'md',         // 'sm' | 'md' | 'lg' | 'icon'
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-accent text-white shadow-neu-accent hover:bg-accent-light hover:shadow-[8px_8px_18px_rgba(108,99,255,0.45),-8px_-8px_18px_rgba(255,255,255,0.7)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.35)]';
      case 'danger':
        return 'bg-danger text-white shadow-[6px_6px_14px_rgba(229,62,62,0.4),-6px_-6px_14px_rgba(255,255,255,0.6)] hover:bg-red-600 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.35)]';
      case 'success':
        return 'bg-success text-white shadow-[6px_6px_14px_rgba(56,178,172,0.4),-6px_-6px_14px_rgba(255,255,255,0.6)] hover:bg-teal-600 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.35)]';
      case 'secondary':
      case 'muted':
      case 'outline':
      case 'sticky':
      default:
        return 'bg-background text-foreground shadow-neu-flat hover:shadow-neu-flat-hover hover:text-accent active:shadow-neu-pressed';
    }
  };

  const sizeStyles = {
    sm: 'text-xs py-1.5 px-3 min-h-[36px] rounded-xl font-medium gap-1.5',
    md: 'text-sm py-2 px-4 min-h-[44px] rounded-2xl font-semibold gap-2',
    lg: 'text-base py-3 px-6 min-h-[48px] rounded-2xl font-bold gap-2.5',
    icon: 'p-2.5 min-h-[44px] min-w-[44px] rounded-2xl justify-center',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-body transition-all duration-300 ease-out select-none focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-neu-pressed-sm hover:-translate-y-0.5 active:translate-y-0.5 ${getVariantStyles()} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />}
      {children && <span>{children}</span>}
    </button>
  );
}
