import { HexagonGridService } from '../src/services/hexagonGridService';

async function pregenerateSpainOverview() {
  console.log('🚀 Starting Spain overview hexagon grid pre-generation...');
  
  const hexagonService = new HexagonGridService();
  
  try {
    await hexagonService.pregenerateSpainOverview();
    
    // Get cache status
    const status = await hexagonService.getCacheStatus();
    
    console.log('\n📊 Pre-generation completed!');
    console.log('Cached resolutions:', status.cachedResolutions);
    console.log('Total cache size:', (status.totalCacheSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('Last updated:', status.lastUpdated);
    
    console.log('\n✅ Spain overview hexagon grid is now cached and ready for fast retrieval!');
  } catch (error) {
    console.error('❌ Error during pre-generation:', error);
    process.exit(1);
  }
}

// Run the pre-generation
pregenerateSpainOverview();
