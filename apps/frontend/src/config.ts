export const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3002';

/**
 * Languages a discovery can be written in. Mirrors SUPPORTED_LANGUAGES in the
 * backend's prompts module; the two lists must be extended together.
 *
 * Each label is written in its own language — someone looking for their
 * language scans for the word they would use, not its English name.
 */
export const DISCOVERY_LANGUAGES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
};

export const DEFAULT_DISCOVERY_LANGUAGE = 'en';
