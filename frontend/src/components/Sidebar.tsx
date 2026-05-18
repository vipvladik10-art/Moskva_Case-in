import { Link, useNavigate } from 'react-router-dom';
import {
  useDecisions,
  useMaintenance,
  useMlStatus,
  useEndRain,
  useResetDemo,
  useSites,
  useSuddenStorm,
  useWeatherSummary,
} from '@/api/hooks';
import { weatherPollingHint } from '@/lib/weatherSource';
import { useAuthStore } from '@/store/auth';
import { DemoControls } from './DemoControls';
import { DecisionLog } from './DecisionLog';
import { WeatherSummaryPanel } from './WeatherSummaryPanel';

export function Sidebar() {
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: weatherSummary = [], isLoading: summariesLoading } = useWeatherSummary();
  const { data: decisions = [] } = useDecisions(20);
  const { data: maintenance = [] } = useMaintenance({ status: 'open' });
  const { data: mlStatus } = useMlStatus();
  const storm = useSuddenStorm();
  const endRain = useEndRain();
  const reset = useResetDemo();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const rainSite = sites.find((s) => s.weather_state === 'rain');
  const duringCount = maintenance.filter((t) => t.phase === 'during_rain').length;
  const afterCount = maintenance.filter((t) => t.phase === 'after_rain').length;

  return (
    <>
      <div className="card">
        <h3>Демо-сценарий</h3>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 11, lineHeight: 1.4 }}>
          Сводка погоды — в режиме онлайн. Кнопки дождя доступны всем; сброс — только админу.
        </p>
        <DemoControls
          sites={sites}
          rainSiteId={rainSite?.id ?? null}
          onTriggerStorm={(siteId) => storm.mutate({ site_id: siteId, redirect_count: 3 })}
          onEndRain={() => endRain.mutate()}
          onReset={() => reset.mutate()}
          isLoading={storm.isPending || reset.isPending || endRain.isPending}
          canReset={isAdmin}
        />
        {storm.data && (
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            {storm.data.explanation}
          </p>
        )}
        {endRain.data?.message && (
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            {endRain.data.message}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Погодная сводка</h3>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 11 }}>
          {weatherPollingHint()}
        </p>
        <WeatherSummaryPanel
          sites={sites}
          summaries={weatherSummary}
          isLoading={sitesLoading || summariesLoading}
          onSelect={(id) => navigate(`/sites/${id}`)}
        />
      </div>

      {mlStatus ? (
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
      ) : null}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Наряды ТО</h3>
          <Link to="/maintenance" style={{ fontSize: 12 }}>
            Все →
          </Link>
        </div>
        {maintenance.length === 0 ? (
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
            Нет открытых нарядов.
          </p>
        ) : (
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
            Открыто: <strong>{maintenance.length}</strong> (во время дождя: {duringCount}, после:{' '}
            {afterCount})
          </p>
        )}
        {maintenance.length > 0 ? (
          <div className="site-list" style={{ marginTop: 8 }}>
            {maintenance.slice(0, 2).map((t) => (
              <Link
                key={t.id}
                to="/maintenance"
                className="site-card"
                style={{ textDecoration: 'none' }}
              >
                <div>
                  <div className="name">{t.what || t.destination}</div>
                  <div className="meta">{t.trigger_source || t.reason_code}</div>
                </div>
                <span className="badge warn">{t.status}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3>Журнал решений</h3>
        <DecisionLog decisions={decisions} />
      </div>
    </>
  );
}
