import { Link, useParams } from 'react-router-dom';
import { useForecast, useGreenWindow, useMaxTonnage, useSite } from '@/api/hooks';
import { GreenWindowTimeline } from '@/components/GreenWindowTimeline';
import { TonnageWidget } from '@/components/TonnageWidget';

export function SiteDetailsPage() {
  const { id } = useParams();
  const siteId = Number(id);
  const { data: site } = useSite(siteId);
  const { data: forecast = [] } = useForecast(siteId);
  const { data: gw } = useGreenWindow(siteId);
  const { data: tonnage } = useMaxTonnage(siteId);

  if (!site) {
    return (
      <div style={{ padding: 18 }}>
        <Link to="/sites">← К списку участков</Link>
        <p className="muted" style={{ marginTop: 14 }}>
          Загрузка участка…
        </p>
      </div>
    );
  }

  const isRain = site.weather_state === 'rain';
  const weatherSource = forecast[0]?.source === 'openweather' ? 'OpenWeatherMap' : 'mock fallback';

  return (
    <div className="site-page">
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Link to="/sites" className="muted" style={{ fontSize: 12 }}>
            ← Все участки
          </Link>
          <h1 style={{ margin: '6px 0 4px' }}>
            №{site.id} · {site.name}
          </h1>
          <div className="muted" style={{ fontSize: 13 }}>
            {site.mix_type} · полоса {site.lane_width_m} м · слой{' '}
            {Math.round(site.layer_thickness_m * 1000)} мм · ρ {site.mix_density_t_m3} т/м³
            {site.thin_layer && ' · тонкий слой (мин. +10 °C)'}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${isRain ? 'danger' : 'ok'}`}>
              {isRain ? 'Осадки сейчас' : 'Сухо'}
            </span>{' '}
            <span className="badge info" style={{ marginLeft: 6 }}>
              Погода: {weatherSource}
            </span>{' '}
            {gw?.window ? (
              <span className="badge info" style={{ marginLeft: 6 }}>
                Окно {gw.window.duration_min} мин
              </span>
            ) : (
              <span className="badge warn" style={{ marginLeft: 6 }}>
                Зелёного окна нет
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Прогноз на 24 ч (агрегированный мок)</h3>
          <GreenWindowTimeline forecast={forecast} window={gw?.window ?? null} />
          {gw?.window ? (
            <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
              «Зелёное окно»: {new Date(gw.window.start).toLocaleString()} —{' '}
              {new Date(gw.window.end).toLocaleString()}. Доставка с АБЗ #{gw.plant_id}:{' '}
              {gw.delivery_time_min} мин. Уверенность: {Math.round(gw.confidence * 100)}%.
            </p>
          ) : (
            <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
              На ближайшие 24 часа нет интервала без осадков нужной длительности.
            </p>
          )}
        </div>
      </section>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TonnageWidget data={tonnage} />

        <div className="card">
          <h3>Альтернативные АБЗ</h3>
          {gw?.alternatives?.length ? (
            <div className="site-list">
              {gw.alternatives.map((a) => (
                <div key={a.plant_id} className="site-card">
                  <div>
                    <div className="name">АБЗ #{a.plant_id}</div>
                    <div className="meta">Доставка ~{a.delivery_time_min} мин</div>
                  </div>
                  <span className="badge info">{Math.round(a.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>Нет альтернатив.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
