import { create } from 'zustand';

export type WeatherLayer = 'none' | 'precipitation' | 'clouds' | 'temperature' | 'wind';

interface UiState {
  weatherLayer: WeatherLayer;
  showSiteLines: boolean;
  showWeatherBadges: boolean;
  weatherLayerOpacity: number;
  setWeatherLayer: (layer: WeatherLayer) => void;
  setShowSiteLines: (show: boolean) => void;
  setShowWeatherBadges: (show: boolean) => void;
  setWeatherLayerOpacity: (opacity: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  weatherLayer: 'precipitation',
  showSiteLines: true,
  showWeatherBadges: true,
  weatherLayerOpacity: 0.6,
  setWeatherLayer: (layer) => set({ weatherLayer: layer }),
  setShowSiteLines: (show) => set({ showSiteLines: show }),
  setShowWeatherBadges: (show) => set({ showWeatherBadges: show }),
  setWeatherLayerOpacity: (opacity) => set({ weatherLayerOpacity: opacity }),
}));
