"use client";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Conferma",
  cancelText = "Annulla",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="modal-panel glass w-full max-w-md rounded-3xl p-6 shadow-edge">
        <div className="text-xs uppercase tracking-[0.2em] text-slate">{title}</div>
        <div className="mt-2 text-lg font-semibold">{message}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-xl border border-ink/10 px-4 py-2 text-sm" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="rounded-xl bg-ink px-4 py-2 text-sm text-fog" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
