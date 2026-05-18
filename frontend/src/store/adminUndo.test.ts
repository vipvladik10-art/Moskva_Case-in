import { beforeEach, describe, expect, it } from 'vitest';
import { useAdminUndo } from './adminUndo';

describe('adminUndo', () => {
  beforeEach(() => {
    useAdminUndo.getState().clear();
  });

  it('pops stack on undo', async () => {
    let value = 1;
    useAdminUndo.getState().push({
      label: 'test',
      run: () => {
        value = 0;
      },
    });
    await useAdminUndo.getState().undo();
    expect(value).toBe(0);
    expect(useAdminUndo.getState().stack).toHaveLength(0);
  });
});
