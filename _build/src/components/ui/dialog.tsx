import * as React from 'react';

/*
 * Bản thay thế nhẹ cho components/ui/dialog.tsx của gói gốc.
 *
 * VÌ SAO PHẢI THAY:
 *   Bản gốc dùng @radix-ui/react-dialog và nhiều class Tailwind
 *   (bg-background, ring-offset-background, data-[state=open]:animate-in...).
 *   App đích là JS thuần, không có Tailwind, nên nếu giữ nguyên thì hộp thoại
 *   sẽ không có kiểu dáng gì.
 *
 * Bản này chỉ dùng React thuần + class CSS có sẵn trong games.css
 * (.game-dialog, .rules-list, .rules-board...).
 *
 * Giữ nguyên API xuất ra để không phải sửa các file khác.
 */

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange?: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  // Đóng bằng phím Esc
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange?.(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="game-dialog-overlay" onClick={() => onOpenChange?.(false)} role="presentation">
      <div
        className="game-dialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function DialogTitle({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <h2 className={'game-dialog-title ' + className}>{children}</h2>;
}

export function DialogDescription({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <p className={'game-dialog-desc ' + className}>{children}</p>;
}

export function DialogHeader({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

export function DialogFooter({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

export function DialogClose({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export const DialogTrigger = DialogClose;
export const DialogPortal = DialogClose;
export const DialogOverlay = DialogClose;
