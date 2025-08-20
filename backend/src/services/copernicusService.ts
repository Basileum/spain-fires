import axios from 'axios';
import { CopernicusResponse, DateRange } from '../types';
import { DataCollectionService } from './dataCollectionService';
import { createFileLogger } from '../utils/logger';

const logger = createFileLogger('copernicusService.ts');
const COPERNICUS_BASE_URL = 'https://api.effis.emergency.copernicus.eu/rest/2/burntareas/current/';

export class CopernicusService {
  private dataCollectionService: DataCollectionService;

  constructor() {
    this.dataCollectionService = new DataCollectionService();
  }

  async getFireData(dateRange: DateRange): Promise<CopernicusResponse> {
    try {
      // Try to get data from local storage first
      const startDate = dateRange.startDate.split('T')[0];
      const endDate = dateRange.endDate.split('T')[0];
      
      logger.info(`Fetching fire data for range: ${startDate} to ${endDate}`, 'getFireData');
      
      if (startDate === endDate) {
        // Single date request - use local data
        const localData = await this.dataCollectionService.getDataForDate(startDate);
        if (localData.length > 0) {
          logger.info(`Using local data for ${startDate}: ${localData.length} fires`, 'getFireData');
          return {
            count: localData.length,
            next: null,
            previous: null,
            results: localData
          };
        }
      }

      // Fallback to API if local data not available
      const params = new URLSearchParams({
        country: 'ES',
        lastupdate__gte: dateRange.startDate,
        lastupdate__lte: dateRange.endDate,
        ordering: '-lastupdate,-area_ha',
        limit: '9999'
      });

      const url = `${COPERNICUS_BASE_URL}?${params.toString()}`;
      
      logger.info(`Fetching data from API: ${url}`, 'getFireData');
      
      const response = await axios.get<CopernicusResponse>(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Spain-Forest-Fires-App/1.0'
        },
        timeout: 30000
      });

      logger.info(`Successfully fetched ${response.data.count} fires from API`, 'getFireData');
      return response.data;
    } catch (error) {
      logger.error('Error fetching data from Copernicus API', 'getFireData', error as Error, { dateRange });
      throw new Error(`Failed to fetch fire data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFireDataByDate(date: string): Promise<CopernicusResponse> {
    logger.info(`Getting fire data for date: ${date}`, 'getFireDataByDate');
    const startDate = `${date}T00:00:00`;
    const endDate = `${date}T23:59:59`;
    
    return this.getFireData({ startDate, endDate });
  }

  async getFireDataByDateRange(startDate: string, endDate: string): Promise<CopernicusResponse> {
    logger.info(`Getting fire data for date range: ${startDate} to ${endDate}`, 'getFireDataByDateRange');
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;
    
    return this.getFireData({ startDate: start, endDate: end });
  }

  // New methods for data collection management
  async startDataCollection(): Promise<void> {
    logger.info('Starting data collection service', 'startDataCollection');
    await this.dataCollectionService.startDataCollection();
  }

  async stopDataCollection(): Promise<void> {
    logger.info('Stopping data collection service', 'stopDataCollection');
    await this.dataCollectionService.stopDataCollection();
  }

  isDataCollectionRunning(): boolean {
    const isRunning = this.dataCollectionService.isServiceRunning();
    logger.info(`Data collection service status: ${isRunning ? 'running' : 'stopped'}`, 'isDataCollectionRunning');
    return isRunning;
  }

  async getDataCollectionStatus(): Promise<{
    isRunning: boolean;
    historicalDataCount: number;
    currentDataLastUpdated?: string;
  }> {
    logger.info('Getting data collection status', 'getDataCollectionStatus');
    
    const isRunning = this.dataCollectionService.isServiceRunning();
    const historicalData = await this.dataCollectionService.getHistoricalData();
    const currentData = await this.dataCollectionService.getCurrentData();

    const status = {
      isRunning,
      historicalDataCount: historicalData.length,
      currentDataLastUpdated: currentData?.lastUpdated
    };

    logger.info(`Data collection status: ${isRunning ? 'running' : 'stopped'}, ${historicalData.length} historical records`, 'getDataCollectionStatus');
    return status;
  }

  async getCurrentData(): Promise<CopernicusResponse | null> {
    logger.info('Getting current situation data', 'getCurrentData');
    try {
      return await this.dataCollectionService.getCurrentData();
    } catch (error) {
      logger.error('Error getting current data', 'getCurrentData', error as Error);
      return null;
    }
  }

  async getDataRange(): Promise<{ start: string; end: string }> {
    logger.info('Getting actual data range', 'getDataRange');
    try {
      // Get all historical data to find the date range
      const historicalData = await this.dataCollectionService.getHistoricalData();
      
      if (historicalData.length === 0) {
        logger.warn('No historical data available, using default range', 'getDataRange');
        return {
          start: '2024-01-01',
          end: new Date().toISOString().split('T')[0]
        };
      }
      
      // Extract all dates from the fire data
      const dates = historicalData
        .map(fire => fire.lastupdate?.split('T')[0])
        .filter(date => date)
        .sort();
      
      if (dates.length === 0) {
        logger.warn('No valid dates found in historical data, using default range', 'getDataRange');
        return {
          start: '2024-01-01',
          end: new Date().toISOString().split('T')[0]
        };
      }
      
      const range = {
        start: dates[0],
        end: dates[dates.length - 1]
      };
      
      logger.info(`Calculated data range: ${range.start} to ${range.end}`, 'getDataRange');
      return range;
    } catch (error) {
      logger.error('Error getting data range', 'getDataRange', error as Error);
      // Return default range if there's an error
      return {
        start: '2024-01-01',
        end: new Date().toISOString().split('T')[0]
      };
    }
  }
}
