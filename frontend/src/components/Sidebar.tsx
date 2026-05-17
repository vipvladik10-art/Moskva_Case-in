import { useDecisions, useMaintenance, useResetDemo, useSites, useSuddenStorm } from '@/api/hooks';
import { DemoControls } from './DemoControls';
import { DecisionLog } from './DecisionLog';

export function Sidebar() {
  const { data: sites = [] } = useSites();
  const { data: decisions = [] } = useDecisions(20);
  const { data: maintenance = [] } = useMaintenance();
  const storm = useSuddenStorm();
  const reset = useResetDemo();

  const rainSite = sites.find((s) => s.weather_state === 'rain');

  return (
    <>
      <div className="card">
        <h3>Демо-сценарий</h3>
        <DemoControls
          sites={sites}
          rainSiteId={rainSite?.id ?? null}
          onTriggerStorm={(siteId) => storm.mutate({ site_id: siteId, redirect_count: 3 })}
          onReset={() => reset.mutate()}
          isLoading={storm.isPending || reset.isPending}
        />
        {storm.data && (
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            {storm.data.explanation}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Открытые наряды ТО</h3>
        {maintenance.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            Пока нет нарядов. Запустите дождь для генерации.
          </p>
        ) : (
          <div className="site-list">
            {maintenance.slice(0, 4).map((t) => (
              <div key={t.id} className="site-card">
                <div>
                  <div className="name">Машина #{t.machine_id}</div>
                  <div className="meta">{t.reason}</div>
                </div>
                <span className="badge warn">{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Журнал решений</h3>
        <DecisionLog decisions={decisions} />
      </div>
    </>
  );
}
