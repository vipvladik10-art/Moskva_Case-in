import { Link } from 'react-router-dom';
import { useSites } from '@/api/hooks';

export function SitesPage() {
  const { data: sites = [], isLoading } = useSites();

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: '0 0 14px' }}>Участки укладки</h1>
      {isLoading && <p className="muted">Загрузка…</p>}
      <div className="site-list">
        {sites.map((s) => (
          <Link key={s.id} to={`/sites/${s.id}`} className="site-card">
            <div>
              <div className="name">
                №{s.id} · {s.name}
              </div>
              <div className="meta">
                {s.mix_type} · ширина {s.lane_width_m} м · толщина{' '}
                {Math.round(s.layer_thickness_m * 1000)} мм
                {s.thin_layer && ' · тонкий слой'}
              </div>
            </div>
            <span className={`badge ${s.weather_state === 'rain' ? 'danger' : 'ok'}`}>
              {s.weather_state === 'rain' ? 'Дождь' : 'Ясно'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
