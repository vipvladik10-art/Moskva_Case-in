import { Link } from 'react-router-dom';
import { useSites } from '@/api/hooks';

export function SitesPage() {
  const { data: sites = [], isLoading } = useSites();
  return (
    <div style={{ padding: 16 }}>
      <h1>Участки укладки</h1>
      {isLoading && <p>Загрузка…</p>}
      <ul>
        {sites.map((s) => (
          <li key={s.id}>
            <Link to={`/sites/${s.id}`}>{s.name}</Link> — {s.mix_type}, толщина {s.layer_thickness_m * 1000} мм
          </li>
        ))}
        {!sites.length && !isLoading && <li>TODO(P1): пока пусто, добавить через POST /sites</li>}
      </ul>
    </div>
  );
}
