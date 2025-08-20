import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { FireData, CopernicusResponse } from '../types';
import { createFileLogger } from '../utils/logger';

const logger = createFileLogger('standaloneDataCollector.ts');
const COPERNICUS_BASE_URL = 'https://api.effis.emergency.copernicus.eu/rest/2/burntareas/current/';
const DATA_DIR = path.join(__dirname, '../../data');
const CURRENT_FILE = path.join(DATA_DIR, 'current_fires.json');

class StandaloneDataCollector {
  private _isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDataDirectory();
  }

  private initializeDataDirectory() {
    try {
      const fsSync = require('fs');
      if (!fsSync.existsSync(DATA_DIR)) {
        fsSync.mkdirSync(DATA_DIR, { recursive: true });
        logger.info(`📁 Created data directory: ${DATA_DIR}`);
      }
    } catch (error) {
      logger.error('Error creating data directory', 'init-directory', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async start() {
    if (this._isRunning) {
      logger.info('Data collector is already running');
      return;
    }

    this._isRunning = true;
    logger.info('🚀 Starting standalone data collector...');

    // Initial collection
    await this.collectCurrentData();

    // Set up hourly updates
    this.intervalId = setInterval(async () => {
      await this.collectCurrentData();
    }, 60 * 60 * 1000); // Every hour

    logger.info('✅ Standalone data collector started successfully');
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._isRunning = false;
    logger.info('🛑 Standalone data collector stopped');
  }

  private async collectCurrentData() {
    logger.info('🔄 Collecting current day data...');
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const data = await this.fetchFireDataForDate(today);
      await this.saveCurrentData(data);
      logger.info(`✅ Current data updated: ${data.results?.length || 0} fires for ${today}`);
    } catch (error) {
      logger.error('❌ Error collecting current data:', 'collect-data', error instanceof Error ? error : new Error(String(error)));
      // Update timestamp even on error
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

  private async saveCurrentData(data: CopernicusResponse) {
    try {
      const currentData = {
        lastUpdated: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        ...data
      };
      
      const jsonData = JSON.stringify(currentData, null, 2);
      await fs.writeFile(CURRENT_FILE, jsonData);
      logger.info(`✅ Current data saved: ${data.results?.length || 0} fires`);
    } catch (error) {
      logger.error('❌ Error saving current data:', 'save-data', error instanceof Error ? error : new Error(String(error)));
    }
  }

  isRunning(): boolean {
    return this._isRunning;
  }
}

// If this file is run directly, start the collector
if (require.main === module) {
  const collector = new StandaloneDataCollector();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await collector.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await collector.stop();
    process.exit(0);
  });

  // Start the collector
  collector.start().catch(error => {
    logger.error('Failed to start collector:', error);
    process.exit(1);
  });
}

export { StandaloneDataCollector };
