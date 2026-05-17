import { useNavigate } from 'react-router-dom';
import {
  useDecisions,
  useMaintenance,
  useMlStatus,
  useResetDemo,
  useSites,
  useSuddenStorm,
  useWeatherSummary,
} from '@/api/hooks';
import { DemoControls } from './DemoControls';
import { DecisionLog } from './DecisionLog';
import { WeatherSummaryPanel } from './WeatherSummaryPanel';

export function Sidebar() {
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: weatherSummary = [], isLoading: summariesLoading } = useWeatherSummary();
  const { data: decisions = [] } = useDecisions(20);
  const { data: maintenance = [] } = useMaintenance();
  const { data: mlStatus } = useMlStatus();
  const storm = useSuddenStorm();
  const reset = useResetDemo();
  const navigate = useNavigate();

  const rainSite = sites.find((s) => s.weather_state === 'rain');

  return (
    <>
      <div className="card">
        <h3>Демо-сценарий</h3>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 11, lineHeight: 1.4 }}>
          Ручной триггер нужен только для показа внезапного события; погодные ТО-наряды создаются
          автоматически по прогнозному риску.
        </p>
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
        <h3>Погодная сводка</h3>
        <WeatherSummaryPanel
          sites={sites}
          summaries={weatherSummary}
          isLoading={sitesLoading || summariesLoading}
          onSelect={(id) => navigate(`/sites/${id}`)}
        />
      </div>

      {mlStatus && (
        <div className="card">
          <h3>ML-аналитика</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Калибратор
              </span>
              <span className={`badge ${mlStatus.calibrator.loaded ? 'ok' : 'warn'}`}>
                {mlStatus.calibrator.loaded ? mlStatus.calibrator.model : 'identity'}
              </span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Зелёное окно
              </span>
              <span
                className={`badge ${mlStatus.green_window_predictor.loaded ? 'ok' : 'info'}`}
              >
                {mlStatus.green_window_predictor.method}
              </span>
            </div>
            <p className="muted" style={{ fontSize: 11, margin: 0, lineHeight: 1.4 }}>
              {mlStatus.calibrator.loaded
                ? 'Прогноз провайдера калибруется ML-моделью.'
                : 'Модель не обучена — показываем сырые значения. См. data/models/README.md.'}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Открытые наряды ТО</h3>
        {maintenance.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            Пока нет открытых нарядов. Система создаст их автоматически при погодном риске, либо
            можно запустить демо-сценарий.
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
