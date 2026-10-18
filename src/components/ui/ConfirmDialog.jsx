import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 bg-sticky-yellow border-2 border-border border-wobbly-md">
          <AlertTriangle className="w-8 h-8 text-accent shrink-0 stroke-[2.2]" />
          <p className="text-base text-foreground font-body">
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
