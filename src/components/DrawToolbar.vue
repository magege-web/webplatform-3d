<template>
  <div
    class="draw-toolbar"
    :class="{ 'draw-toolbar--hidden': !visible }"
    role="toolbar"
    aria-label="标绘工具"
  >
    <!-- 基础图形 -->
    <div class="toolbar-section-label">基础图形</div>
    <div class="toolbar-group">
      <button
        v-for="mode in baseModes"
        :key="mode.type"
        class="toolbar-btn"
        :class="{ active: drawState.currentType === mode.type }"
        :title="mode.label"
        :aria-label="mode.label"
        :aria-pressed="drawState.currentType === mode.type"
        @click="handleDraw(mode.type)"
      >
        <span class="toolbar-icon" v-html="mode.icon"></span>
        <span class="toolbar-label">{{ mode.label }}</span>
      </button>
    </div>

    <div class="toolbar-divider" aria-hidden="true"></div>

    <!-- 军标 -->
    <div class="toolbar-section-label">军标</div>
    <div class="toolbar-group">
      <button
        v-for="mode in arrowModes"
        :key="mode.type"
        class="toolbar-btn"
        :class="{ active: drawState.currentType === mode.type }"
        :title="mode.label"
        :aria-label="mode.label"
        :aria-pressed="drawState.currentType === mode.type"
        @click="handleDraw(mode.type)"
      >
        <span class="toolbar-icon" v-html="mode.icon"></span>
        <span class="toolbar-label">{{ mode.label }}</span>
      </button>
    </div>

    <div class="toolbar-divider" aria-hidden="true"></div>

    <!-- 操作 -->
    <div class="toolbar-group">
      <button
        v-if="drawState.isDrawing"
        class="toolbar-btn toolbar-btn--danger"
        title="取消绘制"
        aria-label="取消绘制"
        @click="handleCancel"
      >
        <span class="toolbar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
        <span class="toolbar-label">取消</span>
      </button>

      <button
        class="toolbar-btn"
        title="清空所有标绘"
        aria-label="清空所有标绘"
        :disabled="drawState.featureCount === 0"
        @click="handleClear"
      >
        <span class="toolbar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </span>
        <span class="toolbar-label">清空</span>
      </button>

      <button
        v-if="showExport"
        class="toolbar-btn"
        title="导出坐标"
        aria-label="导出坐标"
        :disabled="drawState.featureCount === 0"
        @click="handleExport"
      >
        <span class="toolbar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </span>
        <span class="toolbar-label">导出</span>
      </button>
    </div>

    <div class="toolbar-count" v-if="drawState.featureCount > 0">
      共 {{ drawState.featureCount }} 个要素
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  /** DrawPlugin 实例（shallowRef，仅用于方法调用） */
  drawPlugin: { type: Object, default: null },
  /** 响应式绘制状态 */
  drawState: {
    type: Object,
    default: () => ({ currentType: null, isDrawing: false, featureCount: 0 }),
  },
  /** 工具栏显隐 */
  visible: { type: Boolean, default: true },
  /** 是否显示导出按钮 */
  showExport: { type: Boolean, default: true },
})

const emit = defineEmits(['clear', 'export'])

/** 基础图形 */
const baseModes = [
  {
    type: 'POINT',
    label: '点',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="12" r="5"/></svg>',
  },
  {
    type: 'BILLBOARD',
    label: '图标点',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  },
  {
    type: 'POLYLINE',
    label: '线',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="3 21 9 5 15 15 21 3"/></svg>',
  },
  {
    type: 'POLYGON',
    label: '面',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></svg>',
  },
  {
    type: 'CIRCLE',
    label: '圆',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="9"/></svg>',
  },
  {
    type: 'RECT',
    label: '矩形',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>',
  },
]

/** 军标箭头 */
const arrowModes = [
  {
    type: 'ATTACK_ARROW',
    label: '进攻箭头',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>',
  },
  {
    type: 'DOUBLE_ARROW',
    label: '双箭头',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="10 5 17 12 10 19"/><polyline points="14 5 7 12 14 19"/></svg>',
  },
  {
    type: 'FINE_ARROW',
    label: '直箭头',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="14 5 19 12 14 19"/></svg>',
  },
  {
    type: 'TAILED_ATTACK_ARROW',
    label: '燕尾箭头',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M5 12h12"/><polyline points="13 7 17 12 13 17"/><line x1="5" y1="7" x2="5" y2="17"/></svg>',
  },
  {
    type: 'GATHERING_PLACE',
    label: '聚集地',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/></svg>',
  },
]

function getPlugin() {
  return props.drawPlugin
}

function handleDraw(type) {
  const plugin = getPlugin()
  if (!plugin) return

  // 如果点击的是已激活的模式，视为取消
  if (plugin.currentType === type && plugin.isDrawing) {
    plugin.stop()
    return
  }

  plugin.start(type)
}

function handleCancel() {
  getPlugin()?.stop()
}

function handleClear() {
  const plugin = getPlugin()
  if (!plugin) return
  if (plugin.featureCount === 0) return

  plugin.clear()
  emit('clear')
}

function handleExport() {
  const plugin = getPlugin()
  if (!plugin) return
  const features = plugin.getFeatures()
  emit('export', { features })
}
</script>

<style scoped>
.draw-toolbar {
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
  max-height: calc(100vh - 90px);
  overflow-y: auto;
}

.draw-toolbar--hidden {
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
