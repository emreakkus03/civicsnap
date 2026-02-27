import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import nlBE from '@lib/nl-BE.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
        "nl-BE": {
            translation: nlBE
        }
    },
    lng: "nl-BE",
    fallbackLng: "nl-BE",
    interpolation: {
      escapeValue: false
    }
});

export default i18n;