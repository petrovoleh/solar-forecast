// src/i18n.ts
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from './locales/en/translation.json';
import lt from './locales/lt/translation.json';
import uk from './locales/uk/translation.json';

i18n.use(initReactI18next).init({
    resources: {
        en: {translation: en},
        lt: {translation: lt},
        ua: {translation: uk},
        uk: {translation: uk}
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false // React already escapes by default
    }
});

export default i18n;
