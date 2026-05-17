import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  DecisionEntry,
  GreenWindowResponse,
  HourlyForecast,
  MaintenanceTask,
  MaxTonnageResponse,
  Plant,
  Site,
  SuddenStormResponse,
  Truck,
} from './types';

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
    refetchInterval: 3000,
  });
}

export function useSite(siteId: number) {
  return useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => (await api.get<Site>(`/sites/${siteId}`)).data,
    enabled: !!siteId,
    refetchInterval: 3000,
  });
}

export function useTrucks() {
  return useQuery({
    queryKey: ['trucks'],
    queryFn: async () => (await api.get<Truck[]>('/trucks')).data,
    refetchInterval: 3000,
  });
}

export function useForecast(siteId: number, hours = 24) {
  return useQuery({
    queryKey: ['forecast', siteId, hours],
    queryFn: async () =>
      (await api.get<HourlyForecast[]>(`/sites/${siteId}/forecast`, { params: { hours } })).data,
    enabled: !!siteId,
    refetchInterval: 5000,
  });
}

export function useGreenWindow(siteId: number) {
  return useQuery({
    queryKey: ['green-window', siteId],
    queryFn: async () =>
      (
        await api.post<GreenWindowResponse>(`/sites/${siteId}/green-window`, {
          precip_threshold: 0.3,
          min_duration_min: 60,
        })
      ).data,
    enabled: !!siteId,
    refetchInterval: 5000,
  });
}

export function useMaxTonnage(siteId: number) {
  return useQuery({
    queryKey: ['max-tonnage', siteId],
    queryFn: async () =>
      (await api.post<MaxTonnageResponse>(`/sites/${siteId}/max-tonnage`, {})).data,
    enabled: !!siteId,
    refetchInterval: 5000,
  });
}

export function useMaintenance() {
  return useQuery({
    queryKey: ['maintenance'],
    queryFn: async () =>
      (await api.get<MaintenanceTask[]>('/maintenance/tasks', { params: { status: 'open' } })).data,
    refetchInterval: 3000,
  });
}

export function useDecisions(limit = 50) {
  return useQuery({
    queryKey: ['decisions', limit],
    queryFn: async () =>
      (await api.get<DecisionEntry[]>('/demo/decisions', { params: { limit } })).data,
    refetchInterval: 2000,
  });
}

export function useSuddenStorm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params?: { site_id?: number; redirect_count?: number }) =>
      (
        await api.post<SuddenStormResponse>('/demo/sudden-storm', null, {
          params: { site_id: params?.site_id ?? 2, redirect_count: params?.redirect_count ?? 3 },
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post('/demo/reset')).data,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
