import type { Site, WeatherSummary } from '@/api/types';
import { formatWeatherSourceLabel } from '@/lib/weatherSource';
import { Sparkline } from './Sparkline';
import { WeatherIcon } from './WeatherIcon';

interface Props {
  sites: Site[];
  summaries: WeatherSummary[];
  isLoading?: boolean;
  onSelect?: (siteId: number) => void;
}

function statusText(summary?: WeatherSummary): string {
  if (!summary) return 'нет данных';
  if (summary.demo_forced) return 'демо-дождь';
  if (summary.state === 'rain') return `${summary.current.precip_mm_h.toFixed(1)} мм/ч`;
  if (summary.state === 'risk') {
    return `PoP ${probabilityPct(summary)}%`;
  }
  if (summary.state === 'clear') return 'сухо';
  return 'нет данных';
}

function badgeKind(summary?: WeatherSummary): 'ok' | 'info' | 'danger' | 'warn' {
  if (!summary || summary.state === 'unknown') return 'warn';
  if (summary.state === 'rain') return 'danger';
  if (summary.state === 'risk') return 'info';
  return 'ok';
}

function sparklineColor(summary?: WeatherSummary): { line: string; fill: string } {
  if (summary?.state === 'rain') return { line: '#ff5b6f', fill: 'rgba(255,91,111,0.18)' };
  if (summary?.state === 'risk') return { line: '#4ea1ff', fill: 'rgba(78,161,255,0.18)' };
  return { line: '#5bd4a4', fill: 'rgba(91,212,164,0.18)' };
}

function probabilityPct(summary: WeatherSummary): number {
  return Math.max(0, Math.min(100, Math.round(summary.next_6h.max_precip_probability * 100)));
}

export function WeatherSummaryPanel({ sites, summaries, isLoading, onSelect }: Props) {
  if (isLoading && sites.length === 0) {
    return (
      <div className="site-list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="site-card weather-summary-card">
            <div style={{ flex: 1 }}>
              <div className="skeleton line short" />
              <div className="skeleton line medium" />
            </div>
            <div className="skeleton" style={{ width: 56, height: 22, borderRadius: 999 }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="site-list">
      {sites.map((site) => {
        const summary = summaries.find((s) => s.site_id === site.id);
        const hourly = summary?.next_6h.hourly_precip_mm_h ?? [];
        const probs = summary?.next_6h.hourly_precip_probability ?? [];
        const series = hourly.length ? hourly : probs;
        const colors = sparklineColor(summary);
        const riskPct = summary ? probabilityPct(summary) : 0;
        const currentRain = (summary?.current.precip_mm_h ?? 0) > 0.1;
        return (
          <button
            key={site.id}
            type="button"
            className="site-card weather-summary-card"
            onClick={() => onSelect?.(site.id)}
            style={{
              textAlign: 'left',
              cursor: onSelect ? 'pointer' : 'default',
              background: 'var(--c-surface-2)',
              borderColor: 'var(--c-border)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <WeatherIcon state={summary?.state ?? 'unknown'} size={16} />
                <span>Участок {site.id}</span>
              </div>
              <div className="meta" style={{ marginTop: 2 }}>
                {summary
                  ? `${summary.current.temp_c?.toFixed(1) ?? '—'} °C · ветер ${summary.current.wind_speed_ms.toFixed(1)} м/с`
                  : 'прогноз загружается…'}
              </div>
              {series.length > 0 && (
                <div className="summary-row" title="Прогноз осадков на 6 часов">
                  <Sparkline
                    values={series}
                    color={colors.line}
                    fillColor={colors.fill}
                    width={120}
                    height={22}
                    ariaLabel="Прогноз осадков на 6 часов"
                  />
                </div>
              )}
              {summary && (
                <div className="risk-bar" title={`Вероятность осадков на 6 часов: ${riskPct}%`}>
                  <div className="risk-bar__fill" style={{ width: `${riskPct}%` }} />
                </div>
              )}
              {summary && currentRain && !summary.demo_forced && (
                <div className="meta danger-text" style={{ marginTop: 4 }}>
                  Сейчас осадки {summary.current.precip_mm_h.toFixed(1)} мм/ч
                </div>
              )}
              {summary && (
                <div className="meta" style={{ marginTop: 4, fontSize: 11 }}>
                  Источник: {formatWeatherSourceLabel(summary)}
                </div>
              )}
              {summary?.demo_forced && (
                <div className="meta danger-text" style={{ marginTop: 4 }}>
                  Демо-событие поверх реальной погоды
                </div>
              )}
            </div>
            <span className={`badge ${badgeKind(summary)}`}>{statusText(summary)}</span>
          </button>
        );
      })}
    </div>
  );
}
