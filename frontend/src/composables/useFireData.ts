import { ref, watch } from 'vue';
import { latLngToCell, polygonToCells } from 'h3-js';
import { FireDataService } from '@/services/api';
import type { FireData } from '@/types';
import type { Ref } from 'vue';
import type { Map as MapLibreMap } from 'maplibre-gl';

const fireDataService = new FireDataService();

export function useFireData(
  map: Ref<any>,
  currentZoom: Ref<number>,
  getResolutionForZoom: (zoom: number) => number
) {
  const fireData = ref<{ results: FireData[]; count: number }>({ results: [], count: 0 });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedDate = ref(new Date().toISOString().split('T')[0]);
  const fireMode = ref<'current' | 'cumulated'>('current');
  const dateRange = ref<{ start: string; end: string }>({ 
    start: '2025-01-01', 
    end: new Date().toISOString().split('T')[0] 
  });

  // Function to get the actual data range from the API
  const getActualDataRange = async () => {
    try {
      const dataRange = await fireDataService.getDataRange();
      
      if (dataRange && dataRange.start && dataRange.end) {
        dateRange.value = {
          start: dataRange.start,
          end: dataRange.end
        };
      }
    } catch (error) {
      console.error('🔥 Error fetching actual data range:', error);
      // Keep the default date range if API call fails
    }
  };

  const getFireSize = (area: number): string => {
    if (area < 10) return 'small';
    if (area < 100) return 'medium';
    return 'large';
  };

  const loadFireData = async () => {
    if (!map.value) return;

    loading.value = true;
    error.value = null;

    try {
      // Get the actual data range first
      await getActualDataRange();
      
      if (fireMode.value === 'current') {
        const data = await fireDataService.getCurrentData();
        fireData.value = data;
        
        // Always add fire data layer, even if empty
        addFireDataToMap(data.results || []);
      } else {
        // Cumulated mode
        const resolution = getResolutionForZoom(currentZoom.value);
        const data = await fireDataService.getCumulatedFireData(
          dateRange.value.start,
          dateRange.value.end,
          resolution
        );
        
        // Convert cumulated data to the expected format
        fireData.value = {
          results: [], // We don't need individual fire objects for cumulated mode
          count: data.data.totalFires
        };
        
        // Add cumulated fire data to map
        addCumulatedFireDataToMap(data.data);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load fire data';
      console.error('Error loading fire data:', err);
      // Still show hexagon grid even if fire data fails to load
      if (fireMode.value === 'current') {
        addFireDataToMap([]);
      } else {
        addCumulatedFireDataToMap({ hexagonData: {}, resolution: 0, dateRange: { start: '', end: '' }, totalFires: 0, totalArea: 0 });
      }
    } finally {
      loading.value = false;
    }
  };

  // Function to reapply fire styling without loading new data (no spinner)
  const reapplyFireStyling = () => {
    if (!map.value) return;

    console.log('🔥 Reapplying fire styling to existing hexagon grid...');

    try {
      if (fireMode.value === 'current') {
        // Reapply current fire data styling
        addFireDataToMap(fireData.value.results || []);
      } else {
        // Reapply cumulated fire data styling
        // We need to reconstruct the cumulated data structure
        const resolution = getResolutionForZoom(currentZoom.value);
        const mockCumulatedData = {
          resolution,
          hexagonData: {}, // This will be populated by addCumulatedFireDataToMap
          dateRange: dateRange.value,
          totalFires: fireData.value.count,
          totalArea: 0
        };
        addCumulatedFireDataToMap(mockCumulatedData);
      }
    } catch (err) {
      console.error('Error reapplying fire styling:', err);
    }
  };

  const addFireDataToMap = (fires: FireData[]) => {
    if (!map.value) return;

    console.log('🔥 Adding fire data to map:', fires.length, 'fires');

    // Remove existing fire layers
    clearFireLayers();

    if (fires.length === 0) {
      console.log('🔥 No fires to display, hexagon grid remains visible');
      // No fires to display, but hexagon grid remains visible
      return;
    }

    // Get the current hexagon grid source
    const hexagonSource = map.value.getSource('hexagon-grid') as maplibregl.GeoJSONSource;
    if (!hexagonSource) {
      console.warn('Hexagon grid source not found, cannot aggregate fire data');
      return;
    }

    // Get current hexagon data
    const hexagonData = hexagonSource.serialize().data as any;
    if (!hexagonData || !hexagonData.features) {
      console.warn('Hexagon grid data not found');
      return;
    }

    // Create a map to aggregate fire data by hexagon
    const hexagonFireMap = new Map<string, {
      totalArea: number;
      fireCount: number;
      fires: FireData[];
    }>();

    // Initialize all hexagons with zero values and ensure properties exist
    hexagonData.features.forEach((hexagon: any) => {
      const h3Index = hexagon.properties.h3Index;
      
      // Ensure hexagon properties are initialized
      if (!hexagon.properties.hasFireData) {
        hexagon.properties.hasFireData = false;
        hexagon.properties.totalArea = 0;
        hexagon.properties.fireCount = 0;
        hexagon.properties.averageArea = 0;
        hexagon.properties.size = 'none';
        hexagon.properties.fires = [];
      }
      
      hexagonFireMap.set(h3Index, {
        totalArea: 0,
        fireCount: 0,
        fires: []
      });
    });

    // Aggregate fire data into hexagons using full polygon
    console.log('🔥 Processing', fires.length, 'fires using full polygon data...');
    
    fires.forEach(fire => {
      const currentResolution = getResolutionForZoom(currentZoom.value);
      
      // Use the full fire polygon instead of just centroid
      if (fire.shape && fire.shape.coordinates && fire.shape.coordinates.length > 0) {
        try {
          // Convert MultiPolygon coordinates to H3 format ([lat, lng] for each coordinate)
          // fire.shape.coordinates is [lng, lat] format, we need [lat, lng] for H3
          const h3Polygons = fire.shape.coordinates.map(polygon => 
            polygon.map(ring => 
              ring.map(coord => [coord[1], coord[0]]) // Swap [lng, lat] to [lat, lng]
            )
          );
          
          console.log('🔥 Processing fire', fire.id, 'with', h3Polygons.length, 'polygons');
          
          // Get all hexagons that intersect with the fire polygon
          const intersectingHexagons = polygonToCells(h3Polygons, currentResolution);
          
          console.log('🔥 Fire', fire.id, 'intersects with', intersectingHexagons.length, 'hexagons');
          
          // Add fire data to all intersecting hexagons
          intersectingHexagons.forEach(h3Index => {
            const hexagonData = hexagonFireMap.get(h3Index);
            if (hexagonData) {
              // Distribute the fire area proportionally among intersecting hexagons
              const areaPerHexagon = fire.area_ha / intersectingHexagons.length;
              hexagonData.totalArea += areaPerHexagon;
              hexagonData.fireCount += 1;
              hexagonData.fires.push(fire);
              console.log('🔥 Added fire to hexagon:', h3Index, 'area contribution:', areaPerHexagon);
            } else {
              console.log('🔥 Fire hexagon not found in current grid:', h3Index);
            }
          });
        } catch (error) {
          console.error('🔥 Error processing fire polygon for fire', fire.id, ':', error);
          // Fallback to centroid method if polygon processing fails
          const [lng, lat] = fire.centroid.coordinates;
          const h3Index = latLngToCell(lat, lng, currentResolution);
          console.log('🔥 Fallback: Fire at', [lng, lat], '-> H3 index:', h3Index);
          
          const hexagonData = hexagonFireMap.get(h3Index);
          if (hexagonData) {
            hexagonData.totalArea += fire.area_ha;
            hexagonData.fireCount += 1;
            hexagonData.fires.push(fire);
            console.log('🔥 Added fire to hexagon (fallback):', h3Index, 'total area:', hexagonData.totalArea);
          } else {
            console.log('🔥 Fire not found in current hexagon grid (fallback):', h3Index);
          }
        }
      } else {
        // Fallback to centroid method if no polygon data
        const [lng, lat] = fire.centroid.coordinates;
        const h3Index = latLngToCell(lat, lng, currentResolution);
        console.log('🔥 No polygon data, using centroid for fire', fire.id, 'at', [lng, lat], '-> H3 index:', h3Index);
        
        const hexagonData = hexagonFireMap.get(h3Index);
        if (hexagonData) {
          hexagonData.totalArea += fire.area_ha;
          hexagonData.fireCount += 1;
          hexagonData.fires.push(fire);
          console.log('🔥 Added fire to hexagon (centroid):', h3Index, 'total area:', hexagonData.totalArea);
        } else {
          console.log('🔥 Fire not found in current hexagon grid (centroid):', h3Index);
        }
      }
    });

    // Update hexagon properties with aggregated fire data
    let hexagonsWithFireData = 0;
    hexagonData.features.forEach((hexagon: any) => {
      const h3Index = hexagon.properties.h3Index;
      const fireData = hexagonFireMap.get(h3Index);
      
      if (fireData && fireData.fireCount > 0) {
        hexagon.properties.hasFireData = true;
        hexagon.properties.totalArea = fireData.totalArea;
        hexagon.properties.fireCount = fireData.fireCount;
        hexagon.properties.averageArea = fireData.totalArea / fireData.fireCount;
        hexagon.properties.size = getFireSize(fireData.totalArea);
        hexagon.properties.fires = fireData.fires;
        hexagonsWithFireData++;
        console.log('🔥 Hexagon with fire data:', h3Index, 'size:', hexagon.properties.size, 'area:', fireData.totalArea);
      } else {
        hexagon.properties.hasFireData = false;
        hexagon.properties.totalArea = 0;
        hexagon.properties.fireCount = 0;
        hexagon.properties.averageArea = 0;
        hexagon.properties.size = 'none';
        hexagon.properties.fires = [];
      }
    });
    console.log('🔥 Total hexagons with fire data:', hexagonsWithFireData, 'out of', hexagonData.features.length);

    // Update the hexagon grid source with fire data
    hexagonSource.setData(hexagonData);

    // Update hexagon grid layer styling to show fire data
    console.log('🔥 Updating hexagon styling for fire data...');
    if (map.value.getLayer('hexagon-grid-fill')) {
      map.value.setPaintProperty('hexagon-grid-fill', 'fill-color', [
        'case',
        ['==', ['get', 'hasFireData'], true],
        [
          'case',
          ['==', ['get', 'size'], 'small'], '#ff6b6b',
          ['==', ['get', 'size'], 'medium'], '#ff8e53',
          '#ff4757'
        ],
        '#f8f9fa' // Default color for hexagons without fire data
      ]);
      
      map.value.setPaintProperty('hexagon-grid-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'hasFireData'], true], 0.7, 0.1
      ]);
      console.log('🔥 Hexagon styling updated for fire data');
    } else {
      console.warn('🔥 Hexagon fill layer not found, cannot update styling');
    }
  };

  const addCumulatedFireDataToMap = (cumulatedData: {
    resolution: number;
    hexagonData: {
      [h3Index: string]: {
        totalArea: number;
        fireCount: number;
        fires: string[];
        size: 'small' | 'medium' | 'large' | 'none';
      };
    };
    dateRange: { start: string; end: string };
    totalFires: number;
    totalArea: number;
  }) => {
    if (!map.value) return;

    console.log('🔥 Adding cumulated fire data to map:', cumulatedData.totalFires, 'fires');

    // Remove existing fire layers
    clearFireLayers();

    if (cumulatedData.totalFires === 0) {
      console.log('🔥 No cumulated fires to display, hexagon grid remains visible');
      return;
    }

    // Get the current hexagon grid source
    const hexagonSource = map.value.getSource('hexagon-grid') as maplibregl.GeoJSONSource;
    if (!hexagonSource) {
      console.warn('Hexagon grid source not found, cannot aggregate cumulated fire data');
      return;
    }

    // Get current hexagon data
    const hexagonData = hexagonSource.serialize().data as any;
    if (!hexagonData || !hexagonData.features) {
      console.warn('Hexagon grid data not found');
      return;
    }

    let hexagonsWithFireData = 0;

    // Update hexagon properties with cumulated fire data
    hexagonData.features.forEach((hexagon: any) => {
      const h3Index = hexagon.properties.h3Index;
      const fireData = cumulatedData.hexagonData[h3Index];

      if (fireData && fireData.fireCount > 0) {
        hexagon.properties.hasFireData = true;
        hexagon.properties.totalArea = fireData.totalArea;
        hexagon.properties.fireCount = fireData.fireCount;
        hexagon.properties.averageArea = fireData.totalArea / fireData.fireCount;
        hexagon.properties.size = fireData.size;
        hexagon.properties.fires = fireData.fires;
        hexagonsWithFireData++;
        console.log('🔥 Hexagon with cumulated fire data:', h3Index, 'size:', hexagon.properties.size, 'area:', fireData.totalArea);
      } else {
        hexagon.properties.hasFireData = false;
        hexagon.properties.totalArea = 0;
        hexagon.properties.fireCount = 0;
        hexagon.properties.averageArea = 0;
        hexagon.properties.size = 'none';
        hexagon.properties.fires = [];
      }
    });
    console.log('🔥 Total hexagons with cumulated fire data:', hexagonsWithFireData, 'out of', hexagonData.features.length);

    // Update the hexagon grid source with cumulated fire data
    hexagonSource.setData(hexagonData);

    // Update hexagon grid layer styling to show cumulated fire data
    console.log('🔥 Updating hexagon styling for cumulated fire data...');
    if (map.value.getLayer('hexagon-grid-fill')) {
      map.value.setPaintProperty('hexagon-grid-fill', 'fill-color', [
        'case',
        ['==', ['get', 'hasFireData'], true],
        [
          'case',
          ['==', ['get', 'size'], 'small'], '#ff6b6b',
          ['==', ['get', 'size'], 'medium'], '#ff8e53',
          '#ff4757'
        ],
        '#f8f9fa' // Default color for hexagons without fire data
      ]);
      
      map.value.setPaintProperty('hexagon-grid-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'hasFireData'], true], 0.7, 0.1
      ]);
      console.log('🔥 Hexagon styling updated for cumulated fire data');
    } else {
      console.warn('🔥 Hexagon fill layer not found, cannot update styling');
    }
  };

  const clearFireLayers = () => {
    if (!map.value) return;

    // Reset hexagon grid styling to default (no fire data)
    if (map.value.getLayer('hexagon-grid-fill')) {
      map.value.setPaintProperty('hexagon-grid-fill', 'fill-color', '#f8f9fa');
      map.value.setPaintProperty('hexagon-grid-fill', 'fill-opacity', 0.1);
    }

    // Clear any fire data from hexagon properties
    const hexagonSource = map.value.getSource('hexagon-grid') as maplibregl.GeoJSONSource;
    if (hexagonSource) {
      const hexagonData = hexagonSource.serialize().data as any;
      if (hexagonData && hexagonData.features) {
        hexagonData.features.forEach((hexagon: any) => {
          hexagon.properties.hasFireData = false;
          hexagon.properties.totalArea = 0;
          hexagon.properties.fireCount = 0;
          hexagon.properties.averageArea = 0;
          hexagon.properties.size = 'none';
          hexagon.properties.fires = [];
        });
        hexagonSource.setData(hexagonData);
      }
    }
  };

  const retryLoad = () => {
    error.value = null;
    loadFireData();
  };

  // Watch for date changes
  watch(selectedDate, () => {
    if (map.value?.isStyleLoaded()) {
      loadFireData();
    }
  });

  return {
    fireData,
    loading,
    error,
    selectedDate,
    fireMode,
    dateRange,
    getFireSize,
    loadFireData,
    reapplyFireStyling,
    addFireDataToMap,
    addCumulatedFireDataToMap,
    clearFireLayers,
    retryLoad
  };
}
