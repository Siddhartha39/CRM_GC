import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

/**
 * Neumorphic Soft UI Confirm Dialog
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 p-4 bg-background shadow-neu-pressed-sm rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-background shadow-neu-pressed flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-warning stroke-[2]" />
          </div>
          <p className="text-sm text-foreground font-body leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="muted" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
