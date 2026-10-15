<script setup lang="ts">
import { mdToHtml } from '#shared/md'

const props = defineProps<{ md: string }>()
const html = computed(() => mdToHtml(props.md))
</script>

<template>
  <!-- SSR 与客户端调用同一个纯函数，同输入同输出，不会 hydration mismatch -->
  <div class="answer-md" v-html="html" />
</template>
