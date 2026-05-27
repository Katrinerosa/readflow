<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import { useReaderStore } from "./stores/reader";

const readerStore = useReaderStore();

// Initialize store on app mount (load settings from localStorage)
onMounted(() => {
  readerStore.initialize();
});
</script>

<style scoped>
#app {
  min-height: 100vh;
}
</style>
