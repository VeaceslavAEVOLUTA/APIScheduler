export default function DetailModal({
  open,
  title,
  data,
  onClose,
}: {
  open: boolean;
  title: string;
  data: any;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="modal-panel glass w-full max-w-2xl rounded-3xl p-6 shadow-edge">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.2em] text-slate">{title}</div>
          <button className="rounded-xl border border-ink/10 px-3 py-1 text-xs" onClick={onClose}>Close</button>
        </div>
        <pre className="mt-4 max-h-[60vh] overflow-auto rounded-2xl bg-white/70 p-4 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
