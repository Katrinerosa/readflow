import { createRouter, createWebHistory } from "vue-router";
import ReaderView from "../views/ReaderView.vue";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type Language } from "../i18n";

const router = createRouter({
  history: createWebHistory("/reader/"),
  routes: [
    {
      // New format with level in URL: /reader/da/author/book/level/easy/page/1
      path: "/:lang/:bookPath+/level/:level/page/:pageNumber",
      name: "reader-level-page",
      component: ReaderView,
      beforeEnter: (to, _from, next) => {
        const lang = to.params.lang as string;
        if (!SUPPORTED_LANGUAGES.includes(lang as Language)) {
          const bookPath = Array.isArray(to.params.bookPath)
            ? [lang, ...to.params.bookPath]
            : [lang, to.params.bookPath];
          next({
            name: "reader-level-page",
            params: {
              lang: DEFAULT_LANGUAGE,
              bookPath,
              level: to.params.level,
              pageNumber: to.params.pageNumber,
            },
          });
        } else {
          next();
        }
      },
      props: (route) => ({
        lang: route.params.lang as string,
        bookPath: Array.isArray(route.params.bookPath)
          ? route.params.bookPath.join("/")
          : route.params.bookPath,
        level: route.params.level as string,
        pageNumber: Number(route.params.pageNumber) || 1,
      }),
    },
    {
      // Legacy format without level (redirect to level/easy/page/1)
      path: "/:lang/:bookPath+/page/:pageNumber",
      name: "reader-page",
      redirect: (to) => {
        const lang = to.params.lang as string;
        const bookPath = Array.isArray(to.params.bookPath)
          ? to.params.bookPath
          : [to.params.bookPath as string];
        return {
          name: "reader-level-page",
          params: {
            lang: SUPPORTED_LANGUAGES.includes(lang as Language) ? lang : DEFAULT_LANGUAGE,
            bookPath,
            level: "easy",
            pageNumber: to.params.pageNumber,
          },
        };
      },
    },
    {
      // Book without page (redirect to level/easy/page/1)
      path: "/:lang/:bookPath+",
      name: "reader-book",
      redirect: (to) => {
        const lang = to.params.lang as string;
        const bookPath = Array.isArray(to.params.bookPath)
          ? to.params.bookPath
          : [to.params.bookPath as string];
        return {
          name: "reader-level-page",
          params: {
            lang: SUPPORTED_LANGUAGES.includes(lang as Language) ? lang : DEFAULT_LANGUAGE,
            bookPath,
            level: "easy",
            pageNumber: "1",
          },
        };
      },
    },
    {
      // Redirect root to Astro app
      path: "/",
      redirect: "/",
    },
  ],
});

export default router;
