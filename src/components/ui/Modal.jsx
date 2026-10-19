import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Neumorphic Soft UI Modal
 * Tactile extruded dialog surface on a soft blurred backdrop.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D4852]/30 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div
        className={`relative w-full ${maxWidth} bg-background shadow-neu-flat rounded-[32px] p-6 sm:p-8 my-8 z-10 transition-all`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 mb-5 border-b border-muted/20">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm font-body text-muted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 rounded-full bg-background shadow-neu-flat-sm hover:shadow-neu-flat-hover active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-accent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent"
            title="Close"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
