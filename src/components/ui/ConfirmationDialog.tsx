import React from 'react';
import { Modal } from './Modal';
import { POSButton } from './POSButton';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmationDialogProps) {
  const iconColor =
    variant === 'danger'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      : variant === 'warning'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title={title}
      icon={<AlertTriangle className={`w-5 h-5 ${iconColor}`} />}
      footer={
        <>
          <POSButton variant="ghost" size="touch" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </POSButton>
          <POSButton
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}
            size="touch"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </POSButton>
        </>
      }
    >
      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{message}</p>
    </Modal>
  );
}
