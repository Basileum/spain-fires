import { HexagonGridService } from '../src/services/hexagonGridService';

async function pregenerateHexagonGrids() {
  console.log('🚀 Starting hexagon grid pre-generation...');
  
  const hexagonService = new HexagonGridService();
  
  try {
    // Pre-generate all supported resolutions
    await hexagonService.pregenerateAllResolutions();
    
    // Get cache status
    const status = await hexagonService.getCacheStatus();
    
    console.log('\n📊 Pre-generation completed!');
    console.log('Cached resolutions:', status.cachedResolutions);
    console.log('Total cache size:', (status.totalCacheSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('Last updated:', status.lastUpdated);
    
    console.log('\n✅ All hexagon grids are now cached and ready for fast retrieval!');
  } catch (error) {
    console.error('❌ Error during pre-generation:', error);
    process.exit(1);
  }
}

// Run the pre-generation
pregenerateHexagonGrids();
