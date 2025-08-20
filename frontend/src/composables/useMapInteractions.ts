import { useI18n } from 'vue-i18n';
import maplibregl from 'maplibre-gl';
import type { FireData } from '@/types';

export function useMapInteractions() {
  const { t } = useI18n();

  const setupHexagonInteractions = (map: any) => {
    if (!map) return;

    // Create popup for hexagons with fire data
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    // Add mouse enter event for hexagons
    map.on('mouseenter', 'hexagon-grid-fill', (e: any) => {
      if (!e.features?.[0]) return;
      
      const feature = e.features[0];
      const properties = feature.properties;
      
      if (properties.hasFireData && properties.fires && Array.isArray(properties.fires)) {
        map.getCanvas().style.cursor = 'pointer';
        
        const fireInfo = properties.fires.map((fire: FireData) => 
          `${fire.province}, ${fire.commune}: ${fire.area_ha.toFixed(1)} ha`
        ).join('<br>');
        
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="popup-content">
              <h4>Hexagon ${properties.h3Index}</h4>
              <p><strong>${t('popup.totalArea', { area: (properties.totalArea || 0).toFixed(1) })}</strong></p>
              <p><strong>${t('popup.fireCount', { count: properties.fireCount || 0 })}</strong></p>
              <p><strong>${t('popup.fires')}:</strong></p>
              <div style="max-height: 200px; overflow-y: auto;">
                ${fireInfo || 'No fire details available'}
              </div>
            </div>
          `)
          .addTo(map);
      } else {
        map.getCanvas().style.cursor = '';
      }
    });

    // Add mouse leave event for hexagons
    map.on('mouseleave', 'hexagon-grid-fill', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    // Add click event for hexagons
    map.on('click', 'hexagon-grid-fill', (e: any) => {
      if (!e.features?.[0]) return;
      
      const feature = e.features[0];
      const properties = feature.properties;
      
      if (properties.hasFireData && properties.fires && Array.isArray(properties.fires)) {
        const fireInfo = properties.fires.map((fire: FireData) => 
          `${fire.province}, ${fire.commune}: ${fire.area_ha.toFixed(1)} ha`
        ).join('<br>');
        
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="popup-content">
              <h4>Hexagon ${properties.h3Index}</h4>
              <p><strong>${t('popup.totalArea', { area: (properties.totalArea || 0).toFixed(1) })}</strong></p>
              <p><strong>${t('popup.fireCount', { count: properties.fireCount || 0 })}</strong></p>
              <p><strong>${t('popup.fires')}:</strong></p>
              <div style="max-height: 200px; overflow-y: auto;">
                ${fireInfo || 'No fire details available'}
              </div>
            </div>
          `)
          .addTo(map);
      }
    });
  };

  return {
    setupHexagonInteractions
  };
}
