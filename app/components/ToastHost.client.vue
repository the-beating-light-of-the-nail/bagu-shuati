<script setup lang="ts">
const { toast } = useToast()
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(() => toast.value?.id, () => {
  if (!toast.value) return
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, 2600)
})

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div
    v-if="toast"
    :class="['fixed top-14 right-4 z-[60] bg-notion-text text-white text-xs px-3.5 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-notion-in', visible ? '' : 'invisible']"
  >
    <span>{{ toast.icon }}</span>
    <span>{{ toast.text }}</span>
  </div>
</template>
