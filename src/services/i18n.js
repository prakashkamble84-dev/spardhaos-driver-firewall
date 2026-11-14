import { useCallback, useEffect, useState } from 'react';

export const LOCALES = [
  { value: 'mr', label: 'मराठी' },
  { value: 'en', label: 'English' },
];

const DEFAULT_LOCALE = 'mr';
const STORAGE_KEY = 'spardhaos.locale';
const LOCALE_EVENT = 'spardhaos:locale-change';

const DICTIONARY = {
  mr: {
    'lang.mr': 'मराठी',
    'lang.en': 'English',
    'settings.eyebrow': 'तुमच्या तयारीनुसार बदला',
    'settings.title': 'प्रोफाइल आणि सेटिंग्ज',
    'settings.subtitle': 'तुमचा अभ्यास अनुभव वैयक्तिक करा.',
    'settings.appLanguage': 'अ‍ॅपची भाषा',
    'settings.loading': 'प्रोफाइल लोड होत आहे...',
    'settings.loadFailed': 'प्रोफाइल लोड झाली नाही.',
    'settings.targetExam': 'लक्ष्य परीक्षा',
    'settings.studyLanguage': 'अभ्यासाची भाषा',
    'settings.district': 'जिल्हा',
    'settings.districtPlaceholder': 'उदा. पुणे',
    'settings.phone': 'मोबाईल नंबर',
    'settings.phonePlaceholder': 'उदा. 9876543210',
    'settings.dailyGoal': 'दररोज अभ्यासाचे लक्ष्य (मिनिटे)',
    'settings.save': 'बदल जतन करा',
    'settings.saving': 'जतन करत आहे...',
    'settings.saved': 'तुमचे प्रोफाइल बदल जतन झाले.',
    'settings.invalidPhone': 'कृपया वैध १० अंकी मोबाईल नंबर टाका.',
    'settings.saveFailed': 'प्रोफाइल जतन झाली नाही.',
    'settings.saveError': 'बदल जतन करताना त्रुटी आली.',
  },
  en: {
    'lang.mr': 'Marathi',
    'lang.en': 'English',
    'settings.eyebrow': 'Personalise your preparation',
    'settings.title': 'Profile and settings',
    'settings.subtitle': 'Tailor your study experience.',
    'settings.appLanguage': 'App language',
    'settings.loading': 'Loading profile...',
    'settings.loadFailed': 'Could not load your profile.',
    'settings.targetExam': 'Target exam',
    'settings.studyLanguage': 'Study language',
    'settings.district': 'District',
    'settings.districtPlaceholder': 'e.g. Pune',
    'settings.phone': 'Mobile number',
    'settings.phonePlaceholder': 'e.g. 9876543210',
    'settings.dailyGoal': 'Daily study goal (minutes)',
    'settings.save': 'Save changes',
    'settings.saving': 'Saving...',
    'settings.saved': 'Your profile changes were saved.',
    'settings.invalidPhone': 'Please enter a valid 10-digit mobile number.',
    'settings.saveFailed': 'Your profile could not be saved.',
    'settings.saveError': 'An error occurred while saving your changes.',
  },
};

function readLocale() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return DICTIONARY[stored] ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function translate(locale, key) {
  return DICTIONARY[locale]?.[key] ?? DICTIONARY[DEFAULT_LOCALE][key] ?? key;
}

export function useLocale() {
  const [locale, setLocaleState] = useState(readLocale);

  useEffect(() => {
    const sync = () => setLocaleState(readLocale());
    window.addEventListener(LOCALE_EVENT, sync);
    return () => window.removeEventListener(LOCALE_EVENT, sync);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (!DICTIONARY[next]) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this session only.
    }
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  const t = useCallback((key) => translate(locale, key), [locale]);

  return { locale, setLocale, t };
}