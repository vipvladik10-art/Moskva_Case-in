export interface Plant {
  id: number;
  name: string;
  location: { lat: number; lon: number };
  capacity_t_per_hour: number;
  active: boolean;
}

export interface Site {
  id: number;
  name: string;
  location: { lat: number; lon: number };
  lane_width_m: number;
  layer_thickness_m: number;
  mix_density_t_m3: number;
  mix_type: string;
  thin_layer: boolean;
  preferred_plant_id?: number;
  weather_state?: 'rain' | 'clear';
}

export interface Truck {
  id: number;
  plate: string;
  status: 'idle' | 'loading' | 'en_route' | 'waiting' | 'unloading' | 'maintenance';
  destination_site_id: number | null;
  home_plant_id: number | null;
  load_t: number;
}

export interface HourlyForecast {
  valid_at: string;
  issued_at: string;
  source: string;
  temp_c: number;
  precip_mm_h: number;
  precip_probability: number;
  wind_speed_ms: number;
  confidence: number;
}

export interface GreenWindowAlternative {
  plant_id: number;
  delivery_time_min: number;
  confidence: number;
}

export interface GreenWindowResponse {
  site_id: number;
  window: { start: string; end: string; duration_min: number } | null;
  plant_id: number | null;
  delivery_time_min: number | null;
  confidence: number;
  alternatives: GreenWindowAlternative[];
}

export interface MaxTonnageResponse {
  site_id: number;
  plant_id: number;
  t_window_min: number;
  t_useful_min: number;
  max_tonnage_t: number;
  limiting_factor: 'plant_capacity' | 'paver';
  recommended_order_t: number;
  explanation: string;
}

export interface MaintenanceTask {
  id: number;
  machine_id: number;
  reason: string;
  status: string;
  assigned_to: string;
  created_at: string;
}

export interface DecisionEntry {
  at: string;
  kind: 'system' | 'weather' | 'redirect' | 'maintenance';
  message: string;
  site_id?: number;
  truck_id?: number;
  task_id?: number;
  from_site_id?: number;
  to_site_id?: number;
  machine_id?: number;
}

export interface SuddenStormResponse {
  rain_site_id: number;
  rain_site_name: string;
  target_site_id: number | null;
  target_site_name: string | null;
  redirected_trucks: Truck[];
  maintenance_tasks: MaintenanceTask[];
  explanation: string;
}
