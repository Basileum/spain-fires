<template>
  <div class="top-controls">
    <!-- Theme Toggle -->
    <ThemeToggle />
    
    <!-- Language Selector -->
    <div class="language-selector">
      <div class="language-dropdown" @click="toggleLanguageDropdown">
        <span class="current-language">{{ SUPPORTED_LOCALES[currentLanguage] }}</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      <div v-if="showLanguageDropdown" class="language-options">
        <div
          v-for="(name, code) in sortedLanguages"
          :key="code"
          :class="['language-option', { active: currentLanguage === code }]"
          @click="selectLanguage(code)"
        >
          {{ name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LOCALES, setLocale, getCurrentLocale } from '@/i18n';
import ThemeToggle from './ThemeToggle.vue';

const { t } = useI18n();

// Language selector state
const currentLanguage = ref(getCurrentLocale());
const showLanguageDropdown = ref(false);

// Sort languages alphabetically
const sortedLanguages = computed(() => {
  return Object.entries(SUPPORTED_LOCALES)
    .sort(([, a], [, b]) => a.localeCompare(b))
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {} as Record<string, string>);
});

const toggleLanguageDropdown = () => {
  showLanguageDropdown.value = !showLanguageDropdown.value;
};

const selectLanguage = (code: string) => {
  currentLanguage.value = code;
  setLocale(code);
  showLanguageDropdown.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.language-selector')) {
    showLanguageDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.top-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: row;
  gap: 12px;
  z-index: 1000;
}

.language-selector {
  position: relative;
  display: inline-block;
}

.language-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--dropdown-bg, rgba(255, 255, 255, 0.9));
  border: 1px solid var(--dropdown-border, #dee2e6);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
  color: var(--legend-text, #495057);
  box-shadow: var(--shadow, 0 2px 8px rgba(0, 0, 0, 0.15));
  height: 40px;
}

.language-dropdown:hover {
  border-color: #007bff;
  background: var(--dropdown-hover-bg, #f8f9fa);
}

.current-language {
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.language-dropdown:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.language-options {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--dropdown-bg, white);
  border: 1px solid var(--dropdown-border, #dee2e6);
  border-radius: 6px;
  box-shadow: var(--shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  z-index: 1001;
  min-width: 120px;
}

.language-option {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 13px;
  color: var(--legend-text, #495057);
  white-space: nowrap;
}

.language-option:hover {
  background: var(--dropdown-hover-bg, #f8f9fa);
}

.language-option.active {
  background: #007bff;
  color: white;
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .top-controls {
    top: 10px;
    right: 10px;
    gap: 8px;
  }

  .language-dropdown {
    padding: 6px 10px;
    font-size: 12px;
    height: 36px;
  }

  .language-options {
    min-width: 100px;
  }

  .language-option {
    padding: 6px 10px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .top-controls {
    top: 8px;
    right: 8px;
    gap: 6px;
  }

  .language-dropdown {
    padding: 4px 8px;
    font-size: 11px;
    height: 32px;
  }

  .language-options {
    min-width: 90px;
  }

  .language-option {
    padding: 4px 8px;
    font-size: 11px;
  }
}
</style>
