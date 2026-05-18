import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  DecisionEntry,
  DecisionRule,
  EndRainResponse,
  FleetCatalog,
  GreenWindowResponse,
  LocationPayload,
  MapMarker,
  HourlyForecast,
  MaintenanceTask,
  MaxTonnageResponse,
  MlStatus,
  Plant,
  Site,
  SuddenStormResponse,
  Truck,
  WeatherSummary,
} from './types';

const activeTabInterval = (ms: number) => () =>
  typeof document === 'undefined' || document.visibilityState === 'visible' ? ms : false;

export function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => (await api.get<Plant[]>('/plants')).data,
    staleTime: 5 * 60_000,
  });
}

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => (await api.get<Site[]>('/sites')).data,
    refetchInterval: activeTabInterval(10_000),
    staleTime: 10_000,
  });
}

export function useSite(siteId: number) {
  return useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => (await api.get<Site>(`/sites/${siteId}`)).data,
    enabled: !!siteId,
    refetchInterval: activeTabInterval(10_000),
    staleTime: 10_000,
  });
}

export function useWeatherSummary() {
  return useQuery({
    queryKey: ['weather-summary'],
    queryFn: async () => (await api.get<WeatherSummary[]>('/sites/weather-summary')).data,
    refetchInterval: activeTabInterval(30_000),
    staleTime: 30_000,
  });
}

export function useTrucks() {
  return useQuery({
    queryKey: ['trucks'],
    queryFn: async () => (await api.get<Truck[]>('/trucks')).data,
    refetchInterval: activeTabInterval(10_000),
    staleTime: 10_000,
  });
}

export function useForecast(siteId: number, hours = 24) {
  return useQuery({
    queryKey: ['forecast', siteId, hours],
    queryFn: async () =>
      (await api.get<HourlyForecast[]>(`/sites/${siteId}/forecast`, { params: { hours } })).data,
    enabled: !!siteId,
    refetchInterval: activeTabInterval(30_000),
    staleTime: 30_000,
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
    refetchInterval: activeTabInterval(30_000),
    staleTime: 30_000,
  });
}

export function useMaxTonnage(siteId: number) {
  return useQuery({
    queryKey: ['max-tonnage', siteId],
    queryFn: async () =>
      (await api.post<MaxTonnageResponse>(`/sites/${siteId}/max-tonnage`, {})).data,
    enabled: !!siteId,
    refetchInterval: activeTabInterval(30_000),
    staleTime: 30_000,
  });
}

export interface MaintenanceFilters {
  status?: string;
  site_id?: number;
  phase?: string;
  trigger_source?: string;
}

export function useMaintenance(filters?: MaintenanceFilters) {
  const params = { status: 'open', ...filters };
  return useQuery({
    queryKey: ['maintenance', params],
    queryFn: async () =>
      (await api.get<MaintenanceTask[]>('/maintenance/tasks', { params })).data,
    refetchInterval: activeTabInterval(15_000),
    staleTime: 15_000,
  });
}

export function useMaintenanceTask(taskId: number | undefined) {
  return useQuery({
    queryKey: ['maintenance', taskId],
    queryFn: async () => (await api.get<MaintenanceTask>(`/maintenance/tasks/${taskId}`)).data,
    enabled: !!taskId,
  });
}

export function usePatchMaintenanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.patch<MaintenanceTask>(`/maintenance/tasks/${id}`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
    },
  });
}

export function useDecisionsForTask(taskId: number | undefined) {
  return useQuery({
    queryKey: ['decisions', 'task', taskId],
    queryFn: async () =>
      (
        await api.get<DecisionEntry[]>('/demo/decisions', {
          params: { limit: 30, task_id: taskId },
        })
      ).data,
    enabled: !!taskId,
  });
}

export function useDecisions(limit = 50) {
  return useQuery({
    queryKey: ['decisions', limit],
    queryFn: async () =>
      (await api.get<DecisionEntry[]>('/demo/decisions', { params: { limit } })).data,
    refetchInterval: activeTabInterval(7_500),
    staleTime: 7_500,
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

export function useEndRain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<EndRainResponse>('/demo/end-rain')).data,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useFleet() {
  return useQuery({
    queryKey: ['fleet'],
    queryFn: async () => (await api.get<FleetCatalog>('/fleet')).data,
    staleTime: 60_000,
  });
}

export function useUpdateFleet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fleet: FleetCatalog) => (await api.put<FleetCatalog>('/fleet', fleet)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
}

export function useDecisionRules() {
  return useQuery({
    queryKey: ['decision-rules'],
    queryFn: async () => (await api.get<DecisionRule[]>('/decision-rules')).data,
    staleTime: 60_000,
  });
}

export function useUpdateDecisionRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rules: DecisionRule[]) =>
      (await api.put<DecisionRule[]>('/decision-rules', { rules })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decision-rules'] });
      qc.invalidateQueries({ queryKey: ['decisions'] });
    },
  });
}

export function useMapMarkers() {
  return useQuery({
    queryKey: ['map-markers'],
    queryFn: async () => (await api.get<MapMarker[]>('/map-markers')).data,
    staleTime: 30_000,
  });
}

function invalidateMapCatalog(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['sites'] });
  qc.invalidateQueries({ queryKey: ['plants'] });
  qc.invalidateQueries({ queryKey: ['map-markers'] });
  qc.invalidateQueries({ queryKey: ['weather-summary'] });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; location: LocationPayload }) =>
      (await api.post<Site>('/sites', payload)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; location?: LocationPayload };
    }) => (await api.patch<Site>(`/sites/${id}`, payload)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/sites/${id}`)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useCreatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      location: LocationPayload;
      capacity_t_per_hour?: number;
    }) => (await api.post<Plant>('/plants', payload)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useUpdatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; location?: LocationPayload; capacity_t_per_hour?: number };
    }) => (await api.patch<Plant>(`/plants/${id}`, payload)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useDeletePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/plants/${id}`)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useCreateMapMarker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; lat: number; lon: number; notes?: string }) =>
      (await api.post<MapMarker>('/map-markers', payload)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useUpdateMapMarker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; lat?: number; lon?: number; notes?: string };
    }) => (await api.patch<MapMarker>(`/map-markers/${id}`, payload)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useDeleteMapMarker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/map-markers/${id}`)).data,
    onSuccess: () => invalidateMapCatalog(qc),
  });
}

export function useMlStatus() {
  return useQuery({
    queryKey: ['ml-status'],
    queryFn: async () => (await api.get<MlStatus>('/ml/status')).data,
    staleTime: 60_000,
    retry: 1,
  });
}
