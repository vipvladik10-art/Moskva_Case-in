import type { FleetVehicle } from '@/api/types';

const CATEGORIES = [
  { value: 'paver', label: 'Укладчик' },
  { value: 'roller', label: 'Каток' },
  { value: 'truck', label: 'Самосвал' },
  { value: 'support', label: 'Вспомогательная' },
];

interface Props {
  vehicles: FleetVehicle[];
  onChange: (vehicles: FleetVehicle[]) => void;
}

export function FleetVehiclesEditor({ vehicles, onChange }: Props) {
  const update = (index: number, patch: Partial<FleetVehicle>) => {
    onChange(vehicles.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const add = () => {
    const nextId = Math.max(0, ...vehicles.map((v) => v.id)) + 1;
    onChange([
      ...vehicles,
      { id: nextId, category: 'truck', name: '', plate: '', notes: '' },
    ]);
  };

  const remove = (index: number) => {
    onChange(vehicles.filter((_, i) => i !== index));
  };

  return (
    <div>
      <table className="form-table">
        <thead>
          <tr>
            <th>Категория</th>
            <th>Название</th>
            <th>Номер</th>
            <th>Примечание</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v, i) => (
            <tr key={v.id}>
              <td>
                <select
                  value={v.category}
                  onChange={(e) => update(i, { category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  value={v.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Модель / тип"
                />
              </td>
              <td>
                <input
                  value={v.plate}
                  onChange={(e) => update(i, { plate: e.target.value })}
                  placeholder="Госномер"
                />
              </td>
              <td>
                <input
                  value={v.notes ?? ''}
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
        + Добавить технику
      </button>
    </div>
  );
}
