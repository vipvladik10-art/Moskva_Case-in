import { create } from 'zustand';

export type UndoEntry = {
  label: string;
  run: () => void | Promise<void>;
};

interface AdminUndoState {
  stack: UndoEntry[];
  lastMessage: string | null;
  push: (entry: UndoEntry) => void;
  undo: () => Promise<void>;
  clear: () => void;
}

export const useAdminUndo = create<AdminUndoState>((set, get) => ({
  stack: [],
  lastMessage: null,
  push: (entry) =>
    set((state) => ({
      stack: [...state.stack.slice(-49), entry],
      lastMessage: null,
    })),
  undo: async () => {
    const { stack } = get();
    if (stack.length === 0) {
      set({ lastMessage: 'Нечего отменять' });
      return;
    }
    const entry = stack[stack.length - 1]!;
    try {
      await entry.run();
      set({
        stack: stack.slice(0, -1),
        lastMessage: `Отменено: ${entry.label}`,
      });
    } catch {
      set({ lastMessage: `Не удалось отменить: ${entry.label}` });
    }
  },
  clear: () => set({ stack: [], lastMessage: null }),
}));
