<script setup lang="ts">
defineProps<{ title: string; wide?: boolean }>();
</script>

<template>
  <article class="card" :class="{ 'span-2': wide }">
    <h3>{{ title }}</h3>
    <p class="sub"><slot name="sub" /></p>
    <slot />
  </article>
</template>
