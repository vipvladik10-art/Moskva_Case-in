import type { FleetWorker } from '@/api/types';

interface Props {
  workers: FleetWorker[];
  onChange: (workers: FleetWorker[]) => void;
}

export function FleetWorkersEditor({ workers, onChange }: Props) {
  const update = (index: number, patch: Partial<FleetWorker>) => {
    onChange(workers.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  const add = () => {
    onChange([...workers, { grade: 4, role: '', count: 1, notes: '' }]);
  };

  const remove = (index: number) => {
    onChange(workers.filter((_, i) => i !== index));
  };

  return (
    <div>
      <table className="form-table">
        <thead>
          <tr>
            <th>Разряд</th>
            <th>Роль</th>
            <th>Кол-во</th>
            <th>Примечание</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {workers.map((w, i) => (
            <tr key={`${w.grade}-${w.role}-${i}`}>
              <td style={{ width: 72 }}>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={w.grade}
                  onChange={(e) => update(i, { grade: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  value={w.role}
                  onChange={(e) => update(i, { role: e.target.value })}
                  placeholder="машинист, мастер…"
                />
              </td>
              <td style={{ width: 72 }}>
                <input
                  type="number"
                  min={0}
                  value={w.count}
                  onChange={(e) => update(i, { count: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  value={w.notes ?? ''}
                  onChange={(e) => update(i, { notes: e.target.value })}
                />
              </td>
              <td>
                <button type="button" className="ghost danger-text" onClick={() => remove(i)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={add} style={{ marginTop: 10 }}>
        + Добавить должность
      </button>
    </div>
  );
}

