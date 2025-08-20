#!/usr/bin/env tsx

import { DataCollectionService } from '../src/services/dataCollectionService';

async function main() {
  
  
  const dataService = new DataCollectionService();
  
  try {
    // Collect historical data
    await dataService.collectHistoricalData();
    
    // Collect current data
    await dataService.collectCurrentData();
    
    // Show statistics
    const historicalData = await dataService.getHistoricalData();
    const currentData = await dataService.getCurrentData();
    
  } catch (error) {
    console.error('❌ Error during data collection:', error);
    process.exit(1);
  }
}

main();
