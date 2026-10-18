import React, { useEffect } from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm overflow-y-auto">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div
        className={`relative w-full ${maxWidth} bg-paper-white card-hand-lg border-2 border-border p-6 my-8 z-10`}
      >
        {/* Sticky note tape decoration */}
        <div className="washi-tape" />

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-dashed border-border/40 pb-3 mb-4">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm font-body text-foreground/70 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-full border-2 border-border hover:bg-accent hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[80vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
