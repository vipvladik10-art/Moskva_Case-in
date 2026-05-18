import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  useCreateMapMarker,
  useCreatePlant,
  useCreateSite,
  useDeleteMapMarker,
  useDeletePlant,
  useDeleteSite,
  useMapMarkers,
  usePlants,
  useSites,
  useTrucks,
  useUpdateMapMarker,
  useUpdatePlant,
  useUpdateSite,
  useWeatherSummary,
} from '@/api/hooks';
import { api } from '@/api/client';
import type { MapMarker, Plant, Site, WeatherSummary } from '@/api/types';
import { useAuthStore } from '@/store/auth';
import { useAdminUndo } from '@/store/adminUndo';
import {
  deleteActionLabel,
  deleteConfirmMessage,
  selectionLabel,
} from '@/lib/mapCatalogLabels';
import {
  buildLocalPrecipBySiteId,
  corridorBounds,
  corridorCenter,
  probabilityPct,
  shouldShowGlobalWeatherTiles,
} from '@/lib/weatherMap';
import { useUiStore, type MapEditEntityType as EditType, type WeatherLayer } from '@/store/ui';
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
    showLocalRiskZones,
    useGlobalWeatherTiles,
    weatherLayerOpacity,
    mapEditMode,
    mapEditEntityType,
    setWeatherLayer,
    setShowSiteLines,
    setShowWeatherBadges,
    setShowLocalRiskZones,
    setUseGlobalWeatherTiles,
    setWeatherLayerOpacity,
    setMapEditMode,
    setMapEditEntityType,
  } = useUiStore();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [selectedWeatherSiteId, setSelectedWeatherSiteId] = useState<number | null>(null);
  const [editSelection, setEditSelection] = useState<{
    type: EditType;
    id: number;
    name: string;
  } | null>(null);
  const mapRef = useRef<MapRef>(null);
  const hasInitialFit = useRef(false);
  const ignoreNextMapClick = useRef(false);
  const dragOriginRef = useRef<{
    type: EditType;
    id: number;
    lat: number;
    lon: number;
    label: string;
  } | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const pushUndo = useAdminUndo((s) => s.push);
  const lastUndoMessage = useAdminUndo((s) => s.lastMessage);
  const appliedFocusRef = useRef('');

  const invalidateCatalog = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sites'] });
    void queryClient.invalidateQueries({ queryKey: ['plants'] });
    void queryClient.invalidateQueries({ queryKey: ['map-markers'] });
    void queryClient.invalidateQueries({ queryKey: ['weather-summary'] });
  }, [queryClient]);

  const { data: mapMarkers = [] } = useMapMarkers();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();
  const createPlant = useCreatePlant();
  const updatePlant = useUpdatePlant();
  const deletePlant = useDeletePlant();
  const createMarker = useCreateMapMarker();
  const updateMarker = useUpdateMapMarker();
  const deleteMarker = useDeleteMapMarker();

  const weatherSource =
    weatherSummary[0]?.source === 'openweather' ? 'OpenWeatherMap' : 'mock fallback';

  const summaryBySiteId = useMemo(
    () => new globalThis.Map(weatherSummary.map((summary) => [summary.site_id, summary])),
    [weatherSummary],
  );

  const localPrecipBySiteId = useMemo(
    () => buildLocalPrecipBySiteId(sites, summaryBySiteId),
    [sites, summaryBySiteId],
  );

  const corridorBBox = useMemo(() => corridorBounds(sites, 0.12), [sites]);
  const fitCorridorBBox = useMemo(() => corridorBounds(sites, 0.4), [sites]);
  const initialViewState = useMemo(() => {
    const center = corridorBBox ? corridorCenter(corridorBBox) : { longitude: 35.8, latitude: 56.93 };
    return { ...center, zoom: 10.8 };
  }, [corridorBBox]);

  const fitCorridor = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !fitCorridorBBox) return;
    map.fitBounds(fitCorridorBBox, { padding: 80, maxZoom: 14, duration: 600 });
  }, [fitCorridorBBox]);

  useEffect(() => {
    if (hasInitialFit.current || !fitCorridorBBox) return;
    hasInitialFit.current = true;
    fitCorridor();
  }, [fitCorridorBBox, fitCorridor]);

  useEffect(() => {
    if (searchParams.get('edit') === '1' && isAdmin) {
      setMapEditMode(true);
    }
  }, [searchParams, isAdmin, setMapEditMode]);

  useEffect(() => {
    const focus = searchParams.get('focus');
    const focusType = searchParams.get('type') as EditType | null;
    if (!focus || !focusType) {
      appliedFocusRef.current = '';
      return;
    }
    const focusKey = `${focusType}:${focus}`;
    if (appliedFocusRef.current === focusKey) return;

    const id = Number(focus);
    if (focusType === 'site') {
      const site = sites.find((s) => s.id === id);
      if (!site) return;
      appliedFocusRef.current = focusKey;
      mapRef.current?.flyTo({ center: [site.location.lon, site.location.lat], zoom: 12 });
      setEditSelection({ type: 'site', id, name: site.name });
      setMapEditEntityType('site');
    } else if (focusType === 'plant') {
      const plant = plants.find((p) => p.id === id);
      if (!plant) return;
      appliedFocusRef.current = focusKey;
      mapRef.current?.flyTo({ center: [plant.location.lon, plant.location.lat], zoom: 12 });
      setEditSelection({ type: 'plant', id, name: plant.name });
      setMapEditEntityType('plant');
    } else if (focusType === 'marker') {
      const marker = mapMarkers.find((m) => m.id === id);
      if (!marker) return;
      appliedFocusRef.current = focusKey;
      mapRef.current?.flyTo({ center: [marker.lon, marker.lat], zoom: 12 });
      setEditSelection({ type: 'marker', id, name: marker.name });
      setMapEditEntityType('marker');
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('focus');
        next.delete('type');
        return next;
      },
      { replace: true },
    );
  }, [
    searchParams,
    sites,
    plants,
    mapMarkers,
    setMapEditEntityType,
    setSearchParams,
  ]);

  const recordMoveUndo = useCallback(
    (
      type: EditType,
      id: number,
      label: string,
      before: { lat: number; lon: number },
      after: { lat: number; lon: number },
    ) => {
      if (before.lat === after.lat && before.lon === after.lon) return;
      pushUndo({
        label: `Перемещение: ${label}`,
        run: async () => {
          if (type === 'site') {
            await api.patch(`/sites/${id}`, { location: before });
          } else if (type === 'plant') {
            await api.patch(`/plants/${id}`, { location: before });
          } else {
            await api.patch(`/map-markers/${id}`, { lat: before.lat, lon: before.lon });
          }
          invalidateCatalog();
        },
      });
    },
    [pushUndo, invalidateCatalog],
  );

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      if (!mapEditMode) return;
      if (ignoreNextMapClick.current) {
        ignoreNextMapClick.current = false;
        return;
      }
      const { lng, lat } = event.lngLat;
      const defaultName =
        mapEditEntityType === 'site'
          ? `Участок ${sites.length + 1}`
          : mapEditEntityType === 'plant'
            ? `АБЗ ${plants.length + 1}`
            : `Метка ${mapMarkers.length + 1}`;

      if (mapEditEntityType === 'site') {
        createSite.mutate(
          { name: defaultName, location: { lat, lon: lng } },
          {
            onSuccess: (created) => {
              pushUndo({
                label: `Добавлен ${created.name}`,
                run: async () => {
                  await api.delete(`/sites/${created.id}`);
                  invalidateCatalog();
                },
              });
            },
          },
        );
      } else if (mapEditEntityType === 'plant') {
        createPlant.mutate(
          { name: defaultName, location: { lat, lon: lng } },
          {
            onSuccess: (created) => {
              pushUndo({
                label: `Добавлен ${created.name}`,
                run: async () => {
                  await api.delete(`/plants/${created.id}`);
                  invalidateCatalog();
                },
              });
            },
          },
        );
      } else {
        createMarker.mutate(
          { name: defaultName, lat, lon: lng },
          {
            onSuccess: (created) => {
              pushUndo({
                label: `Добавлена ${created.name}`,
                run: async () => {
                  await api.delete(`/map-markers/${created.id}`);
                  invalidateCatalog();
                },
              });
            },
          },
        );
      }
    },
    [
      mapEditMode,
      mapEditEntityType,
      sites.length,
      plants.length,
      mapMarkers.length,
      createSite,
      createPlant,
      createMarker,
      pushUndo,
      invalidateCatalog,
    ],
  );

  const handleDeleteSelection = useCallback(() => {
    if (!editSelection) return;
    if (!window.confirm(deleteConfirmMessage(editSelection.type, editSelection.name))) return;

    if (editSelection.type === 'site') {
      const site = sites.find((s) => s.id === editSelection.id);
      if (!site) return;
      const snapshot = structuredClone(site) as Site;
      deleteSite.mutate(editSelection.id, {
        onSuccess: () => {
          setEditSelection(null);
          pushUndo({
            label: `Удалён ${snapshot.name}`,
            run: async () => {
              await api.post('/sites', {
                name: snapshot.name,
                location: snapshot.location,
                geometry: snapshot.geometry,
                lane_width_m: snapshot.lane_width_m,
                layer_thickness_m: snapshot.layer_thickness_m,
                mix_density_t_m3: snapshot.mix_density_t_m3,
                mix_type: snapshot.mix_type,
                thin_layer: snapshot.thin_layer,
                preferred_plant_id: snapshot.preferred_plant_id,
              });
              invalidateCatalog();
            },
          });
        },
      });
    } else if (editSelection.type === 'plant') {
      const plant = plants.find((p) => p.id === editSelection.id);
      if (!plant) return;
      const snapshot = structuredClone(plant) as Plant;
      deletePlant.mutate(editSelection.id, {
        onSuccess: () => {
          setEditSelection(null);
          pushUndo({
            label: `Удалён ${snapshot.name}`,
            run: async () => {
              await api.post('/plants', {
                name: snapshot.name,
                location: snapshot.location,
                capacity_t_per_hour: snapshot.capacity_t_per_hour,
              });
              invalidateCatalog();
            },
          });
        },
      });
    } else {
      const marker = mapMarkers.find((m) => m.id === editSelection.id);
      if (!marker) return;
      const snapshot = structuredClone(marker) as MapMarker;
      deleteMarker.mutate(editSelection.id, {
        onSuccess: () => {
          setEditSelection(null);
          pushUndo({
            label: `Удалена ${snapshot.name}`,
            run: async () => {
              await api.post('/map-markers', {
                name: snapshot.name,
                lat: snapshot.lat,
                lon: snapshot.lon,
                notes: snapshot.notes,
              });
              invalidateCatalog();
            },
          });
        },
      });
    }
  }, [
    editSelection,
    sites,
    plants,
    mapMarkers,
    deleteSite,
    deletePlant,
    deleteMarker,
    pushUndo,
    invalidateCatalog,
  ]);

  const selectedSite: Site | undefined = sites.find((s) => s.id === selectedWeatherSiteId);
  const selectedSummary = selectedWeatherSiteId
    ? summaryBySiteId.get(selectedWeatherSiteId)
    : undefined;
  const selectedLocalPrecip = selectedWeatherSiteId
    ? localPrecipBySiteId.get(selectedWeatherSiteId)
    : undefined;

  const sitesGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: sites
        .filter((s): s is Site & { geometry: NonNullable<Site['geometry']> } => Boolean(s.geometry))
        .map((s) => {
          const summary = summaryBySiteId.get(s.id);
          const localPrecip = localPrecipBySiteId.get(s.id);
          const state = siteState(s, summary);
          const isLocalPrecip = weatherLayer === 'precipitation' && localPrecip;
          return {
            type: 'Feature' as const,
            properties: {
              id: s.id,
              name: s.name,
              state,
              color: isLocalPrecip ? localPrecip.color : stateColor(state),
              lineWidth: isLocalPrecip ? localPrecip.lineWidth : 6,
              localPrecipPct: localPrecip?.localPct ?? null,
            },
            geometry: s.geometry,
          };
        }),
    }),
    [sites, summaryBySiteId, localPrecipBySiteId, weatherLayer],
  );

  const weatherTileUrl =
    weatherLayer !== 'none' ? WEATHER_TILE_URLS[weatherLayer] : '';
  const globalRasterEnabled =
    weatherTileUrl.length > 0 &&
    shouldShowGlobalWeatherTiles(weatherLayer, useGlobalWeatherTiles);

  const showRiskCircles = showLocalRiskZones && weatherLayer !== 'none';

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
        ref={mapRef}
        initialViewState={initialViewState}
        minZoom={6}
        maxZoom={18}
        dragPan
        scrollZoom
        touchZoomRotate
        doubleClickZoom
        mapStyle={mapStyle}
        cursor={mapEditMode ? 'crosshair' : 'grab'}
        onClick={handleMapClick}
      >
        <NavigationControl position="top-right" />

        {globalRasterEnabled && (
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

        {showRiskCircles &&
          sites.map((s) => {
            const summary = summaryBySiteId.get(s.id);
            const localPrecip = localPrecipBySiteId.get(s.id);
            if (!summary || !localPrecip) return null;
            const state = siteState(s, summary);
            const size = localPrecip.circlePx;
            return (
              <Marker
                key={`precip-circle-${s.id}`}
                latitude={s.location.lat}
                longitude={s.location.lon}
                anchor="center"
              >
                <div className="precip-circle-wrap" title={`Локальный риск ${localPrecip.localPct}%`}>
                    <div
                    className={`precip-circle ${state}`}
                    style={{
                      width: size,
                      height: size,
                      borderColor: localPrecip.color,
                      background: `${localPrecip.color}33`,
                    }}
                  />
                  {summary.current.precip_mm_h > 0.05 && (
                    <span className="precip-circle__label">
                      {summary.current.precip_mm_h.toFixed(1)} мм/ч
                    </span>
                  )}
                </div>
              </Marker>
            );
          })}

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
                'line-width': ['get', 'lineWidth'],
                'line-opacity': 0.95,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        {showWeatherBadges &&
          sites.map((s) => {
            const summary = summaryBySiteId.get(s.id);
            const localPrecip = localPrecipBySiteId.get(s.id);
            const isLocalPrecip = weatherLayer === 'precipitation' && summary && localPrecip;
            const state = siteState(s, summary);
            const title = summary
              ? `${s.name}: осадки ${summary.current.precip_mm_h.toFixed(1)} мм/ч, максимум ${summary.next_6h.max_precip_mm_h.toFixed(1)} мм/ч, PoP 6 ч ${probabilityPct(summary)}%${
                  localPrecip ? `, локальный риск ${localPrecip.localPct}%` : ''
                }`
              : `${s.name}: прогноз загружается`;
            return (
              <Marker
                key={`weather-${s.id}`}
                latitude={s.location.lat}
                longitude={s.location.lon}
                anchor="left"
              >
                <button
                  className={`weather-badge ${state} ${isLocalPrecip ? 'local-precip' : ''}`}
                  title={title}
                  style={
                    isLocalPrecip
                      ? {
                          background: `linear-gradient(135deg, ${localPrecip.color}, ${localPrecip.color}cc)`,
                          borderColor: 'rgba(255, 255, 255, 0.95)',
                        }
                      : undefined
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedWeatherSiteId(s.id);
                  }}
                >
                  <WeatherIcon state={state} size={14} />
                  <span>
                    {isLocalPrecip
                      ? `PoP ${probabilityPct(summary)}% · лок ${localPrecip.localPct}%`
                      : stateLabel(summary)}
                  </span>
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
            draggable={mapEditMode}
            onDragStart={() => {
              dragOriginRef.current = {
                type: 'plant',
                id: p.id,
                lat: p.location.lat,
                lon: p.location.lon,
                label: p.name,
              };
            }}
            onDragEnd={(e) => {
              const origin = dragOriginRef.current;
              const after = { lat: e.lngLat.lat, lon: e.lngLat.lng };
              updatePlant.mutate(
                { id: p.id, payload: { location: after } },
                {
                  onSuccess: () => {
                    if (origin && origin.id === p.id) {
                      recordMoveUndo('plant', p.id, p.name, origin, after);
                    }
                  },
                },
              );
            }}
          >
            <div
              className={`marker plant ${editSelection?.type === 'plant' && editSelection.id === p.id ? 'selected' : ''}`}
              title={`${p.name} · ${p.capacity_t_per_hour} т/ч`}
              onClick={(e) => {
                if (!mapEditMode) return;
                e.stopPropagation();
                ignoreNextMapClick.current = true;
                setEditSelection({ type: 'plant', id: p.id, name: p.name });
              }}
            >
              АБЗ
            </div>
          </Marker>
        ))}

        {mapMarkers.map((m: MapMarker) => (
          <Marker
            key={`m-${m.id}`}
            latitude={m.lat}
            longitude={m.lon}
            anchor="center"
            draggable={mapEditMode}
            onDragStart={() => {
              dragOriginRef.current = {
                type: 'marker',
                id: m.id,
                lat: m.lat,
                lon: m.lon,
                label: m.name,
              };
            }}
            onDragEnd={(e) => {
              const origin = dragOriginRef.current;
              const after = { lat: e.lngLat.lat, lon: e.lngLat.lng };
              updateMarker.mutate(
                { id: m.id, payload: after },
                {
                  onSuccess: () => {
                    if (origin && origin.id === m.id) {
                      recordMoveUndo('marker', m.id, m.name, origin, after);
                    }
                  },
                },
              );
            }}
          >
            <div
              className={`marker custom ${editSelection?.type === 'marker' && editSelection.id === m.id ? 'selected' : ''}`}
              title={m.name}
              onClick={(e) => {
                if (!mapEditMode) return;
                e.stopPropagation();
                ignoreNextMapClick.current = true;
                setEditSelection({ type: 'marker', id: m.id, name: m.name });
              }}
            >
              ★
            </div>
          </Marker>
        ))}

        {sites.map((s) => {
          const summary = summaryBySiteId.get(s.id);
          const state = siteState(s, summary);
          const localPrecip = localPrecipBySiteId.get(s.id);
          return (
            <Marker
              key={`s-${s.id}`}
              latitude={s.location.lat}
              longitude={s.location.lon}
              anchor="bottom"
              draggable={mapEditMode}
              onDragStart={() => {
                dragOriginRef.current = {
                  type: 'site',
                  id: s.id,
                  lat: s.location.lat,
                  lon: s.location.lon,
                  label: s.name,
                };
              }}
              onDragEnd={(e) => {
                const origin = dragOriginRef.current;
                const after = { lat: e.lngLat.lat, lon: e.lngLat.lng };
                updateSite.mutate(
                  { id: s.id, payload: { location: after } },
                  {
                    onSuccess: () => {
                      if (origin && origin.id === s.id) {
                        recordMoveUndo('site', s.id, s.name, origin, after);
                      }
                    },
                  },
                );
              }}
            >
              <div
                className={`marker site ${state} ${editSelection?.type === 'site' && editSelection.id === s.id ? 'selected' : ''}`}
                title={`${s.name}${state === 'rain' ? ' (идёт дождь)' : ''}`}
                style={{
                  background:
                    weatherLayer === 'precipitation' && localPrecip
                      ? localPrecip.color
                      : stateColor(state),
                }}
                onClick={(e) => {
                  if (mapEditMode) {
                    e.stopPropagation();
                    ignoreNextMapClick.current = true;
                    setEditSelection({ type: 'site', id: s.id, name: s.name });
                    return;
                  }
                  navigate(`/sites/${s.id}`);
                }}
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
                {selectedLocalPrecip && (
                  <>
                    <dt>Локально по М-11</dt>
                    <dd>индекс риска {selectedLocalPrecip.localPct}%</dd>
                  </>
                )}
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
          <div className="map-overlay__group-title">Карта</div>
          <button type="button" className="ghost" onClick={fitCorridor} style={{ width: '100%' }}>
            Вписать коридор
          </button>
          {isAdmin ? (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={mapEditMode}
                onChange={(e) => {
                  setMapEditMode(e.target.checked);
                  if (!e.target.checked) setEditSelection(null);
                }}
              />
              <span>Режим редактирования</span>
            </label>
          ) : (
            <p className="map-overlay__hint" style={{ margin: 0 }}>
              Редактирование карты — только для администратора.
            </p>
          )}
          {mapEditMode && isAdmin && (
            <>
              <p className="map-overlay__hint" style={{ margin: 0 }}>
                Клик — добавить, перетаскивание — сдвиг. Ctrl+Z — отмена последнего действия.
              </p>
              {lastUndoMessage && (
                <p className="muted" style={{ margin: 0, fontSize: 11 }}>
                  {lastUndoMessage}
                </p>
              )}
              <select
                value={mapEditEntityType}
                onChange={(e) => setMapEditEntityType(e.target.value as EditType)}
                style={{
                  width: '100%',
                  background: 'var(--c-surface-2)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text)',
                  padding: '6px 8px',
                  borderRadius: 8,
                }}
              >
                <option value="site">Участок</option>
                <option value="plant">АБЗ</option>
                <option value="marker">Своя метка</option>
              </select>
              {editSelection && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {selectionLabel(editSelection.type, editSelection.name)}
                  </span>
                  <button type="button" className="ghost danger-text" onClick={handleDeleteSelection}>
                    {deleteActionLabel(editSelection.type)}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

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
          {globalRasterEnabled && (
            <label className="opacity-row">
              <span className="muted" style={{ fontSize: 11 }}>
                Прозрачность OWM
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
          {weatherLayer === 'precipitation' && (
            <p className="map-overlay__hint">
              Осадки: локальный индекс по участкам М-11, без регионального радара.
            </p>
          )}
          {!['none', 'precipitation'].includes(weatherLayer) && (
            <p className="map-overlay__hint">
              Слой {LAYER_LABELS[weatherLayer]}: локальные подписи на участках.
              {globalRasterEnabled
                ? ' Региональный OWM включён.'
                : ' Включите «Региональный слой OWM» для фоновых тайлов.'}
            </p>
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
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showLocalRiskZones}
              onChange={(e) => setShowLocalRiskZones(e.target.checked)}
            />
            <span>Локальные зоны риска</span>
          </label>
          {!['none', 'precipitation'].includes(weatherLayer) && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={useGlobalWeatherTiles}
                onChange={(e) => setUseGlobalWeatherTiles(e.target.checked)}
              />
              <span>Региональный слой OWM</span>
            </label>
          )}
        </div>

        <div className="map-overlay__group">
          <div className="map-overlay__group-title">Легенда</div>
          {weatherLayer === 'precipitation' ? (
            <>
              <div className="local-risk-legend" aria-hidden />
              <div className="local-risk-legend__labels">
                <span>низкий</span>
                <span>высокий</span>
              </div>
              <p className="map-overlay__hint" style={{ marginTop: 4 }}>
                Круги и цвет линий — относительный риск между 5 участками М-11.
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="muted" style={{ fontSize: 10 }}>
          Погода: {weatherSource} · клик по участку — расчёты
        </div>
      </div>
    </div>
  );
}
