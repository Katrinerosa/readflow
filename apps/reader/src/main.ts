import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import "./style.css";
import i18n, { loadTranslations, getLanguageFromPath, setLanguage, SUPPORTED_LANGUAGES, type Language } from "./i18n";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

// Navigation guard to update language when route changes
router.beforeEach((to, _from, next) => {
  const lang = to.params.lang as string;
  if (lang && SUPPORTED_LANGUAGES.includes(lang as Language)) {
    setLanguage(lang as Language);
  }
  next();
});

// Load translations and set language before mounting
const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const currentLang = getLanguageFromPath();
setLanguage(currentLang);

loadTranslations(directusUrl).then(() => {
  app.mount("#app");
});
