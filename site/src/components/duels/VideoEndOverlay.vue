<script setup lang="ts">
defineEmits<{ continue: []; replay: [] }>();
</script>

<template>
  <!-- voile posé sur la vidéo en pause à la fin de l'extrait -->
  <div class="video-end">
    <div class="video-end-actions">
      <button class="btn-continue" @click="$emit('continue')">▶ Continuer la vidéo</button>
      <button class="btn-replay" @click="$emit('replay')">↺ Revoir l'extrait</button>
    </div>
  </div>
</template>
