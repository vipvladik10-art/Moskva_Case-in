import { describe, expect, it } from 'vitest';
import type { Site, WeatherSummary } from '@/api/types';
import {
  buildLocalPrecipBySiteId,
  corridorBounds,
  corridorCenter,
  precipScore,
  shouldShowGlobalWeatherTiles,
} from './weatherMap';

function mockSummary(overrides: Partial<WeatherSummary> = {}): WeatherSummary {
  return {
    site_id: 1,
    source: 'mock',
    updated_at: new Date().toISOString(),
    current: {
      temp_c: 15,
      wind_speed_ms: 3,
      precip_mm_h: 0,
      weather_label: 'ясно',
    },
    next_6h: {
      max_precip_probability: 0.2,
      max_precip_mm_h: 0.1,
      risk_starts_at: null,
    },
    state: 'clear',
    demo_forced: false,
    ...overrides,
  };
}

const mockSite: Site = {
  id: 1,
  name: 'Test',
  location: { lat: 56.93, lon: 35.8 },
  geometry: {
    type: 'LineString',
    coordinates: [
      [35.84, 56.935],
      [35.76, 56.922],
    ],
  },
  lane_width_m: 4,
  layer_thickness_m: 0.05,
  mix_density_t_m3: 2.4,
  mix_type: 'ЩМА',
  thin_layer: false,
};

describe('precipScore', () => {
  it('ranks wetter forecast higher', () => {
    const dry = precipScore(mockSummary());
    const wet = precipScore(
      mockSummary({
        current: { temp_c: 12, wind_speed_ms: 4, precip_mm_h: 0.5, weather_label: 'дождь' },
        next_6h: { max_precip_probability: 0.9, max_precip_mm_h: 1.2, risk_starts_at: null },
        state: 'rain',
      }),
    );
    expect(wet).toBeGreaterThan(dry);
  });
});

describe('buildLocalPrecipBySiteId', () => {
  it('normalizes local percent across sites', () => {
    const summaries = new Map<number, WeatherSummary>([
      [1, mockSummary({ site_id: 1 })],
      [
        2,
        mockSummary({
          site_id: 2,
          next_6h: { max_precip_probability: 0.95, max_precip_mm_h: 1.0, risk_starts_at: null },
          state: 'risk',
        }),
      ],
    ]);
    const sites: Site[] = [
      mockSite,
      { ...mockSite, id: 2, location: { lat: 56.92, lon: 35.7 } },
    ];
    const map = buildLocalPrecipBySiteId(sites, summaries);
    expect(map.get(1)?.localPct).toBe(0);
    expect(map.get(2)?.localPct).toBe(100);
    expect(map.get(2)?.circlePx).toBeGreaterThan(map.get(1)?.circlePx ?? 0);
  });
});

describe('corridorBounds', () => {
  it('includes geometry and location with padding', () => {
    const bounds = corridorBounds([mockSite], 0.1);
    expect(bounds).not.toBeNull();
    expect(bounds![0][0]).toBeLessThan(35.76);
    expect(bounds![1][0]).toBeGreaterThan(35.84);
    const center = corridorCenter(bounds!);
    expect(center.longitude).toBeCloseTo(35.8, 1);
    expect(center.latitude).toBeCloseTo(56.928, 1);
  });

  it('returns null for empty sites', () => {
    expect(corridorBounds([])).toBeNull();
  });
});

describe('shouldShowGlobalWeatherTiles', () => {
  it('never shows global tiles for precipitation', () => {
    expect(shouldShowGlobalWeatherTiles('precipitation', true)).toBe(false);
    expect(shouldShowGlobalWeatherTiles('precipitation', false)).toBe(false);
  });

  it('shows global tiles for other layers only when enabled', () => {
    expect(shouldShowGlobalWeatherTiles('clouds', true)).toBe(true);
    expect(shouldShowGlobalWeatherTiles('clouds', false)).toBe(false);
  });
});
