#!/usr/bin/env tsx

import { DataCollectionService } from '../src/services/dataCollectionService';

async function main() {
  console.log('🚀 Starting remaining historical data collection...');
  
  const dataService = new DataCollectionService();
  
  try {
    // Collect remaining historical data
    console.log('📚 Collecting remaining historical data...');
    await dataService.collectHistoricalData();
    
    console.log('✅ Remaining historical data collection completed!');
    
    // Show statistics
    const historicalData = await dataService.getHistoricalData();
    const currentData = await dataService.getCurrentData();
    
    console.log(`📊 Final Statistics:`);
    console.log(`   Historical fires: ${historicalData.length}`);
    console.log(`   Current fires: ${currentData?.results?.length || 0}`);
    console.log(`   Last updated: ${currentData?.lastUpdated || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Error during data collection:', error);
    process.exit(1);
  }
}

main();
