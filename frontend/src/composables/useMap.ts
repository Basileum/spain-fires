import { ref, onMounted, onUnmounted, type Ref, watch } from 'vue';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useDarkMode } from './useDarkMode';

export function useMap(): {
  map: Ref<any>;
  currentZoom: Ref<number>;
  initializeMap: () => void;
  destroyMap: () => void;
  onZoomChange: (callback: () => void) => void;
  onMoveEnd: (callback: () => void) => void;
  updateMapStyle: () => void;
  testMapStyles: () => void;
} {
  const map = ref<any>(null);
  const currentZoom = ref(6);
  const zoomCallbacks: (() => void)[] = [];
  const moveCallbacks: (() => void)[] = [];
  const { isDark } = useDarkMode();

  // Check if device is mobile
  const isMobile = () => {
    return window.innerWidth <= 768;
  };

  // Spain bounding box coordinates
  const spainBounds = [
    [-9.3929, 35.9469], // Southwest corner (longitude, latitude)
    [3.3219, 43.7904]   // Northeast corner (longitude, latitude)
  ];

  const getMapStyle = () => {
    const style = isDark.value 
      ? 'https://tiles.versatiles.org/assets/styles/eclipse/style.json'
      : 'https://tiles.versatiles.org/assets/styles/colorful/style.json';
    return style;
  };

  // Test function to verify map style URLs
  const testMapStyles = async () => {
    const lightStyle = 'https://tiles.versatiles.org/assets/styles/colorful/style.json';
    const darkStyle = 'https://tiles.versatiles.org/assets/styles/eclipse/style.json';
    
    try {
      const lightResponse = await fetch(lightStyle);
      const darkResponse = await fetch(darkStyle);
      
      if (!lightResponse.ok || !darkResponse.ok) {
        console.error('One or both map styles are not accessible');
      }
    } catch (error) {
      console.error('Error testing map styles:', error);
    }
  };

  const initializeMap = () => {
    // Test map styles first
    testMapStyles();
    
    const initialStyle = getMapStyle();
    
    const mapConfig: any = {
      container: 'map',
      style: initialStyle,
      maxZoom: 18,
      minZoom: 0
    };

    // Mobile-specific initialization
    if (isMobile()) {
      mapConfig.fitBounds = spainBounds;
      mapConfig.fitBoundsOptions = {
        padding: 20, // Add some padding around the bounds
        maxZoom: 7   // Limit max zoom to ensure full territory visibility
      };
    } else {
      // Desktop initialization
      mapConfig.center = [-3.7492, 40.4637]; // Spain center
      mapConfig.zoom = currentZoom.value;
    }
    
    map.value = new maplibregl.Map(mapConfig);

    // Set up zoom and move event listeners
    map.value.on('zoomend', () => {
      const newZoom = map.value!.getZoom();
      currentZoom.value = newZoom;
      
      // Notify all zoom change callbacks
      zoomCallbacks.forEach(callback => callback());
    });

    map.value.on('moveend', () => {
      const newZoom = map.value!.getZoom();
      if (newZoom !== currentZoom.value) {
        currentZoom.value = newZoom;
      }
      
      // Notify all move end callbacks
      moveCallbacks.forEach(callback => callback());
    });

    // For mobile, ensure the bounds are properly set after map loads
    if (isMobile()) {
      map.value.on('load', () => {
        map.value.fitBounds(spainBounds, {
          padding: 20,
          maxZoom: 7
        });
      });
    }
  };

  const onZoomChange = (callback: () => void) => {
    zoomCallbacks.push(callback);
  };

  const onMoveEnd = (callback: () => void) => {
    moveCallbacks.push(callback);
  };

  const updateMapStyle = async () => {
    if (!map.value) {
      return;
    }

    const newStyle = getMapStyle();
    
    try {
      await map.value.setStyle(newStyle);
    } catch (error) {
      console.error('Error updating map style:', error);
    }
  };

  // Watch for theme changes and update map style
  watch(isDark, (newValue, oldValue) => {
    console.log(`Theme changed from ${oldValue} to ${newValue}`);
    if (map.value && map.value.isStyleLoaded()) {
      console.log('Calling updateMapStyle...');
      updateMapStyle();
    } else {
      console.log('Map not ready for style update, will retry in 500ms');
      // Retry after a short delay if map is not ready
      setTimeout(() => {
        if (map.value && map.value.isStyleLoaded()) {
          console.log('Retrying updateMapStyle...');
          updateMapStyle();
        } else {
          console.log('Map still not ready for style update');
        }
      }, 500);
    }
  });

  const destroyMap = () => {
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  };

  onUnmounted(() => {
    destroyMap();
  });

  return {
    map,
    currentZoom,
    initializeMap,
    destroyMap,
    onZoomChange,
    onMoveEnd,
    updateMapStyle,
    testMapStyles
  };
}
