import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useAdminUndo } from '@/store/adminUndo';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useUndoKeyboard(enabled = true) {
  const isAdmin = useAuthStore((s) => s.isAdmin());

  useEffect(() => {
    if (!enabled || !isAdmin) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      void useAdminUndo.getState().undo();
    };

    // capture: перехват до MapLibre и других обработчиков
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [enabled, isAdmin]);
}
