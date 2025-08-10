<script setup lang="ts">
import LoaderIcon from './components/LoaderIcon.vue'
</script>

<template>
  <div class="w-screen h-screen">
    <LoaderIcon class="text-[#130c59] absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" width="60vw" />
    <RouterView />
  </div>
</template>
