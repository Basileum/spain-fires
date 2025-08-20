import axios from 'axios';
import type { CopernicusResponse } from '@/types';

interface HexagonGridResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
    properties: {
      h3Index: string;
      resolution: number;
    };
  }>;
  metadata: {
    totalHexagons: number;
    generatedAt: string;
    spainBounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
}

const API_BASE_URL = import.meta.env.PROD 
  ? '/iberic-fires/api'  // Include subdirectory path in production
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class FireDataService {
  async getFireDataByDate(date: string): Promise<CopernicusResponse> {
    try {
      const response = await apiClient.get<CopernicusResponse>(`/fires/date/${date}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getFireDataByRange(startDate: string, endDate: string): Promise<CopernicusResponse> {
    try {
      const response = await apiClient.get<CopernicusResponse>('/fires/range', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTodayFireData(): Promise<CopernicusResponse> {
    try {
      const response = await apiClient.get<CopernicusResponse>('/fires/today');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentData(): Promise<CopernicusResponse> {
    try {
      const response = await apiClient.get<CopernicusResponse>('/fires/current');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getHealthStatus(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await apiClient.get('/fires/health');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getDataRange(): Promise<{ start: string; end: string }> {
    try {
      const response = await apiClient.get('/fires/data-range');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Cumulated fire data methods
  async getCumulatedFireData(
    startDate: string,
    endDate: string,
    resolution: number
  ): Promise<{
    success: boolean;
    data: {
      resolution: number;
      hexagonData: {
        [h3Index: string]: {
          totalArea: number;
          fireCount: number;
          fires: string[];
          size: 'small' | 'medium' | 'large' | 'none';
        };
      };
      dateRange: {
        start: string;
        end: string;
      };
      totalFires: number;
      totalArea: number;
    };
  }> {
    try {
      const response = await apiClient.get('/cumulated-fires', {
        params: { startDate, endDate, resolution }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching cumulated fire data:', error);
      throw error;
    }
  }

  // Hexagon grid methods
  async getHexagonGrid(zoom: number, viewport?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<HexagonGridResponse> {
    try {
      const params = new URLSearchParams();
      params.append('zoom', zoom.toString());
      
      if (viewport) {
        params.append('viewport', JSON.stringify(viewport));
      }
      
      // Add cache busting parameter
      params.append('_t', Date.now().toString());
      
      const response = await apiClient.get<HexagonGridResponse>(`/fires/hexagon-grid?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching hexagon grid:', error);
      throw error;
    }
  }

  async pregenerateHexagonGrids(): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      const response = await apiClient.post('/fires/hexagon-grid/pregenerate');
      return response.data;
    } catch (error) {
      console.error('Error pre-generating hexagon grids:', error);
      throw error;
    }
  }

  async getHexagonGridCacheStatus(): Promise<{
    cachedResolutions: number[];
    totalCacheSize: number;
    lastUpdated: string;
  }> {
    try {
      const response = await apiClient.get('/fires/hexagon-grid/cache/status');
      return response.data;
    } catch (error) {
      console.error('Error getting hexagon grid cache status:', error);
      throw error;
    }
  }

  async clearHexagonGridCache(): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      const response = await apiClient.delete('/fires/hexagon-grid/cache');
      return response.data;
    } catch (error) {
      console.error('Error clearing hexagon grid cache:', error);
      throw error;
    }
  }
}

export default new FireDataService();
