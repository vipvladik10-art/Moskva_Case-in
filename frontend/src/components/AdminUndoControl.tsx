import { useAdminUndo } from '@/store/adminUndo';
import { useAuthStore } from '@/store/auth';

export function AdminUndoControl() {
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const stackSize = useAdminUndo((s) => s.stack.length);
  const lastMessage = useAdminUndo((s) => s.lastMessage);

  if (!isAdmin) return null;

  return (
    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
      <button
        type="button"
        className="ghost"
        disabled={stackSize === 0}
        title="Отменить последнее действие (Ctrl+Z)"
        onClick={() => void useAdminUndo.getState().undo()}
        style={{ fontSize: 12, padding: '4px 10px' }}
      >
        ↶ Отменить{stackSize > 0 ? ` (${stackSize})` : ''}
      </button>
      {lastMessage && (
        <span className="muted" style={{ fontSize: 11, maxWidth: 180 }}>
          {lastMessage}
        </span>
      )}
    </div>
  );
}
