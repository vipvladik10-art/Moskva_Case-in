import type { Site, WeatherSummary } from '@/api/types';

export type LngLatBounds = [[number, number], [number, number]];

export interface LocalPrecipStyle {
  score: number;
  localPct: number;
  color: string;
  lineWidth: number;
  circlePx: number;
}

export function probabilityPct(summary: WeatherSummary): number {
  return Math.max(0, Math.min(100, Math.round(summary.next_6h.max_precip_probability * 100)));
}

export function precipScore(summary: WeatherSummary): number {
  const pop = summary.next_6h.max_precip_probability;
  const maxMm = Math.min(summary.next_6h.max_precip_mm_h / 0.8, 1.5);
  const currentMm = Math.min(summary.current.precip_mm_h / 0.3, 1.5);
  return pop * 0.45 + maxMm * 0.4 + currentMm * 0.15;
}

export function localPrecipColor(localPct: number): string {
  if (localPct >= 80) return '#ff335f';
  if (localPct >= 60) return '#ff8a2b';
  if (localPct >= 35) return '#ffd23f';
  return '#34d399';
}

export function localPrecipLineWidth(localPct: number, summary: WeatherSummary): number {
  const rainBoost = summary.current.precip_mm_h > 0.1 ? 2 : 0;
  return 5 + Math.round(localPct / 18) + rainBoost;
}

export function localPrecipCirclePx(localPct: number, summary: WeatherSummary): number {
  const rainBoost = summary.current.precip_mm_h > 0.1 ? 10 : 0;
  return 28 + Math.round(localPct * 0.44) + rainBoost;
}

export function buildLocalPrecipBySiteId(
  sites: Site[],
  summaryBySiteId: Map<number, WeatherSummary>,
): Map<number, LocalPrecipStyle> {
  const scored = sites
    .map((site) => {
      const summary = summaryBySiteId.get(site.id);
      return summary ? { siteId: site.id, summary, score: precipScore(summary) } : null;
    })
    .filter((item): item is { siteId: number; summary: WeatherSummary; score: number } =>
      Boolean(item),
    );

  if (scored.length === 0) {
    return new Map();
  }

  const scores = scored.map((item) => item.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const spread = max - min;

  return new Map(
    scored.map((item) => {
      const localPct =
        spread > 0.001
          ? Math.round(((item.score - min) / spread) * 100)
          : probabilityPct(item.summary);
      return [
        item.siteId,
        {
          score: item.score,
          localPct,
          color: localPrecipColor(localPct),
          lineWidth: localPrecipLineWidth(localPct, item.summary),
          circlePx: localPrecipCirclePx(localPct, item.summary),
        },
      ];
    }),
  );
}

/** Bounding box as [[west, south], [east, north]] in lng/lat. */
export function corridorBounds(sites: Site[], padDeg = 0.12): LngLatBounds | null {
  const points: [number, number][] = [];

  for (const site of sites) {
    points.push([site.location.lon, site.location.lat]);
    for (const coord of site.geometry?.coordinates ?? []) {
      points.push([coord[0], coord[1]]);
    }
  }

  if (points.length === 0) {
    return null;
  }

  let west = points[0][0];
  let east = points[0][0];
  let south = points[0][1];
  let north = points[0][1];

  for (const [lon, lat] of points) {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }

  return [
    [west - padDeg, south - padDeg],
    [east + padDeg, north + padDeg],
  ];
}

export function corridorCenter(bounds: LngLatBounds): { longitude: number; latitude: number } {
  return {
    longitude: (bounds[0][0] + bounds[1][0]) / 2,
    latitude: (bounds[0][1] + bounds[1][1]) / 2,
  };
}

export function shouldShowGlobalWeatherTiles(
  weatherLayer: string,
  useGlobalWeatherTiles: boolean,
): boolean {
  if (weatherLayer === 'none' || weatherLayer === 'precipitation') {
    return false;
  }
  return useGlobalWeatherTiles;
}
