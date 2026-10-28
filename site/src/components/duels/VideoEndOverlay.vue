<script setup lang="ts">
defineEmits<{ continue: [] }>();
</script>

<template>
  <!-- voile posé sur la vidéo en pause à la fin de l'extrait -->
  <div class="video-end">
    <button class="btn-continue" @click="$emit('continue')">▶ Continuer la vidéo</button>
  </div>
</template>
