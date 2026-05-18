import { create } from 'zustand';

export type WeatherLayer = 'none' | 'precipitation' | 'clouds' | 'temperature' | 'wind';
export type MapEditEntityType = 'site' | 'plant' | 'marker';

interface UiState {
  weatherLayer: WeatherLayer;
  showSiteLines: boolean;
  showWeatherBadges: boolean;
  showLocalRiskZones: boolean;
  useGlobalWeatherTiles: boolean;
  weatherLayerOpacity: number;
  mapEditMode: boolean;
  mapEditEntityType: MapEditEntityType;
  setWeatherLayer: (layer: WeatherLayer) => void;
  setShowSiteLines: (show: boolean) => void;
  setShowWeatherBadges: (show: boolean) => void;
  setShowLocalRiskZones: (show: boolean) => void;
  setUseGlobalWeatherTiles: (show: boolean) => void;
  setWeatherLayerOpacity: (opacity: number) => void;
  setMapEditMode: (on: boolean) => void;
  setMapEditEntityType: (type: MapEditEntityType) => void;
}

export const useUiStore = create<UiState>((set) => ({
  weatherLayer: 'precipitation',
  showSiteLines: true,
  showWeatherBadges: true,
  showLocalRiskZones: true,
  useGlobalWeatherTiles: false,
  weatherLayerOpacity: 0.6,
  mapEditMode: false,
  mapEditEntityType: 'site',
  setWeatherLayer: (layer) => set({ weatherLayer: layer }),
  setMapEditMode: (on) => set({ mapEditMode: on }),
  setMapEditEntityType: (type) => set({ mapEditEntityType: type }),
  setShowSiteLines: (show) => set({ showSiteLines: show }),
  setShowWeatherBadges: (show) => set({ showWeatherBadges: show }),
  setShowLocalRiskZones: (show) => set({ showLocalRiskZones: show }),
  setUseGlobalWeatherTiles: (show) => set({ useGlobalWeatherTiles: show }),
  setWeatherLayerOpacity: (opacity) => set({ weatherLayerOpacity: opacity }),
}));
