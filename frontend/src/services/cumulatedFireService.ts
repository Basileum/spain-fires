import { apiClient } from './api';

export interface CumulatedFireData {
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
}

export class CumulatedFireService {
  /**
   * Get cumulated fire data for a date range and resolution
   */
  async getCumulatedFireData(
    startDate: string,
    endDate: string,
    resolution: number
  ): Promise<CumulatedFireData> {
    try {
      const response = await apiClient.get('/cumulated-fires', {
        params: {
          startDate,
          endDate,
          resolution
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Failed to fetch cumulated fire data');
      }
    } catch (error) {
      console.error('Error fetching cumulated fire data:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics (for debugging)
   */
  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    try {
      const response = await apiClient.get('/cumulated-fires/cache/stats');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Failed to fetch cache stats');
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear the cache (for debugging)
   */
  async clearCache(): Promise<void> {
    try {
      const response = await apiClient.post('/cumulated-fires/cache/clear');
      
      if (!response.data.success) {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
}

export const cumulatedFireService = new CumulatedFireService();
