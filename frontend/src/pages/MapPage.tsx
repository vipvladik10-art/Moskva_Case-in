import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Layer, Marker, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePlants, useSites, useTrucks, useWeatherSummary } from '@/api/hooks';
import type { Site, WeatherSummary } from '@/api/types';
import { useUiStore, type WeatherLayer } from '@/store/ui';
import { WeatherIcon } from '@/components/WeatherIcon';

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OWM_KEY = import.meta.env.VITE_OWM_API_KEY ?? '';
const OWM_TILE_PROXY = '/api/v1/map-tiles';

const WEATHER_TILE_URLS: Record<Exclude<WeatherLayer, 'none'>, string> = {
  precipitation: OWM_KEY
    ? `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`
    : 'https://tilecache.rainviewer.com/v2/radar/nowcast_0/256/{z}/{x}/{y}/2/1_1.png',
  clouds: OWM_KEY
    ? `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`
    : `${OWM_TILE_PROXY}/clouds_new/{z}/{x}/{y}.png`,
  temperature: OWM_KEY
    ? `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`
    : `${OWM_TILE_PROXY}/temp_new/{z}/{x}/{y}.png`,
  wind: OWM_KEY
    ? `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`
    : `${OWM_TILE_PROXY}/wind_new/{z}/{x}/{y}.png`,
};

const LAYER_LABELS: Record<WeatherLayer, string> = {
  none: 'Нет',
  precipitation: 'Осадки',
  clouds: 'Облачность',
  temperature: 'Температура',
  wind: 'Ветер',
};

function siteState(s: Site, summary?: WeatherSummary): WeatherSummary['state'] {
  if (s.weather_state === 'rain') return 'rain';
  return summary?.state ?? 'unknown';
}

function stateColor(state: WeatherSummary['state']): string {
  if (state === 'rain') return '#ff5b6f';
  if (state === 'risk') return '#4ea1ff';
  if (state === 'clear') return '#5bd4a4';
  return '#97a3bf';
}

function stateLabel(summary?: WeatherSummary): string {
  if (!summary) return 'нет данных';
  if (summary.demo_forced) return 'демо-дождь';
  if (summary.state === 'rain') return `${summary.current.precip_mm_h.toFixed(1)} мм/ч`;
  if (summary.state === 'risk') return `PoP ${probabilityPct(summary)}%`;
  if (summary.state === 'clear') return 'сухо';
  return 'нет данных';
}

function probabilityPct(summary: WeatherSummary): number {
  return Math.max(0, Math.min(100, Math.round(summary.next_6h.max_precip_probability * 100)));
}

function cloudPct(summary: WeatherSummary): number {
  if (typeof summary.current.clouds_pct === 'number') {
    return Math.max(0, Math.min(100, Math.round(summary.current.clouds_pct)));
  }
  const label = summary.current.weather_label.toLowerCase();
  if (label.includes('пасмур') || label.includes('overcast')) return 95;
  if (label.includes('облач') || label.includes('cloud')) return 70;
  if (label.includes('ясно') || label.includes('clear')) return 10;
  return summary.state === 'rain' ? 90 : 35;
}

function windArrow(deg?: number | null): string {
  if (typeof deg !== 'number') return '•';
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round((((deg % 360) + 360) % 360) / 45) % arrows.length];
}

function layerMetricLabel(layer: WeatherLayer, summary: WeatherSummary): string {
  if (layer === 'clouds') return `Обл. ${cloudPct(summary)}%`;
  if (layer === 'temperature') {
    return `${summary.current.temp_c?.toFixed(1) ?? '—'} °C`;
  }
  if (layer === 'wind') {
    return `${windArrow(summary.current.wind_deg)} ${summary.current.wind_speed_ms.toFixed(1)} м/с`;
  }
  return stateLabel(summary);
}

function layerMetricTitle(layer: WeatherLayer, site: Site, summary: WeatherSummary): string {
  if (layer === 'clouds') {
    return `${site.name}: облачность ${cloudPct(summary)}%, ${summary.current.weather_label}`;
  }
  if (layer === 'temperature') {
    return `${site.name}: температура ${summary.current.temp_c?.toFixed(1) ?? '—'} °C`;
  }
  if (layer === 'wind') {
    return `${site.name}: ветер ${summary.current.wind_speed_ms.toFixed(1)} м/с`;
  }
  return `${site.name}: ${stateLabel(summary)}`;
}

function formatRiskTime(value: string | null): string {
  if (!value) return 'нет риска';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MapPage() {
  const { data: plants = [] } = usePlants();
  const { data: sites = [] } = useSites();
  const { data: trucks = [] } = useTrucks();
  const { data: weatherSummary = [] } = useWeatherSummary();
  const {
    weatherLayer,
    showSiteLines,
    showWeatherBadges,
    weatherLayerOpacity,
    setWeatherLayer,
    setShowSiteLines,
    setShowWeatherBadges,
    setWeatherLayerOpacity,
  } = useUiStore();
  const [selectedWeatherSiteId, setSelectedWeatherSiteId] = useState<number | null>(null);
  const navigate = useNavigate();

  const weatherSource =
    weatherSummary[0]?.source === 'openweather' ? 'OpenWeatherMap' : 'mock fallback';

  const selectedSite: Site | undefined = sites.find((s) => s.id === selectedWeatherSiteId);
  const selectedSummary = weatherSummary.find((w) => w.site_id === selectedWeatherSiteId);

  const sitesGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: sites
        .filter((s): s is Site & { geometry: NonNullable<Site['geometry']> } => Boolean(s.geometry))
        .map((s) => {
          const summary = weatherSummary.find((w) => w.site_id === s.id);
          const state = siteState(s, summary);
          return {
            type: 'Feature' as const,
            properties: {
              id: s.id,
              name: s.name,
              state,
              color: stateColor(state),
            },
            geometry: s.geometry,
          };
        }),
    }),
    [sites, weatherSummary],
  );

  const weatherTileUrl =
    weatherLayer !== 'none' ? WEATHER_TILE_URLS[weatherLayer] : '';
  const weatherLayerEnabled = weatherTileUrl.length > 0;

  const mapStyle = useMemo(
    () => ({
      version: 8 as const,
      sources: {
        osm: {
          type: 'raster' as const,
          tiles: [TILE_URL],
          tileSize: 256,
          attribution: '© OpenStreetMap',
        },
      },
      layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
    }),
    [],
  );

  return (
    <div className="map-wrap">
      <Map
        initialViewState={{ longitude: 35.65, latitude: 56.945, zoom: 9.35 }}
        mapStyle={mapStyle}
      >
        <NavigationControl position="top-right" />

        {weatherLayerEnabled && (
          <Source
            key={weatherTileUrl}
            id="weather-tiles"
            type="raster"
            tiles={[weatherTileUrl]}
            tileSize={256}
            attribution={
              weatherLayer === 'precipitation' && !OWM_KEY ? '© RainViewer' : '© OpenWeatherMap'
            }
          >
            <Layer
              id="weather-tiles-layer"
              type="raster"
              paint={{ 'raster-opacity': weatherLayerOpacity }}
            />
          </Source>
        )}

        {!['none', 'precipitation'].includes(weatherLayer) &&
          sites.map((s) => {
            const summary = weatherSummary.find((w) => w.site_id === s.id);
            if (!summary) return null;
            return (
              <Marker
                key={`metric-${weatherLayer}-${s.id}`}
                latitude={s.location.lat}
                longitude={s.location.lon}
                anchor="center"
              >
                <button
                  className={`weather-metric-marker ${weatherLayer}`}
                  title={layerMetricTitle(weatherLayer, s, summary)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedWeatherSiteId(s.id);
                  }}
                >
                  {layerMetricLabel(weatherLayer, summary)}
                </button>
              </Marker>
            );
          })}

        {showSiteLines && sitesGeoJson.features.length > 0 && (
          <Source id="m11-sites" type="geojson" data={sitesGeoJson}>
            <Layer
              id="m11-sites-casing"
              type="line"
              paint={{
                'line-color': '#0b1220',
                'line-width': 9,
                'line-opacity': 0.55,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id="m11-sites-line"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 6,
                'line-opacity': 0.95,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        {showWeatherBadges &&
          sites.map((s) => {
            const summary = weatherSummary.find((w) => w.site_id === s.id);
            const state = siteState(s, summary);
            const title = summary
              ? `${s.name}: ${summary.current.temp_c?.toFixed(1) ?? '—'} °C, осадки ${summary.current.precip_mm_h.toFixed(1)} мм/ч, PoP 6 ч ${probabilityPct(summary)}%`
              : `${s.name}: прогноз загружается`;
            return (
              <Marker
                key={`weather-${s.id}`}
                latitude={s.location.lat}
                longitude={s.location.lon}
                anchor="left"
              >
                <button
                  className={`weather-badge ${state}`}
                  title={title}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedWeatherSiteId(s.id);
                  }}
                >
                  <WeatherIcon state={state} size={14} />
                  <span>{stateLabel(summary)}</span>
                </button>
              </Marker>
            );
          })}

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

        {sites.map((s) => {
          const summary = weatherSummary.find((w) => w.site_id === s.id);
          const state = siteState(s, summary);
          return (
            <Marker
              key={`s-${s.id}`}
              latitude={s.location.lat}
              longitude={s.location.lon}
              anchor="bottom"
              onClick={() => navigate(`/sites/${s.id}`)}
            >
              <div
                className={`marker site ${state}`}
                title={`${s.name}${state === 'rain' ? ' (идёт дождь)' : ''}`}
                style={{ background: stateColor(state) }}
              >
                {s.id}
              </div>
            </Marker>
          );
        })}

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

        {selectedSite && selectedSummary && (
          <Popup
            latitude={selectedSite.location.lat}
            longitude={selectedSite.location.lon}
            anchor="top"
            closeButton
            closeOnClick={false}
            onClose={() => setSelectedWeatherSiteId(null)}
          >
            <div className="weather-popup">
              <div className="weather-popup__header">
                <WeatherIcon state={selectedSummary.state} size={22} />
                <strong>{selectedSite.name}</strong>
              </div>
              <span
                className={`badge ${selectedSummary.state === 'rain' ? 'danger' : selectedSummary.state === 'risk' ? 'info' : 'ok'}`}
              >
                {selectedSummary.demo_forced
                  ? 'демо-событие'
                  : selectedSummary.state === 'rain'
                    ? 'дождь'
                    : selectedSummary.state === 'risk'
                      ? 'риск'
                      : 'сухо'}
              </span>
              {selectedSummary.demo_forced && (
                <p className="demo-note">Демо-событие: принудительное закрытие зелёного окна.</p>
              )}
              <dl>
                <dt>Сейчас</dt>
                <dd>
                  {selectedSummary.current.weather_label}, {selectedSummary.current.temp_c?.toFixed(1) ?? '—'} °C,
                  осадки {selectedSummary.current.precip_mm_h.toFixed(1)} мм/ч
                </dd>
                <dt>Ветер</dt>
                <dd>
                  {windArrow(selectedSummary.current.wind_deg)}{' '}
                  {selectedSummary.current.wind_speed_ms.toFixed(1)} м/с
                </dd>
                <dt>Облачность</dt>
                <dd>{cloudPct(selectedSummary)}%</dd>
                <dt>Ближайшие 6 ч</dt>
                <dd>
                  PoP {probabilityPct(selectedSummary)}%, максимум{' '}
                  {selectedSummary.next_6h.max_precip_mm_h.toFixed(1)} мм/ч, старт{' '}
                  {formatRiskTime(selectedSummary.next_6h.risk_starts_at)}
                </dd>
                <dt>Источник</dt>
                <dd>
                  {selectedSummary.source === 'openweather' ? 'OpenWeatherMap' : selectedSummary.source} ·{' '}
                  {new Date(selectedSummary.updated_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </dl>
              <button
                className="ghost popup-cta"
                onClick={() => navigate(`/sites/${selectedSite.id}`)}
              >
                Открыть участок →
              </button>
            </div>
          </Popup>
        )}
      </Map>

      <div className="map-overlay">
        <div className="map-overlay__title">Карта операций М-11</div>

        <div className="map-overlay__group">
          <div className="map-overlay__group-title">Слой погоды</div>
          <div className="layer-switcher">
            {(Object.keys(LAYER_LABELS) as WeatherLayer[]).map((key) => {
              return (
                <button
                  key={key}
                  className={`chip ${weatherLayer === key ? 'active' : ''}`}
                  onClick={() => setWeatherLayer(key)}
                  title={`Показать слой: ${LAYER_LABELS[key]}`}
                >
                  {LAYER_LABELS[key]}
                </button>
              );
            })}
          </div>
          {weatherLayer !== 'none' && weatherLayerEnabled && (
            <label className="opacity-row">
              <span className="muted" style={{ fontSize: 11 }}>
                Прозрачность
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={weatherLayerOpacity}
                onChange={(e) => setWeatherLayerOpacity(parseFloat(e.target.value))}
              />
            </label>
          )}
          {!OWM_KEY && weatherLayer === 'precipitation' && (
            <div className="muted" style={{ fontSize: 10, lineHeight: 1.3 }}>
              Источник: RainViewer (бесплатно). Для OWM-слоёв задайте{' '}
              <code>OPENWEATHER_API_KEY</code> на backend.
            </div>
          )}
          {!['none', 'precipitation'].includes(weatherLayer) && (
            <div className="muted" style={{ fontSize: 10, lineHeight: 1.3 }}>
              Слой {LAYER_LABELS[weatherLayer]}: OpenWeatherMap
              {OWM_KEY ? ' напрямую.' : ' через backend-прокси.'} Если он пустой,
              проверьте ключ OWM.
            </div>
          )}
        </div>

        <div className="map-overlay__group">
          <div className="map-overlay__group-title">Отображение</div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showSiteLines}
              onChange={(e) => setShowSiteLines(e.target.checked)}
            />
            <span>Линии участков М-11</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showWeatherBadges}
              onChange={(e) => setShowWeatherBadges(e.target.checked)}
            />
            <span>Бейджи погоды</span>
          </label>
        </div>

        <div className="map-overlay__group">
          <div className="map-overlay__group-title">Легенда</div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: 'var(--c-warn)' }} /> АБЗ
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: 'var(--c-ok)' }} /> Сухо
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: 'var(--c-accent)' }} /> Риск 6 ч
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: 'var(--c-danger)' }} /> Дождь / демо
          </div>
        </div>

        <div className="muted" style={{ fontSize: 10 }}>
          Погода: {weatherSource} · клик по участку — расчёты
        </div>
      </div>
    </div>
  );
}
