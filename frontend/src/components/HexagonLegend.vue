<template>
  <div class="hexagon-legend" :class="{ 'legend-expanded': isLegendExpanded }">
    <div class="legend-header">
      <div class="date-section">
        <!-- Current Situation: Show timestamp instead of date picker -->
        <div v-if="fireMode === 'current'" class="current-situation">
          <div class="situation-row">
            <span class="situation-label">{{ t('legend.currentSituation') }}</span>
            <span class="fire-count-kpi">{{ fireData?.count || 0 }} {{ t('stats.fires') }}</span>
          </div>
          <div class="situation-row">
            <span v-if="lastCollectionTime" class="situation-time">
              {{ formatSituationTime(lastCollectionTime) }}
            </span>
            <span class="area-kpi">{{ totalAreaFormatted }} {{ t('stats.burnt') }}</span>
          </div>
        </div>
        <!-- Cumulated Situation: Show date picker -->
        <div v-else>
          <label>{{ t('controls.dateRange.label') }}</label>
          <DatePicker 
            :modelValue="selectedDate" 
            @update:modelValue="onSelectedDateChange"
            :mode="fireMode" 
            :dataRange="dataRange"
            @update:dateRange="onDateRangeChange"
          />
        </div>
      </div>
      
      <!-- Mobile Legend Toggle Button -->
      <button 
        v-if="isMobile" 
        @click="toggleLegend" 
        class="legend-toggle-btn"
        :aria-label="isLegendExpanded ? t('legend.hideLegend') : t('legend.showLegend')"
      >
        <span class="toggle-text">{{ isLegendExpanded ? t('legend.hideLegend') : t('legend.showLegend') }}</span>
        <span class="toggle-icon" :class="{ 'expanded': isLegendExpanded }">▼</span>
      </button>
    </div>
    
    <div class="legend-content" :class="{ 'content-visible': isLegendExpanded || !isMobile }">
      <div class="legend-items">
        <div class="legend-item">
          <div class="color-box no-fire"></div>
          <span>{{ t('legend.noFire') }}</span>
        </div>
        
        <div class="legend-item">
          <div class="color-box small-fire"></div>
          <span>{{ t('legend.smallFire') }} (&lt; 10 ha)</span>
        </div>
        
        <div class="legend-item">
          <div class="color-box medium-fire"></div>
          <span>{{ t('legend.mediumFire') }} (10-100 ha)</span>
        </div>
        
        <div class="legend-item">
          <div class="color-box large-fire"></div>
          <span>{{ t('legend.largeFire') }} (&gt; 100 ha)</span>
        </div>
      </div>
      
      <div class="resolution-info">
        <span>{{ t('legend.hexagonArea') }}: {{ hexagonAreaFormatted }}</span>
      </div>
      <div class="data-source">
        <a href="https://forest-fire.emergency.copernicus.eu" target="_blank" rel="noopener noreferrer">
          {{ t('legend.dataSource') }}
        </a>
      </div>
      <div class="made-in">
        {{ t('legend.madeIn') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getHexagonAreaAvg } from 'h3-js';
import DatePicker from './DatePicker.vue';

interface Props {
  currentResolution: number;
  fireData: { results: any[]; count: number };
  selectedDate: string;
  lastCollectionTime?: string;
  fireMode: 'current' | 'cumulated';
  dateRange?: { start: string; end: string };
}

interface Emits {
  (e: 'update:selectedDate', value: string): void;
  (e: 'update:dateRange', value: { start: string; end: string }): void;
  (e: 'legendToggle', expanded: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

// Mobile detection and legend state
const isMobile = ref(false);
const isLegendExpanded = ref(false);

// Check if mobile on mount and resize
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const toggleLegend = () => {
  isLegendExpanded.value = !isLegendExpanded.value;
  // Emit event to parent to control FireModeToggle visibility
  emit('legendToggle', isLegendExpanded.value);
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// Calculate hexagon area based on resolution
const hexagonArea = computed(() => {
  return getHexagonAreaAvg(props.currentResolution, 'km2');
});

const hexagonAreaFormatted = computed(() => {
  const area = hexagonArea.value;
  const areaHa = area * 100; // Convert km² to ha
  
  if (areaHa >= 1000) {
    return `${(areaHa / 1000).toFixed(1)}k ha`;
  } else {
    return `${Math.round(areaHa)} ha`;
  }
});

// Calculate total area
const totalAreaFormatted = computed(() => {
  if (!props.fireData?.results) return '0 ha';
  
  const totalArea = props.fireData.results.reduce((sum, fire) => {
    return sum + (fire.area_ha || 0);
  }, 0);
  
  if (totalArea >= 1000) {
    return `${(totalArea / 1000).toFixed(1)}k ha`;
  } else {
    return `${Math.round(totalArea)} ha`;
  }
});

// Format situation time
const formatSituationTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Date range handling
const dataRange = computed(() => props.dateRange);

// Date picker computed for two-way binding
const selectedDate = computed({
  get: () => props.selectedDate,
  set: (value: string) => emit('update:selectedDate', value)
});

const onSelectedDateChange = (value: string) => {
  emit('update:selectedDate', value);
};

const onDateRangeChange = (range: { start: string; end: string }) => {
  emit('update:dateRange', range);
};
</script>

<style scoped>
.hexagon-legend {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--legend-bg, white);
  border: 1px solid var(--legend-border, #e9ecef);
  border-radius: 8px;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
  padding: 16px;
  min-width: 300px;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--legend-text, #212529);
  transition: all 0.3s ease;
}

.legend-header {
  margin-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.date-section {
  margin-bottom: 12px;
}

.date-section label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--legend-text, #212529);
}

.current-situation {
  padding: 8px 12px;
  background: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-primary, #dee2e6);
  border-radius: 6px;
  margin-bottom: 8px;
}

.situation-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.situation-row:last-child {
  margin-bottom: 0;
}

.situation-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--legend-text, #212529);
}

.fire-count-kpi {
  font-weight: 700;
  color: var(--text-primary, #212529);
  font-size: 14px;
  background: var(--bg-secondary, #f8f9fa);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-primary, #dee2e6);
}

.area-kpi {
  font-weight: 600;
  color: var(--legend-text-secondary, #6c757d);
  font-size: 12px;
  background: var(--bg-tertiary, #e9ecef);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid var(--border-secondary, #dee2e6);
}

.situation-time {
  font-size: 12px;
  color: var(--legend-text-secondary, #6c757d);
  font-weight: 500;
}

.resolution-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--legend-text-secondary, #6c757d);
  text-align: center;
}

.resolution-info span {
  font-weight: 500;
  color: var(--legend-text-secondary, #6c757d);
}

.data-source {
  margin-top: 8px;
  font-size: 12px;
  color: var(--legend-text-secondary, #6c757d);
  text-align: center;
}

.data-source a {
  color: var(--link-color, #007bff);
  text-decoration: none;
}

.data-source a:hover {
  text-decoration: underline;
}

.made-in {
  margin-top: 4px;
  font-size: 11px;
  color: var(--legend-text-secondary, #6c757d);
  text-align: center;
  font-style: italic;
}

.collection-time {
  color: var(--legend-text-secondary, #6c757d);
  font-style: italic;
}

.legend-content {
  margin-top: 12px;
  transition: all 0.3s ease;
}

.legend-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  justify-content: center;
  margin-bottom: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--legend-text, #495057);
  white-space: nowrap;
}

.color-box {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #dee2e6;
}

.color-box.no-fire {
  background-color: var(--legend-no-fire-color, #f8f9fa);
}

.color-box.small-fire {
  background-color: var(--legend-small-fire-color, #ff6b6b);
}

.color-box.medium-fire {
  background-color: var(--legend-medium-fire-color, #ff8e53);
}

.color-box.large-fire {
  background-color: var(--legend-large-fire-color, #ff4757);
}

/* Legend Toggle Button */
.legend-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-secondary, #f8f9fa);
  border: 1px solid var(--border-primary, #dee2e6);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
  color: var(--legend-text, #495057);
  margin-top: 8px;
}

.legend-toggle-btn:hover {
  background: var(--bg-tertiary, #e9ecef);
  border-color: var(--border-secondary, #adb5bd);
}

.toggle-text {
  font-weight: 500;
}

.toggle-icon {
  font-size: 10px;
  transition: transform 0.3s ease;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .hexagon-legend {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    min-width: auto;
    padding: 12px;
  }

  .legend-content {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    margin-top: 0;
  }

  .legend-content.content-visible {
    max-height: 500px;
    opacity: 1;
    margin-top: 12px;
  }

  .legend-header {
    margin-bottom: 0;
    border-bottom: none;
    padding-bottom: 0;
  }

  .date-section {
    margin-bottom: 0;
  }

  .current-situation {
    margin-bottom: 0;
  }

  .legend-toggle-btn {
    margin-top: 8px;
    padding: 6px 10px;
    font-size: 12px;
  }

  .legend-items {
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }

  .legend-item {
    font-size: 11px;
  }

  .color-box {
    width: 14px;
    height: 14px;
  }

  .situation-row {
    margin-bottom: 3px;
  }

  .situation-label {
    font-size: 12px;
  }

  .fire-count-kpi {
    font-size: 13px;
    padding: 3px 6px;
  }

  .area-kpi {
    font-size: 11px;
    padding: 2px 4px;
  }

  .situation-time {
    font-size: 11px;
  }

  .resolution-info {
    font-size: 11px;
  }

  .data-source {
    font-size: 11px;
  }

  .made-in {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .hexagon-legend {
    bottom: 8px;
    left: 8px;
    right: 8px;
    padding: 10px;
  }

  .legend-toggle-btn {
    padding: 5px 8px;
    font-size: 11px;
  }

  .legend-content.content-visible {
    margin-top: 8px;
  }

  .current-situation {
    padding: 6px 8px;
  }

  .situation-row {
    margin-bottom: 2px;
  }

  .situation-label {
    font-size: 11px;
  }

  .fire-count-kpi {
    font-size: 12px;
    padding: 2px 4px;
  }

  .area-kpi {
    font-size: 10px;
    padding: 1px 3px;
  }

  .situation-time {
    font-size: 10px;
  }

  .legend-items {
    gap: 6px;
    margin-bottom: 8px;
  }

  .legend-item {
    font-size: 10px;
    gap: 4px;
  }

  .color-box {
    width: 12px;
    height: 12px;
  }

  .resolution-info {
    font-size: 10px;
  }

  .data-source {
    font-size: 10px;
    margin-top: 6px;
  }

  .made-in {
    font-size: 9px;
    margin-top: 3px;
  }
}
</style>
