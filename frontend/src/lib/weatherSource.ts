import type { WeatherSummary } from '@/api/types';

/** Человекочитаемая метка источника погодных данных для UI. */
export function formatWeatherSourceLabel(summary: WeatherSummary | undefined): string {
  if (!summary) return 'нет данных';
  if (summary.data_mode === 'demo' || summary.demo_forced) return 'демо-дождь (mock)';
  const src = (summary.source || '').toLowerCase();
  if (src.includes('openweather') || src === 'owm') return 'онлайн · OpenWeather';
  if (src.includes('open-meteo')) return 'онлайн · Open-Meteo';
  if (src.includes('mock')) return 'mock-прогноз';
  if (src && src !== 'unknown') return `онлайн · ${summary.source}`;
  return 'источник неизвестен';
}

export function weatherPollingHint(): string {
  return 'Сводка обновляется автоматически каждые ~30 с при открытой вкладке.';
}
