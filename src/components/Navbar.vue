<template>
  <header class="topbar" role="banner" aria-label="顶部导航">
    <div class="topbar-left">
      <button @click="toggleMenu" class="tool-btn" title="菜单" aria-pressed="false" aria-label="切换侧栏">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      <button class="tool-btn" title="首页" aria-label="首页">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </button>

      <span class="tool-div" aria-hidden="true"></span>

      <button class="tool-btn" title="搜索" aria-label="搜索">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="17" height="17"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>

      <button class="tool-btn" title="图层" aria-label="图层">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
      </button>

      <button class="tool-btn" title="刷新" aria-label="刷新">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
      </button>

      <span class="tool-div" aria-hidden="true"></span>

      <button class="tool-btn" :title="isFullscreen ? '退出全屏' : '全屏'" :aria-label="isFullscreen ? '退出全屏' : '全屏'" @click="toggleFullscreen">
        <!-- 进入全屏图标 -->
        <svg v-if="!isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        <!-- 退出全屏图标 -->
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><polyline points="4 8 4 3 9 3"/><polyline points="20 16 20 21 15 21"/><line x1="14" y1="3" x2="4" y2="13"/><line x1="10" y1="21" x2="20" y2="11"/></svg>
      </button>
    </div>

    <div class="topbar-right">
      <!-- 主题切换按钮 -->
      <button class="tool-btn theme-toggle" :title="isDark ? '切换浅色主题' : '切换深色主题'" :aria-label="isDark ? '切换浅色主题' : '切换深色主题'" @click="toggleTheme">
        <!-- 太阳图标（浅色模式） -->
        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <!-- 月亮图标（深色模式） -->
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>

      <div class="status-dot" title="系统正常" aria-hidden="false"></div>
      <div class="project-name">GLOBAL MONITOR SYSTEM</div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const THEME_KEY = 'app-theme'

const isDark = ref(true)
const isFullscreen = ref(false)

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  isDark.value = dark
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(!isDark.value)
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn('全屏切换失败:', err)
    })
  } else {
    document.exitFullscreen().catch((err) => {
      console.warn('退出全屏失败:', err)
    })
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light') {
    applyTheme(false)
  } else {
    // 默认深色
    applyTheme(true)
  }
  // 同步全屏状态
  isFullscreen.value = !!document.fullscreenElement
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

function toggleMenu() {
  const btn = document.querySelector('.topbar .tool-btn')
  if (!btn) return
  const pressed = btn.classList.toggle('active')
  btn.setAttribute('aria-pressed', String(pressed))
  window.dispatchEvent(new CustomEvent('topbar:toggle-sidebar', { detail: { open: pressed } }))
}
</script>

<style scoped>
.topbar {
  --panel: var(--theme-panel);
  --panel-border: var(--theme-panel-border);
  --accent: var(--theme-accent);
  --accent-dim: var(--theme-accent-dim);
  --accent-glow: var(--theme-accent-glow);
  --text: var(--theme-text);
  --text-muted: var(--theme-text-muted);
  --topbar-h: 54px;

  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  background: var(--panel);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--panel-border);
  z-index: 1000;
}

.topbar::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 6%, var(--accent), transparent 94%);
  opacity: 0.18;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s;
  outline: none;
}

.tool-btn:hover {
  color: var(--accent);
  background: var(--accent-dim);
  border-color: color-mix(in srgb, var(--accent) 12%, transparent);
}

.tool-btn.active {
  color: var(--accent);
  background: var(--accent-dim);
  border-color: color-mix(in srgb, var(--accent) 18%, transparent);
}

.tool-div {
  width: 1px;
  height: 22px;
  background: var(--theme-divider);
  margin: 0 8px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.theme-toggle {
  transition: transform 0.3s ease;
}

.theme-toggle:active {
  transform: rotate(30deg);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(180deg, #10b981, var(--accent));
  box-shadow: 0 0 8px var(--accent-glow);
}

.project-name {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 2px;
  text-shadow: 0 0 18px var(--accent-glow);
}
</style>
