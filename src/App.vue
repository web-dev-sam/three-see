<script setup lang="ts">
import GithubIcon from '@/components/GithubIcon.vue'
import LoaderIcon from '@/components/LoaderIcon.vue'
</script>

<template>
  <div class="w-screen h-screen">
    <LoaderIcon class="text-[#130c59] absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" width="60vw" />
    <RouterView />
    <a href="https://github.com/web-dev-sam/three-see" target="_blank" rel="noopener noreferrer">
      <GithubIcon class="absolute text-white left-6 bottom-6 z-50 cursor-pointer hover:scale-110 transition-transform" />
    </a>
  </div>
</template>
