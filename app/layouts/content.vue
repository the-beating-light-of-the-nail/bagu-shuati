<template>
  <!-- 题库内容页（单题 / 专题 / 总览）共用的外壳：顶部导航 + 阅读容器 + 来源署名 -->
  <div class="min-h-screen bg-white text-notion-text">
    <header class="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-notion-border bg-white/95 backdrop-blur">
      <NuxtLink to="/bank" class="font-bold text-notion-text truncate">AI 八股刷题工作台</NuxtLink>
      <nav class="flex items-center gap-3 text-[13px] shrink-0">
        <NuxtLink to="/bank" class="text-notion-muted hover:text-notion-blue">题库总览</NuxtLink>
        <NuxtLink to="/" class="px-3 py-1.5 rounded-md bg-notion-text text-white hover:bg-black">进入刷题工作台</NuxtLink>
      </nav>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-6">
      <slot />
    </main>

    <footer class="border-t border-notion-border px-4 py-5 text-[12.5px] text-notion-muted text-center">
      <p>
        题库内容来自
        <a class="underline" href="https://github.com/guocong-bincai/ai-interview-guide" rel="noopener" target="_blank">guocong-bincai/ai-interview-guide</a>
        （MIT License），版权归原作者所有，本项目仅做结构化整理与刷题交互。
      </p>
      <p class="mt-1">刷题进度保存在你自己的浏览器本地，不会上传。</p>
    </footer>
  </div>
</template>
