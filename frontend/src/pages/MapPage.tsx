import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useForecast, usePlants, useSites, useTrucks } from '@/api/hooks';

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const RAINVIEWER_META_URL = 'https://api.rainviewer.com/public/weather-maps.json';

interface RainViewerFrame {
  path: string;
  time: number;
}

interface RainViewerMeta {
  host: string;
  radar?: {
    past?: RainViewerFrame[];
    nowcast?: RainViewerFrame[];
  };
}

type RadarState = 'loading' | 'active' | 'hidden' | 'unavailable';

export function MapPage() {
  const { data: plants = [] } = usePlants();
  const { data: sites = [] } = useSites();
  const { data: trucks = [] } = useTrucks();
  const selectedWeatherSiteId = sites[1]?.id ?? sites[0]?.id ?? 1;
  const { data: forecast = [] } = useForecast(selectedWeatherSiteId, 8);
  const [showRadar, setShowRadar] = useState(true);
  const [radarTiles, setRadarTiles] = useState<string[] | null>(null);
  const [radarState, setRadarState] = useState<RadarState>('loading');
  const navigate = useNavigate();
  const weatherSource = forecast[0]?.source === 'openweather' ? 'OpenWeatherMap' : 'mock fallback';

  useEffect(() => {
    let cancelled = false;

    async function loadRadarTiles() {
      setRadarState('loading');
      try {
        const response = await fetch(RAINVIEWER_META_URL);
        if (!response.ok) {
          throw new Error(`RainViewer metadata HTTP ${response.status}`);
        }
        const meta = (await response.json()) as RainViewerMeta;
        const frame =
          meta.radar?.nowcast?.[0] ??
          meta.radar?.past?.[meta.radar.past.length - 1];
        if (!frame?.path || !meta.host) {
          throw new Error('RainViewer metadata has no radar frame');
        }
        const tileUrl = `${meta.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
        if (!cancelled) {
          setRadarTiles([tileUrl]);
          setRadarState('active');
        }
      } catch {
        if (!cancelled) {
          setRadarTiles(null);
          setRadarState('unavailable');
        }
      }
    }

    loadRadarTiles();
    return () => {
      cancelled = true;
    };
  }, []);

  const radarLabel = useMemo(() => {
    if (!showRadar) return 'Слой скрыт';
    if (radarState === 'active') return 'Радар активен';
    if (radarState === 'loading') return 'Загрузка радара';
    return 'Радар недоступен';
  }, [radarState, showRadar]);

  return (
    <div className="map-wrap">
      <Map
        initialViewState={{ longitude: 35.55, latitude: 56.9, zoom: 9.2 }}
        mapStyle={{
          version: 8,
          sources: { osm: { type: 'raster', tiles: [TILE_URL], tileSize: 256 } },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        }}
      >
        <NavigationControl position="top-right" />

        {showRadar && radarTiles && (
          <Source
            id="radar"
            type="raster"
            tiles={radarTiles}
            tileSize={256}
          >
            <Layer id="radar" type="raster" paint={{ 'raster-opacity': 0.55 }} />
          </Source>
        )}

        {plants.map((p) => (
          <Marker
            key={`p-${p.id}`}
            latitude={p.location.lat}
            longitude={p.location.lon}
            anchor="bottom"
          >
            <div className="marker plant" title={`${p.name} · ${p.capacity_t_per_hour} т/ч`}>
              АБЗ
            </div>
          </Marker>
        ))}

        {sites.map((s) => (
          <Marker
            key={`s-${s.id}`}
            latitude={s.location.lat}
            longitude={s.location.lon}
            anchor="bottom"
            onClick={() => navigate(`/sites/${s.id}`)}
          >
            <div
              className={`marker site ${s.weather_state === 'rain' ? 'rain' : ''}`}
              title={`${s.name}${s.weather_state === 'rain' ? ' (идёт дождь)' : ''}`}
            >
              {s.id}
            </div>
          </Marker>
        ))}

        {trucks
          .filter((t) => t.status === 'en_route')
          .map((t, idx) => {
            const dest = sites.find((s) => s.id === t.destination_site_id);
            const plant = plants.find((p) => p.id === t.home_plant_id);
            if (!dest || !plant) return null;
            const lat = (plant.location.lat + dest.location.lat) / 2;
            const lon = (plant.location.lon + dest.location.lon) / 2;
            return (
              <Marker key={`t-${t.id}-${idx}`} latitude={lat} longitude={lon} anchor="center">
                <div className="marker truck" title={`${t.plate} → ${dest.name}`}>
                  •
                </div>
              </Marker>
            );
          })}
      </Map>

      <div className="map-overlay">
        <div style={{ fontWeight: 600 }}>Карта операций М-11</div>
        <label>
          <input
            type="checkbox"
            checked={showRadar}
            onChange={(e) => setShowRadar(e.target.checked)}
          />{' '}
          Радар осадков
        </label>
        <div className="muted" style={{ fontSize: 11 }}>
          {radarLabel} · Погода: {weatherSource}
        </div>
        <div className="muted" style={{ fontSize: 11 }}>
          <span className="legend-dot" style={{ background: 'var(--c-warn)' }} /> АБЗ
          <span style={{ display: 'inline-block', width: 10 }} />
          <span className="legend-dot" style={{ background: 'var(--c-ok)' }} /> Участок
          <span style={{ display: 'inline-block', width: 10 }} />
          <span className="legend-dot" style={{ background: 'var(--c-danger)' }} /> Дождь
          <span style={{ display: 'inline-block', width: 10 }} />
          <span className="legend-dot" style={{ background: 'var(--c-accent)' }} /> Самосвал
        </div>
        <div className="muted" style={{ fontSize: 11 }}>
          Кликните по участку для расчётов
        </div>
      </div>
    </div>
  );
}
