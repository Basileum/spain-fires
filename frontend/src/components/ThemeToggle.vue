<template>
  <div class="theme-toggle">
    <div class="theme-dropdown" @click="toggleDropdown">
      <div class="theme-icon">
        <span v-if="isDark" class="icon">🌙</span>
        <span v-else class="icon">☀️</span>
      </div>
      <span class="dropdown-arrow">▼</span>
    </div>
    
    <div v-if="showDropdown" class="theme-options">
      <div
        v-for="option in themeOptions"
        :key="option.value"
        :class="['theme-option', { active: theme === option.value }]"
        @click="selectTheme(option.value)"
      >
        <span class="option-icon">{{ option.icon }}</span>
        <span class="option-label">{{ t(option.label) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDarkMode, type ThemeMode } from '@/composables/useDarkMode';

const { t } = useI18n();
const { theme, isDark, setTheme } = useDarkMode();

const showDropdown = ref(false);

const themeOptions = computed(() => [
  {
    value: 'light' as ThemeMode,
    icon: '☀️',
    label: 'theme.light'
  },
  {
    value: 'dark' as ThemeMode,
    icon: '🌙',
    label: 'theme.dark'
  },
  {
    value: 'auto' as ThemeMode,
    icon: '🖥️',
    label: 'theme.auto'
  }
]);

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const selectTheme = (newTheme: ThemeMode) => {
  setTheme(newTheme);
  showDropdown.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.theme-toggle')) {
    showDropdown.value = false;
  }
};

// Add click outside listener
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-block;
  width: fit-content;
}

.theme-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--toggle-bg, rgba(255, 255, 255, 0.9));
  border: 1px solid var(--toggle-border, #e9ecef);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: var(--toggle-text, #212529);
  height: 40px;
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
}

.theme-dropdown:hover {
  background: var(--toggle-hover-bg, #f8f9fa);
  border-color: var(--toggle-hover-border, #dee2e6);
}

.theme-icon {
  display: flex;
  align-items: center;
}

.icon {
  font-size: 16px;
}

.dropdown-arrow {
  font-size: 10px;
  color: var(--toggle-arrow, #6c757d);
  transition: transform 0.2s ease;
}

.theme-dropdown:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.theme-options {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--dropdown-bg, #ffffff);
  border: 1px solid var(--dropdown-border, #e9ecef);
  border-radius: 6px;
  box-shadow: var(--shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  z-index: 1000;
  min-width: 140px;
  overflow: hidden;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: var(--text-primary, #212529);
}

.theme-option:hover {
  background: var(--dropdown-hover-bg, #f8f9fa);
}

.theme-option.active {
  background: var(--dropdown-active-bg, #e9ecef);
  color: var(--dropdown-active-text, #495057);
}

.option-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.option-label {
  font-weight: 500;
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .theme-dropdown {
    padding: 6px 10px;
    font-size: 13px;
    height: 36px;
  }

  .icon {
    font-size: 14px;
  }

  .theme-options {
    min-width: 120px;
  }

  .theme-option {
    padding: 8px 10px;
    font-size: 13px;
  }

  .option-icon {
    font-size: 14px;
    width: 18px;
  }
}

@media (max-width: 480px) {
  .theme-dropdown {
    padding: 4px 8px;
    font-size: 12px;
    height: 32px;
  }

  .icon {
    font-size: 12px;
  }

  .theme-options {
    min-width: 100px;
  }

  .theme-option {
    padding: 6px 8px;
    font-size: 12px;
  }

  .option-icon {
    font-size: 12px;
    width: 16px;
  }
}
</style>
