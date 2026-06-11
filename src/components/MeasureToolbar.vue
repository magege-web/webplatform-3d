<template>
  <div
    class="measure-toolbar"
    :class="{ 'measure-toolbar--hidden': !visible }"
    role="toolbar"
    aria-label="测量工具"
  >
    <div class="toolbar-section-label">测量工具</div>
    <div class="toolbar-group">
      <button
        v-for="mode in modes"
        :key="mode.type"
        class="toolbar-btn"
        :class="{ active: measureState.activeMode === mode.type }"
        :title="mode.label + (mode.hint ? ` — ${mode.hint}` : '')"
        :aria-label="mode.label"
        :aria-pressed="measureState.activeMode === mode.type"
        @click="handleMeasure(mode.type)"
      >
        <span class="toolbar-icon" v-html="mode.icon"></span>
        <span class="toolbar-label">{{ mode.label }}</span>
      </button>
    </div>

    <div class="toolbar-divider" aria-hidden="true"></div>

    <div class="toolbar-group">
      <button
        v-if="measureState.isMeasuring"
        class="toolbar-btn"
        title="完成测量"
        aria-label="完成测量"
        @click="handleCancel"
      >
        <span class="toolbar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <span class="toolbar-label">完成</span>
      </button>

      <button
        class="toolbar-btn"
        title="撤销上一次测量"
        aria-label="撤销上一次测量"
        :disabled="measureState.resultCount === 0"
        @click="handleUndo"
      >
        <span class="toolbar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
        </span>
        <span class="toolbar-label">撤销</span>
      </button>

      <button
        class="toolbar-btn"
        title="清空所有测量"
        aria-label="清空所有测量"
        :disabled="measureState.resultCount === 0"
        @click="handleClear"
      >
        <span class="toolbar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </span>
        <span class="toolbar-label">清空</span>
      </button>
    </div>

    <div class="toolbar-count" v-if="measureState.resultCount > 0">
      共 {{ measureState.resultCount }} 次测量
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  /** MeasurePlugin 实例（shallowRef，仅用于方法调用） */
  measurePlugin: { type: Object, default: null },
  /** 响应式测量状态 */
  measureState: {
    type: Object,
    default: () => ({
      activeMode: null,
      isMeasuring: false,
      resultCount: 0,
    }),
  },
  /** 工具栏显隐 */
  visible: { type: Boolean, default: true },
})

const emit = defineEmits(['clear'])

const modes = [
  {
    type: 'distance',
    label: '测距',
    hint: '左键加点 · 右键完成',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="6 8 2 12 6 16"/><polyline points="18 8 22 12 18 16"/></svg>',
  },
  {
    type: 'area',
    label: '测面积',
    hint: '左键加点 · 右键完成',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  },
]

function getPlugin() {
  return props.measurePlugin
}

function handleMeasure(type) {
  const plugin = getPlugin()
  if (!plugin) return

  // 已激活同类型 → 点击即开始新一轮测量（DC.Measure 无回调，每轮需重新调用）
  // 用户通过「取消」按钮或切换模式来停止
  plugin.start(type)
}

function handleCancel() {
  getPlugin()?.stop()
}

function handleUndo() {
  getPlugin()?.undo()
}

function handleClear() {
  const plugin = getPlugin()
  if (!plugin) return
  if (plugin.resultCount === 0) return

  plugin.clear()
  emit('clear')
}
</script>

<style scoped>
.measure-toolbar {
  --draw-panel: var(--theme-panel, rgba(8,16,32,0.88));
  --draw-border: var(--theme-panel-border, rgba(0,240,255,0.08));
  --draw-accent: var(--theme-accent, #00f0ff);
  --draw-accent-dim: var(--theme-accent-dim, rgba(0,240,255,0.08));
  --draw-text: var(--theme-text, #e2e8f0);
  --draw-text-muted: var(--theme-text-muted, #64748b);

  position: fixed;
  top: 70px;
  right: 16px;
  z-index: 900;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px;
  background: var(--draw-panel);
  backdrop-filter: blur(12px);
  border: 1px solid var(--draw-border);
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  transition: opacity 0.25s ease, transform 0.25s ease;
  user-select: none;
}

.measure-toolbar--hidden {
  opacity: 0;
  transform: translateX(10px);
  pointer-events: none;
}

.toolbar-section-label {
  padding: 2px 8px 4px;
  font-size: 9px;
  font-weight: 600;
  color: var(--draw-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.6;
}

.toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--draw-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
  white-space: nowrap;
}

.toolbar-btn:hover:not(:disabled) {
  color: var(--draw-accent);
  background: var(--draw-accent-dim);
  border-color: color-mix(in srgb, var(--draw-accent) 12%, transparent);
}

.toolbar-btn.active {
  color: var(--draw-accent);
  background: var(--draw-accent-dim);
  border-color: color-mix(in srgb, var(--draw-accent) 24%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--draw-accent) 10%, transparent);
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar-btn--danger:hover:not(:disabled) {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.toolbar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.toolbar-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.toolbar-divider {
  height: 1px;
  margin: 6px 4px;
  background: var(--theme-divider, rgba(255,255,255,0.06));
}

.toolbar-count {
  padding: 6px 4px 0;
  font-size: 10px;
  color: var(--draw-text-muted);
  text-align: center;
  letter-spacing: 0.5px;
}
</style>
