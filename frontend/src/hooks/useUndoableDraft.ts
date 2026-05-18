import { useCallback, useRef, useState } from 'react';
import { useAdminUndo } from '@/store/adminUndo';

/** Локальный draft с записью в общий стек отмены (Ctrl+Z). */
export function useUndoableDraft<T>(initial: T | null, label: string) {
  const [value, setValue] = useState<T | null>(initial);
  const valueRef = useRef(value);
  valueRef.current = value;
  const pushUndo = useAdminUndo((s) => s.push);

  const set = useCallback(
    (next: T) => {
      const prev = valueRef.current;
      if (prev !== null && prev !== undefined) {
        const snapshot = structuredClone(prev) as T;
        pushUndo({
          label,
          run: () => {
            setValue(snapshot);
          },
        });
      }
      setValue(next);
    },
    [label, pushUndo],
  );

  const reset = useCallback((next: T | null) => {
    setValue(next);
  }, []);

  return [value, set, reset] as const;
}
