import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';
import gl from './locales/gl.json';
import ca from './locales/ca.json';
import eu from './locales/eu.json';
import pt from './locales/pt.json';

export const SUPPORTED_LOCALES = {
  en: 'English',
  es: 'Español',
  gl: 'Galego',
  ca: 'Català',
  eu: 'Euskara',
  pt: 'Português'
} as const;

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES;

const messages = {
  en,
  es,
  gl,
  ca,
  eu,
  pt
};

// Get user's preferred language from localStorage or browser
const getDefaultLocale = (): SupportedLocale => {
  const saved = localStorage.getItem('locale') as SupportedLocale;
  if (saved && saved in SUPPORTED_LOCALES) {
    return saved;
  }
  
  // Try to detect from browser language
  const browserLang = navigator.language.split('-')[0];
  if (browserLang in SUPPORTED_LOCALES) {
    return browserLang as SupportedLocale;
  }
  
  // Default to English
  return 'en';
};

export const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages
});

export function setLocale(locale: SupportedLocale) {
  i18n.global.locale.value = locale;
  localStorage.setItem('locale', locale);
  document.documentElement.lang = locale;
}

export function getCurrentLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale;
}
