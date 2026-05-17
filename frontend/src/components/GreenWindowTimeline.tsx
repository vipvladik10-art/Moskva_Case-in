import type { HourlyForecast } from '@/api/types';

interface Props {
  forecast: HourlyForecast[];
  window: { start: string; end: string; duration_min: number } | null;
}

function classify(h: HourlyForecast): 'rain' | 'cold' | 'ok' {
  if (h.precip_mm_h > 0 || h.precip_probability > 0.3) return 'rain';
  if (h.temp_c < 5) return 'cold';
  return 'ok';
}

export function GreenWindowTimeline({ forecast, window }: Props) {
  if (!forecast.length) return <p className="muted">Нет данных прогноза.</p>;
  const start = window ? new Date(window.start).getTime() : null;
  const end = window ? new Date(window.end).getTime() : null;
  return (
    <div className="timeline">
      {forecast.slice(0, 24).map((h) => {
        const ts = new Date(h.valid_at).getTime();
        const inWindow = start !== null && end !== null && ts >= start && ts < end;
        const cls = classify(h);
        return (
          <div
            key={h.valid_at}
            className={`hour ${cls} ${inWindow ? 'window' : ''}`}
            title={`${new Date(h.valid_at).toLocaleString()}\n${h.temp_c.toFixed(1)} °C · ${h.precip_mm_h.toFixed(1)} мм/ч · p=${Math.round(h.precip_probability * 100)}%`}
          >
            {new Date(h.valid_at).getHours()}
          </div>
        );
      })}
    </div>
  );
}
