import { useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePlants, useSites } from '@/api/hooks';

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function MapPage() {
  const { data: plants = [] } = usePlants();
  const { data: sites = [] } = useSites();
  const [showRadar, setShowRadar] = useState(true);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Map
        initialViewState={{ longitude: 37.5, latitude: 56.3, zoom: 9 }}
        mapStyle={{
          version: 8,
          sources: { osm: { type: 'raster', tiles: [TILE_URL], tileSize: 256 } },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        }}
      >
        <NavigationControl position="top-right" />
        {showRadar && (
          <Source
            id="radar"
            type="raster"
            tiles={['https://tilecache.rainviewer.com/v2/radar/nowcast_0/256/{z}/{x}/{y}/2/1_1.png']}
            tileSize={256}
          >
            <Layer id="radar" type="raster" paint={{ 'raster-opacity': 0.6 }} />
          </Source>
        )}
        {plants.map((p) => (
          <Marker key={`p-${p.id}`} latitude={p.location.lat} longitude={p.location.lon}>
            <div title={p.name} style={{ fontSize: 22 }}>🏭</div>
          </Marker>
        ))}
        {sites.map((s) => (
          <Marker key={`s-${s.id}`} latitude={s.location.lat} longitude={s.location.lon}>
            <div title={s.name} style={{ fontSize: 22 }}>🛣️</div>
          </Marker>
        ))}
      </Map>
      <div style={{ position: 'absolute', top: 12, left: 12, background: '#131c2eee', padding: 8, borderRadius: 6 }}>
        <label>
          <input type="checkbox" checked={showRadar} onChange={(e) => setShowRadar(e.target.checked)} /> Радар осадков
        </label>
      </div>
    </div>
  );
}
