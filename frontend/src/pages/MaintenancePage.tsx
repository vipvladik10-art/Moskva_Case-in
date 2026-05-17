import { useMaintenance, useTrucks } from '@/api/hooks';

export function MaintenancePage() {
  const { data: tasks = [], isLoading } = useMaintenance();
  const { data: trucks = [] } = useTrucks();

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: '0 0 14px' }}>Наряды на ТО</h1>
      {isLoading && <p className="muted">Загрузка…</p>}
      {!isLoading && tasks.length === 0 && (
        <p className="muted">
          Нет открытых нарядов. Запустите сценарий дождя в правой панели — система автоматически
          создаст задачи ТО для простаивающей техники.
        </p>
      )}
      <div className="site-list">
        {tasks.map((t) => {
          const truck = trucks.find((x) => x.id === t.machine_id);
          return (
            <div key={t.id} className="site-card">
              <div>
                <div className="name">
                  {truck ? `Самосвал ${truck.plate}` : `Машина #${t.machine_id}`}
                </div>
                <div className="meta">
                  {t.reason} · бригада: {t.assigned_to}
                </div>
              </div>
              <span className="badge warn">{t.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
