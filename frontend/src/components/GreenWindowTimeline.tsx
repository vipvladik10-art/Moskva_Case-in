import type { HourlyForecast } from '@/api/types';

interface Props {
  forecast: HourlyForecast[];
  window: { start: string; end: string; duration_min: number } | null;
}

export function GreenWindowTimeline({ forecast, window }: Props) {
  if (!forecast.length) return <p>Нет данных прогноза.</p>;
  return (
    <div>
      <p>
        Окно:{' '}
        {window
          ? `${new Date(window.start).toLocaleString()} — ${new Date(window.end).toLocaleString()} (${window.duration_min} мин)`
          : 'не найдено'}
      </p>
      <div style={{ display: 'flex', gap: 2 }}>
        {forecast.map((h) => {
          const isRain = h.precip_mm_h > 0 || h.precip_probability > 0.3;
          const isCold = h.temp_c < 5;
          const color = isRain ? 'var(--c-danger)' : isCold ? 'var(--c-warn)' : 'var(--c-ok)';
          return (
            <div
              key={h.valid_at}
              title={`${new Date(h.valid_at).toLocaleString()} | ${h.temp_c}°C | ${h.precip_mm_h} мм/ч`}
              style={{ width: 18, height: 32, background: color, borderRadius: 2 }}
            />
          );
        })}
      </div>
    </div>
  );
}
