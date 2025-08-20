import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { FireData, CopernicusResponse } from '../types';
import { createFileLogger } from '../utils/logger';

const logger = createFileLogger('dataCollectionService.ts');
const COPERNICUS_BASE_URL = 'https://api.effis.emergency.copernicus.eu/rest/2/burntareas/current/';
const DATA_DIR = path.join(__dirname, '../../data');
const HISTORICAL_DIR = path.join(DATA_DIR, 'historical');
const CURRENT_FILE = path.join(DATA_DIR, 'current_fires.json');

export class DataCollectionService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize data directory synchronously
    this.initializeDataDirectory();
  }

  private initializeDataDirectory() {
    try {
      const fsSync = require('fs');
      if (!fsSync.existsSync(DATA_DIR)) {
        fsSync.mkdirSync(DATA_DIR, { recursive: true });
        logger.info(`📁 Created data directory: ${DATA_DIR}`, 'initializeDataDirectory');
      }
      if (!fsSync.existsSync(HISTORICAL_DIR)) {
        fsSync.mkdirSync(HISTORICAL_DIR, { recursive: true });
        logger.info(`📁 Created historical directory: ${HISTORICAL_DIR}`, 'initializeDataDirectory');
      }
    } catch (error) {
      logger.error('Error creating data directory', 'initializeDataDirectory', error as Error);
    }
  }

  async startDataCollection() {
    if (this.isRunning) {
      logger.info('Data collection service is already running', 'startDataCollection');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting data collection service for current data only...', 'startDataCollection');

    // Initial current data collection
    await this.collectCurrentData();

    // Set up hourly updates for current data
    this.intervalId = setInterval(async () => {
      await this.collectCurrentData();
    }, 60 * 60 * 1000); // Every hour

    logger.info('✅ Data collection service started successfully - collecting current data hourly', 'startDataCollection');
  }

  async stopDataCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('🛑 Data collection service stopped', 'stopDataCollection');
  }

  async collectHistoricalData() {
    logger.info('📚 Collecting historical data from June 10th until yesterday...', 'collectHistoricalData');
    
    const startDate = new Date('2025-06-10');
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday

    let currentDate = new Date(startDate);
    let dayCount = 0;
    let totalFires = 0;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      logger.info(`📅 Collecting data for ${dateStr} (day ${dayCount + 1})...`, 'collectHistoricalData');

      try {
        const data = await this.fetchFireDataForDate(dateStr);
        if (data.results && data.results.length > 0) {
          await this.saveDayData(dateStr, data.results);
          totalFires += data.results.length;
          logger.info(`✅ Found and saved ${data.results.length} fires for ${dateStr}`, 'collectHistoricalData');
        } else {
          logger.info(`ℹ️ No fires found for ${dateStr}`, 'collectHistoricalData');
        }
      } catch (error) {
        logger.error(`❌ Error collecting data for ${dateStr}`, 'collectHistoricalData', error as Error);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      dayCount++;
      
      // Add delay to avoid overwhelming the API
      await this.delay(1000);
    }

    logger.info(`📊 Historical data collection complete: ${totalFires} fires collected from ${dayCount} days`, 'collectHistoricalData');
  }

  async collectCurrentData() {
    logger.info('🔄 Collecting current day data...', 'collectCurrentData');
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const data = await this.fetchFireDataForDate(today);
      await this.saveCurrentData(data);
      logger.info(`✅ Current data updated: ${data.results?.length || 0} fires for ${today} at ${new Date().toISOString()}`, 'collectCurrentData');
    } catch (error) {
      logger.error('❌ Error collecting current data:', 'collectCurrentData', error as Error);
      // Even if there's an error, update the timestamp to show when we last tried
      await this.saveCurrentData({ count: 0, results: [], next: null, previous: null });
    }
  }

  private async fetchFireDataForDate(date: string): Promise<CopernicusResponse> {
    const startDate = `${date}T00:00:00`;
    const endDate = `${date}T23:59:59`;

    const params = new URLSearchParams({
      country: 'ES',
      lastupdate__gte: startDate,
      lastupdate__lte: endDate,
      ordering: '-lastupdate,-area_ha',
      limit: '9999'
    });

    const url = `${COPERNICUS_BASE_URL}?${params.toString()}`;
    
    const response = await axios.get<CopernicusResponse>(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Spain-Forest-Fires-Data-Collector/1.0'
      },
      timeout: 30000
    });

    return response.data;
  }

  private async saveDayData(date: string, fires: FireData[]) {
    try {
      const fileName = `${date}.json`;
      const filePath = path.join(HISTORICAL_DIR, fileName);
      
      logger.info(`💾 Saving ${fires.length} fires for ${date} to: ${filePath}`, 'saveDayData');
      
      const data = {
        date: date,
        lastUpdated: new Date().toISOString(),
        fireCount: fires.length,
        fires: fires
      };
      
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData);
      logger.info(`✅ Day data saved successfully: ${fires.length} fires for ${date}`, 'saveDayData');
    } catch (error) {
      logger.error(`❌ Error saving day data for ${date}`, 'saveDayData', error as Error);
      logger.error('Error details:', 'saveDayData', error as Error);
    }
  }

  private async saveCurrentData(data: CopernicusResponse) {
    try {
      logger.info(`💾 Attempting to save current data to: ${CURRENT_FILE}`, 'saveCurrentData');
      
      const currentData = {
        lastUpdated: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        ...data
      };
      
      const jsonData = JSON.stringify(currentData, null, 2);
      await fs.writeFile(CURRENT_FILE, jsonData);
      logger.info(`✅ Current data saved successfully: ${data.results?.length || 0} fires`, 'saveCurrentData');
    } catch (error) {
      logger.error('❌ Error saving current data:', 'saveCurrentData', error as Error);
              logger.error(`File path: ${CURRENT_FILE}`, 'saveCurrentData');
      logger.error('Error details:', 'saveCurrentData', error as Error);
    }
  }

  async getHistoricalData(): Promise<FireData[]> {
    try {
      const files = await fs.readdir(HISTORICAL_DIR);
      const allFires: FireData[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(HISTORICAL_DIR, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(data);
          if (parsed.fires) {
            allFires.push(...parsed.fires);
          }
        }
      }
      
      return allFires;
    } catch (error) {
      logger.error('❌ Error reading historical data:', 'getHistoricalData', error as Error);
      return [];
    }
  }

  async getCurrentData(): Promise<CopernicusResponse | null> {
    try {
      const data = await fs.readFile(CURRENT_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('❌ Error reading current data:', 'getCurrentData', error as Error);
      return null;
    }
  }

  async getDataForDate(date: string): Promise<FireData[]> {
    try {
      // Try to get data from historical files first
      const fileName = `${date}.json`;
      const filePath = path.join(HISTORICAL_DIR, fileName);
      
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed.fires) {
          return parsed.fires;
        }
      } catch (error) {
        // File doesn't exist, try current data
      }
      
      // Fallback to current data
      const currentData = await this.getCurrentData();
      if (currentData?.results) {
        return currentData.results.filter(fire => {
          const fireDate = fire.lastupdate.split('T')[0];
          return fireDate === date;
        });
      }
      
      return [];
    } catch (error) {
      logger.error(`❌ Error getting data for date ${date}`, 'getDataForDate', error as Error);
      return [];
    }
  }

  private setupDailyArchival() {
    logger.info('🕒 Setting up daily archival at 3 AM...', 'setupDailyArchival');
    
    // Calculate time until next 3 AM
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    
    // If it's past 3 AM today, schedule for tomorrow
    if (now.getHours() >= 3) {
      next3AM.setDate(next3AM.getDate() + 1);
    }
    
    const timeUntil3AM = next3AM.getTime() - now.getTime();
    
    // Schedule the first collection
    setTimeout(() => {
      this.collectPreviousDayData();
      
      // Then schedule it to run every 24 hours
      setInterval(() => {
        this.collectPreviousDayData();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntil3AM);
    
    logger.info(`📅 Next previous day collection scheduled for: ${next3AM.toISOString()}`, 'setupDailyArchival');
  }

  private async collectPreviousDayData() {
    logger.info('📅 Collecting previous day data at 3 AM...', 'collectPreviousDayData');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      logger.info(`📅 Fetching complete data for ${yesterdayStr}...`, 'collectPreviousDayData');
      
      const data = await this.fetchFireDataForDate(yesterdayStr);
      if (data.results && data.results.length > 0) {
        await this.saveDayData(yesterdayStr, data.results);
        logger.info(`✅ Collected and saved ${data.results.length} fires for ${yesterdayStr}`, 'collectPreviousDayData');
      } else {
        logger.info(`ℹ️ No fires found for ${yesterdayStr}`, 'collectPreviousDayData');
      }
    } catch (error) {
      logger.error('❌ Error collecting previous day data:', 'collectPreviousDayData', error as Error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}
