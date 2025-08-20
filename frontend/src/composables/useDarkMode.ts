import { ref, watch, onMounted } from 'vue';

export type ThemeMode = 'dark' | 'light' | 'auto';

// Singleton state
let themeInstance: ReturnType<typeof createDarkModeInstance> | null = null;
let isInitialized = false;

function createDarkModeInstance() {
  const theme = ref<ThemeMode>('auto');
  const isDark = ref(false);

  // Check if system prefers dark mode
  const getSystemPreference = (): boolean => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // Apply theme to document
  const applyTheme = (newTheme: ThemeMode) => {
    const shouldBeDark = newTheme === 'dark' || (newTheme === 'auto' && getSystemPreference());
    
    console.log(`applyTheme called with theme: ${newTheme}, shouldBeDark: ${shouldBeDark}, current isDark: ${isDark.value}`);
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      isDark.value = true;
      console.log('Applied dark theme, isDark set to true');
    } else {
      document.documentElement.classList.remove('dark');
      isDark.value = false;
      console.log('Applied light theme, isDark set to false');
    }
  };

  // Initialize theme from localStorage or default to auto
  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme && ['dark', 'light', 'auto'].includes(savedTheme)) {
      theme.value = savedTheme;
    } else {
      theme.value = 'auto';
    }
    applyTheme(theme.value);
  };

  // Set theme and save to localStorage
  const setTheme = (newTheme: ThemeMode) => {
    console.log(`setTheme called with: ${newTheme}, current theme: ${theme.value}`);
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    console.log(`Theme saved to localStorage: ${newTheme}`);
    applyTheme(newTheme);
  };

  // Watch for system preference changes when in auto mode
  const setupSystemPreferenceListener = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme.value === 'auto') {
        applyTheme('auto');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup function
    return () => mediaQuery.removeEventListener('change', handleChange);
  };

  // Watch theme changes
  watch(theme, (newTheme) => {
    applyTheme(newTheme);
  });

  // Initialize if not already done
  if (!isInitialized) {
    initializeTheme();
    setupSystemPreferenceListener();
    isInitialized = true;
  }

  return {
    theme,
    isDark,
    setTheme,
    getSystemPreference
  };
}

export function useDarkMode() {
  if (!themeInstance) {
    themeInstance = createDarkModeInstance();
  }
  return themeInstance;
}
