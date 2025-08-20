<template>
  <div class="fire-map-container">
    <!-- Map Title -->
    <div class="map-title">
      <h1>{{ t('app.mapTitle') }}</h1>
    </div>
    
    <!-- Loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>{{ t('app.loading') }}</p>
    </div>

    <!-- Map Container -->
    <div id="map" class="map-container"></div>

    <!-- Error Overlay -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <h3>{{ t('app.error.title') }}</h3>
        <p>{{ error }}</p>
        <button @click="retryLoad" class="retry-button">
          {{ t('app.error.retry') }}
        </button>
      </div>
    </div>

    <!-- Fire Mode Toggle -->
    <FireModeToggle v-model="fireMode" v-show="!isLegendExpanded" />

    <!-- Top Controls (Theme & Language) -->
    <TopControls />

    <!-- Map Controls -->
    <MapControls
      v-model:selectedDate="selectedDate"
      :currentZoom="currentZoom"
      :getResolutionForZoom="getResolutionForZoom"
    />

    <!-- Hexagon Legend -->
    <HexagonLegend
      :currentResolution="currentResolution"
      :fireData="fireData"
      :selectedDate="selectedDate"
      :lastCollectionTime="lastCollectionTime"
      :fireMode="fireMode"
      :dateRange="dateRange"
      @update:selectedDate="onDateChange"
      @update:dateRange="onDateRangeChange"
      @legendToggle="onLegendToggle"
    />


  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MapControls from './MapControls.vue';
import HexagonLegend from './HexagonLegend.vue';
import FireModeToggle from './FireModeToggle.vue';
import TopControls from './TopControls.vue';
import { useMap } from '@/composables/useMap';
import { useHexagonGrid } from '@/composables/useHexagonGrid';
import { useFireData } from '@/composables/useFireData';
import { useMapInteractions } from '@/composables/useMapInteractions';
import { useDarkMode } from '@/composables/useDarkMode';
import { FireDataService } from '@/services/api';

const fireDataService = new FireDataService();
const { isDark } = useDarkMode();

const { t } = useI18n();

// Use composables
const { map, currentZoom, initializeMap, onZoomChange: registerZoomHandler, onMoveEnd: registerMoveHandler } = useMap();
const { 
  getResolutionForZoom, 
  createHexagonGrid, 
  updateHexagonGridForViewport,
  updateHexagonBorderStyle,
  recreateHexagonGridFromCache
} = useHexagonGrid(map, currentZoom);
const { 
  fireData, 
  loading, 
  error, 
  selectedDate, 
  fireMode,
  dateRange,
  loadFireData,
  reapplyFireStyling,
  retryLoad 
} = useFireData(map, currentZoom, getResolutionForZoom);
const { setupHexagonInteractions } = useMapInteractions();

// Debounce mechanism for zoom changes
let zoomChangeTimeout: number | null = null;
const isZoomChanging = ref(false);
const currentResolution = ref(5); // Track current resolution

// Legend expansion state for mobile
const isLegendExpanded = ref(false);

const onLegendToggle = (expanded: boolean) => {
  isLegendExpanded.value = expanded;
};

// Fire mode is now managed by useFireData composable

// Last collection time (for current situation data)
const lastCollectionTime = ref('');

// Update last collection time when fire data changes
watch(fireData, (newData) => {
  if (fireMode.value === 'current' && newData && 'lastUpdated' in newData) {
    lastCollectionTime.value = (newData as any).lastUpdated || '';
  }
}, { immediate: true });

// Date change handler
const onDateChange = (newDate: string) => {
  selectedDate.value = newDate;
};

// Date range change handler for cumulated mode
const onDateRangeChange = (range: { start: string; end: string }) => {
  dateRange.value = range;
};

  // Initialize map and data
  const initializeMapAndData = async () => {
    // Initialize the map
    initializeMap();

    // Wait for map to load
    map.value!.on('load', async () => {
      // Test API connection first
      try {
        const healthResponse = await fireDataService.getHealthStatus();
      } catch (error) {
        console.error('API health check failed:', error);
      }
      
      // Wait for the map to fully initialize and ensure style is loaded
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ensure map style is loaded before creating hexagon grid
      if (!map.value.isStyleLoaded()) {
        await new Promise(resolve => {
          map.value.once('styledata', resolve);
        });
      }
      
      // Create hexagon grid
      currentResolution.value = getResolutionForZoom(currentZoom.value);
      await createHexagonGrid(currentZoom.value);
      
      // Update hexagon border style for current theme
      updateHexagonBorderStyle(isDark.value);
      
      // Verify hexagon layers are created
      setTimeout(() => {
        if (map.value) {
          // Check if layers are visible
          const fillLayer = map.value.getLayer('hexagon-grid-fill');
          const borderLayer = map.value.getLayer('hexagon-grid-border');
          const source = map.value.getSource('hexagon-grid');
          
          if (!fillLayer || !borderLayer || !source) {
            console.error('❌ Missing hexagon layers or source');
          }
        }
      }, 1000);
      
      // Load fire data
      await loadFireData();
      
      // Set up interactions (only once)
      setupHexagonInteractions(map.value!);
      
      // Register event handlers
      registerZoomHandler(onZoomChange);
      registerMoveHandler(onMoveEnd);
    });
  };

// Handle zoom changes
const onZoomChange = async () => {
  if (isZoomChanging.value) return;
  
  if (!map.value || !map.value.isStyleLoaded()) return;
  
  // Clear any existing timeout
  if (zoomChangeTimeout) {
    clearTimeout(zoomChangeTimeout);
  }
  
  // Set a timeout to debounce rapid zoom changes
  zoomChangeTimeout = setTimeout(async () => {
    isZoomChanging.value = true;
    
    try {
      // Only recreate hexagon grid if resolution actually changed
      const newResolution = getResolutionForZoom(currentZoom.value);
      
      if (newResolution !== currentResolution.value) {
        console.log(`Resolution changed from ${currentResolution.value} to ${newResolution}, recreating grid...`);
        
        // Update current resolution
        currentResolution.value = newResolution;
        
        // Create new hexagon grid with current zoom (this will handle layer removal internally)
        await createHexagonGrid(currentZoom.value);
        
        // Reload fire data to update aggregation for new resolution
        await loadFireData();
      } else {
        console.log(`Resolution unchanged (${newResolution}), updating viewport...`);
        // Update the hexagon grid for new viewport to ensure visibility
        await updateHexagonGridForViewport(currentZoom.value);
        
        // Reapply fire styling without loading new data (no spinner)
        reapplyFireStyling();
      }
    } finally {
      isZoomChanging.value = false;
    }
  }, 300); // 300ms debounce delay
};

// Handle move end (pan/drag) events
const onMoveEnd = async () => {
  if (!map.value || !map.value.isStyleLoaded()) return;
  
  // Only update if we're at the same resolution (no zoom change)
  const newResolution = getResolutionForZoom(currentZoom.value);
  if (newResolution === currentResolution.value) {
    // Update the hexagon grid for the new viewport
    await updateHexagonGridForViewport(currentZoom.value);
    
    // Reapply fire styling without loading new data (no spinner)
    reapplyFireStyling();
  }
};





// Set up zoom change listeners
const setupZoomListeners = () => {
  if (!map.value) return;

  map.value.on('zoomend', async () => {
    await onZoomChange();
  });

  map.value.on('moveend', async () => {
    const newZoom = map.value!.getZoom();
    if (newZoom !== currentZoom.value) {
      await onZoomChange();
    }
  });
};

// Watchers
watch(selectedDate, () => {
  if (map.value?.isStyleLoaded()) {
    loadFireData();
  }
});

watch(fireMode, () => {
  if (map.value?.isStyleLoaded()) {
    loadFireData();
  }
});

watch(dateRange, () => {
  if (map.value?.isStyleLoaded() && fireMode.value === 'cumulated') {
    loadFireData();
  }
}, { deep: true });

// Watch for theme changes to reinitialize map data when map is recreated
watch(isDark, async (newValue, oldValue) => {
  // Wait a bit for the map style to be updated by useMap
  setTimeout(async () => {
    if (map.value?.isStyleLoaded()) {
      updateHexagonBorderStyle(newValue);
    }
  }, 1000);
});

// Listen for map style change completion
const handleMapStyleChanged = async () => {
  try {
    // Wait for the map to be fully loaded
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for map to be ready'));
      }, 5000);
      
      const checkMapReady = () => {
        if (map.value?.isStyleLoaded()) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkMapReady, 100);
        }
      };
      checkMapReady();
    });
    
    // Wait a bit for the map to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Try to recreate hexagon grid from cache first (no API call)
    const cacheSuccess = recreateHexagonGridFromCache();
    
    // If cache recreation failed, fall back to fetching data
    if (!cacheSuccess) {
      currentResolution.value = getResolutionForZoom(currentZoom.value);
      await createHexagonGrid(currentZoom.value);
    }
    
    // Update hexagon border style for the new theme
    updateHexagonBorderStyle(isDark.value);
    
    // Reapply fire data styling to restore colored hexagons
    reapplyFireStyling();
    
    // Re-setup interactions (this doesn't reload data)
    setupHexagonInteractions(map.value!);
  } catch (error) {
    console.error('Error recreating hexagon grid after theme change:', error);
    // Try to recover by recreating the hexagon grid
    try {
      await createHexagonGrid(currentZoom.value);
      updateHexagonBorderStyle(isDark.value);
    } catch (recoveryError) {
      console.error('Failed to recover hexagon grid:', recoveryError);
    }
  }
};

// Add event listener for map style changes
onMounted(() => {
  window.addEventListener('mapStyleChanged', handleMapStyleChanged);
});

onUnmounted(() => {
  window.removeEventListener('mapStyleChanged', handleMapStyleChanged);
});

// Lifecycle
onMounted(() => {
  initializeMapAndData();
  setupZoomListeners();
});
</script>

<style scoped>
.fire-map-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.map-title {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: var(--bg-primary, rgba(255, 255, 255, 0.9));
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
  border: 1px solid var(--border-primary, #dee2e6);
  display: flex;
  align-items: center;
  height: 40px;
}

.map-title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #212529);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.map-container {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--loading-bg, rgba(255, 255, 255, 0.9));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--error-bg, rgba(255, 255, 255, 0.95));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-content {
  text-align: center;
  padding: 20px;
  background: var(--bg-primary, white);
  border: 1px solid var(--error-border, #dc3545);
  border-radius: 8px;
  box-shadow: var(--shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  color: var(--text-primary, #212529);
}

.error-content h3 {
  color: var(--error-border, #e74c3c);
  margin-bottom: 10px;
}

.retry-button {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-button:hover {
  background: #2980b9;
}

.debug-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
}

.debug-button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-button:hover {
  background: #c0392b;
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .map-title {
    top: 10px;
    left: 10px;
    right: 10px;
    padding: 6px 12px;
    height: auto;
    min-height: 36px;
  }

  .map-title h1 {
    font-size: 16px;
    line-height: 1.2;
  }

  .error-content {
    margin: 20px;
    padding: 16px;
  }

  .error-content h3 {
    font-size: 16px;
  }

  .retry-button {
    padding: 12px 24px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .map-title {
    top: 8px;
    left: 8px;
    right: 8px;
    padding: 4px 8px;
    min-height: 32px;
  }

  .map-title h1 {
    font-size: 14px;
  }

  .error-content {
    margin: 16px;
    padding: 12px;
  }

  .error-content h3 {
    font-size: 14px;
  }

  .retry-button {
    padding: 10px 20px;
    font-size: 14px;
  }
}
</style>
