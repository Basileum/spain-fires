<template>
  <div v-if="isDebugMode" class="map-controls">
    <!-- Date Selector -->
    <div class="control-group">
      <label for="date-selector">{{ t('controls.date.label') }}</label>
      <input
        id="date-selector"
        type="date"
        v-model="selectedDate"
        :placeholder="t('controls.date.placeholder')"
        class="date-input"
      />
    </div>



    <!-- Zoom Info -->
    <div class="zoom-info">
      <div>{{ t('controls.zoom.current') }}: {{ currentZoom }}</div>
      <div>{{ t('controls.zoom.resolution') }}: {{ getResolutionForZoom(currentZoom) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  selectedDate: string;
  currentZoom: number;
  getResolutionForZoom: (zoom: number) => number;
}

interface Emits {
  (e: 'update:selectedDate', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

// Check if debug mode is enabled via URL parameter
const isDebugMode = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === 'true';
});

// Computed for two-way binding
const selectedDate = computed({
  get: () => props.selectedDate,
  set: (value: string) => emit('update:selectedDate', value)
});
</script>

<style scoped>
.map-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 250px;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.date-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}



.zoom-info {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.zoom-info div {
  margin-bottom: 5px;
}
</style>
