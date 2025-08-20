export interface FireData {
  id: number;
  centroid: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  shape: {
    type: string;
    coordinates: number[][][][];
  };
  country: string;
  countryful: string;
  province: string;
  commune: string;
  firedate: string;
  area_ha: number;
  broadlea: string;
  conifer: string;
  mixed: string;
  scleroph: string;
  transit: string;
  othernatlc: string;
  agriareas: string;
  artifsurf: string;
  otherlc: string;
  percna2k: string;
  lastupdate: string;
  lastfiredate: string | null;
  noneu: boolean;
}

export interface CopernicusResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FireData[];
  lastUpdated?: string;
  date?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
