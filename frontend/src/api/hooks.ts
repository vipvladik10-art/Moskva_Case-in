import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { GreenWindowResponse, HourlyForecast, MaxTonnageResponse, Plant, Site } from './types';

export function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => (await api.get<Plant[]>('/plants')).data,
  });
}

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => (await api.get<Site[]>('/sites')).data,
  });
}

export function useForecast(siteId: number, hours = 24) {
  return useQuery({
    queryKey: ['forecast', siteId, hours],
    queryFn: async () =>
      (await api.get<HourlyForecast[]>(`/sites/${siteId}/forecast`, { params: { hours } })).data,
    enabled: !!siteId,
  });
}

export function useGreenWindow(siteId: number) {
  return useMutation({
    mutationFn: async (params: { precip_threshold?: number; min_duration_min?: number }) =>
      (await api.post<GreenWindowResponse>(`/sites/${siteId}/green-window`, params)).data,
  });
}

export function useMaxTonnage(siteId: number) {
  return useMutation({
    mutationFn: async (params: { plant_id?: number }) =>
      (await api.post<MaxTonnageResponse>(`/sites/${siteId}/max-tonnage`, params)).data,
  });
}
