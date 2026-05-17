import { useParams } from 'react-router-dom';
import { useForecast, useGreenWindow, useMaxTonnage } from '@/api/hooks';
import { GreenWindowTimeline } from '@/components/GreenWindowTimeline';
import { TonnageWidget } from '@/components/TonnageWidget';

export function SiteDetailsPage() {
  const { id } = useParams();
  const siteId = Number(id);
  const { data: forecast = [] } = useForecast(siteId);
  const gw = useGreenWindow(siteId);
  const tonnage = useMaxTonnage(siteId);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16, gridTemplateColumns: '2fr 1fr' }}>
      <section>
        <h1>Участок №{id}</h1>
        <GreenWindowTimeline forecast={forecast} window={gw.data?.window ?? null} />
        <button onClick={() => gw.mutate({ precip_threshold: 0.3, min_duration_min: 60 })}>
          Пересчитать «зелёное окно»
        </button>
      </section>
      <aside>
        <TonnageWidget data={tonnage.data} onClick={() => tonnage.mutate({})} />
      </aside>
    </div>
  );
}
