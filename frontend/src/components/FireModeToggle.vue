<template>
  <div class="fire-mode-toggle">
    <div class="toggle-container">
      <!-- Sliding background element -->
      <div 
        class="sliding-background"
        :class="{ 'slide-right': mode === 'cumulated' }"
      ></div>
      
      <button
        :class="['toggle-option', { active: mode === 'current' }]"
        @click="selectMode('current')"
      >
        {{ t('fireMode.current') }}
      </button>
      <button
        :class="['toggle-option', { active: mode === 'cumulated' }]"
        @click="selectMode('cumulated')"
      >
        {{ t('fireMode.cumulated') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  modelValue: 'current' | 'cumulated';
}

interface Emits {
  (e: 'update:modelValue', value: 'current' | 'cumulated'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const mode = computed({
  get: () => props.modelValue,
  set: (value: 'current' | 'cumulated') => emit('update:modelValue', value)
});

const selectMode = (selectedMode: 'current' | 'cumulated') => {
  mode.value = selectedMode;
};
</script>

<style scoped>
.fire-mode-toggle {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.toggle-container {
  display: flex;
  background: var(--fire-mode-bg, rgba(255, 255, 255, 0.9));
  border: 1px solid var(--fire-mode-border, #dee2e6);
  border-radius: 8px;
  padding: 4px;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
  height: 40px;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.sliding-background {
  position: absolute;
  top: 6px;
  left: 10px;
  width: calc(50% - 26px);
  height: calc(100% - 12px);
  background: var(--fire-mode-active-bg, #007bff);
  border-radius: 6px;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.sliding-background.slide-right {
  transform: translateX(100%);
  left: 0 !important;
  width: calc(50% - 7px) !important;
}

.toggle-option {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--fire-mode-inactive-text, #6c757d);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-option:hover {
  color: var(--legend-text, #495057);
}

.toggle-option.active {
  color: white;
  font-weight: 600;
}

/* Mobile Responsive Design */
@media (max-width: 1200px) {
  .toggle-container {
    height: 36px;
    padding: 3px;
  }

  .toggle-option {
    padding: 6px 12px;
    font-size: 13px;
  }

  .sliding-background {
    top: 5px;
    left: 8px;
    width: calc(50% - 20px);
    height: calc(100% - 10px);
  }

  .sliding-background.slide-right {
    width: calc(50% - 5px) !important;
  }
}

@media (max-width: 768px) {
  .fire-mode-toggle {
    position: fixed;
    top: auto;
    bottom: 135px;
    left: 10px;
    right: 10px;
    transform: none;
    z-index: 1001;
  }
}

@media (max-width: 480px) {
  .fire-mode-toggle {
    position: fixed;
    top: auto;
    bottom: 135px;
    left: 8px;
    right: 8px;
    transform: none;
    z-index: 1001;
  }

  .toggle-container {
    height: 32px;
    padding: 2px;
  }

  .toggle-option {
    padding: 4px 8px;
    font-size: 12px;
  }

  .sliding-background {
    top: 4px;
    left: 6px;
    width: calc(50% - 16px);
    height: calc(100% - 8px);
  }

  .sliding-background.slide-right {
    width: calc(50% - 4px) !important;
  }
}
</style>
