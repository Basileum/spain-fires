import { FireData } from '../types';
import { polygonToCells, latLngToCell } from 'h3-js';
import { createFileLogger } from '../utils/logger';
import { DataCollectionService } from './dataCollectionService';

const logger = createFileLogger('cumulatedFireService.ts');

interface CumulatedFireData {
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
  private cache = new Map<string, CumulatedFireData>();
  private dataCollectionService: DataCollectionService;

  constructor() {
    this.dataCollectionService = new DataCollectionService();
  }

  /**
   * Calculate cumulated fire data for a date range and resolution
   */
  async calculateCumulatedFireData(
    startDate: string,
    endDate: string,
    resolution: number
  ): Promise<CumulatedFireData> {
    const cacheKey = `${startDate}_${endDate}_${resolution}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      logger.info(`Using cached cumulated fire data for ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    logger.info(`Calculating cumulated fire data for ${startDate} to ${endDate} at resolution ${resolution}`);

    try {
      // Get all fires in the date range
      const fires = await this.getFiresInDateRange(startDate, endDate);
      
      // Initialize hexagon data structure
      const hexagonData: { [h3Index: string]: any } = {};
      
      let totalFires = 0;
      let totalArea = 0;

      // Process each fire
      for (const fire of fires) {
        // Use centroid method for now (simpler and more reliable)
        this.addFireToHexagonByCentroid(fire, resolution, hexagonData);
        totalFires++;
        totalArea += fire.area_ha;
      }

      // Calculate fire sizes for each hexagon
      Object.values(hexagonData).forEach(hexagon => {
        hexagon.size = this.getFireSize(hexagon.totalArea);
      });

      const result: CumulatedFireData = {
        resolution,
        hexagonData,
        dateRange: { start: startDate, end: endDate },
        totalFires,
        totalArea
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      
      logger.info(`Calculated cumulated fire data: ${totalFires} fires, ${Object.keys(hexagonData).length} affected hexagons`);
      
      return result;
    } catch (error) {
      logger.error('Error calculating cumulated fire data:', 'calculate-cumulated', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get fires in a date range from local data files
   */
  private async getFiresInDateRange(startDate: string, endDate: string): Promise<FireData[]> {
    try {
      const allFires: FireData[] = [];
      
      // Convert dates to Date objects for comparison
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Iterate through each day in the range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          // Get data for this specific date
          const dayData = await this.dataCollectionService.getDataForDate(dateStr);
          if (dayData && dayData.length > 0) {
            allFires.push(...dayData);
            logger.info(`Found ${dayData.length} fires for ${dateStr}`);
          }
        } catch (error) {
          logger.warn(`No data found for ${dateStr}`, 'no-data-found', { date: dateStr });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      logger.info(`Total fires found in date range: ${allFires.length}`);
      return allFires;
    } catch (error) {
      logger.error('Error fetching fires from local data:', 'fetch-local-data', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Add fire to hexagon using centroid
   */
  private addFireToHexagonByCentroid(
    fire: FireData,
    resolution: number,
    hexagonData: { [h3Index: string]: any }
  ) {
    const [lng, lat] = fire.centroid.coordinates;
    const h3Index = latLngToCell(lat, lng, resolution);
    
    if (!hexagonData[h3Index]) {
      hexagonData[h3Index] = {
        totalArea: 0,
        fireCount: 0,
        fires: [],
        size: 'none'
      };
    }
    
    hexagonData[h3Index].totalArea += fire.area_ha;
    hexagonData[h3Index].fireCount += 1;
    hexagonData[h3Index].fires.push(fire.id.toString());
  }

  /**
   * Get fire size category based on area
   */
  private getFireSize(area: number): 'small' | 'medium' | 'large' | 'none' {
    if (area < 10) return 'small';
    if (area < 100) return 'medium';
    return 'large';
  }

  /**
   * Clear cache (useful for testing or when data changes)
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cumulated fire data cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cumulatedFireService = new CumulatedFireService();
