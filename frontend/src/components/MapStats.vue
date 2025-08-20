<template>
  <div class="map-stats">
    <div class="stats-header">
      <h3>{{ t('stats.title') }}</h3>
    </div>
    
    <div class="stats-content">
      <div class="stat-item">
        <span class="stat-label">{{ t('stats.fires', { count: fireData.count }) }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">{{ t('stats.date') }}: {{ formatDate(selectedDate) }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <h4>{{ t('legend.title') }}</h4>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-color small"></div>
          <span>{{ t('legend.small') }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color medium"></div>
          <span>{{ t('legend.medium') }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color large"></div>
          <span>{{ t('legend.large') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface Props {
  fireData: { results: any[]; count: number };
  selectedDate: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};
</script>

<style scoped>
.map-stats {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
}

.stats-header h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.stats-content {
  margin-bottom: 20px;
}

.stat-item {
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.legend h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.legend-color.small {
  background-color: #ff6b6b;
}

.legend-color.medium {
  background-color: #ff8e53;
}

.legend-color.large {
  background-color: #ff4757;
}

.legend-item span {
  font-size: 12px;
  color: #666;
}
</style>
