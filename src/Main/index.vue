<template>
  <Navbar :draw-active="drawToolbarVisible" @toggle-draw="toggleDrawToolbar" />
  <main class="main-content">
    <div id="globe-viewer" ref="globeContainer" class="globe-container"></div>
    <DrawToolbar
      :draw-plugin="drawPlugin"
      :draw-state="drawState"
      :visible="drawToolbarVisible"
      @clear="onCleared"
      @export="onExport"
    />
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef, reactive, markRaw } from 'vue'
import Navbar from '@/components/Navbar.vue'
import DrawToolbar from '@/components/DrawToolbar.vue'
import { GlobePlugin, DrawPlugin } from '@/base'

const globeContainer = ref(null)
const drawToolbarVisible = ref(false)

/** @type {GlobePlugin | null} */
let globe = null

/** 使用 shallowRef 避免 Vue Proxy 包裹 DC-SDK 内部对象 */
const drawPlugin = shallowRef(null)

/** @type {DrawPlugin | null} */
let drawPluginInstance = null

/** 独立的响应式状态，供工具栏 UI 绑定 */
const drawState = reactive({
  currentType: null,
  isDrawing: false,
  featureCount: 0,
})

onMounted(async () => {
  globe = new GlobePlugin({
    // 场景模式：3=3D | 2=2D | 2.5=2.5D
    sceneMode: 3,

    // 默认底图瓦片（高德地图，国内可用）
    baseLayer: { type: 'amap', style: 'img', crs: 'WGS84' },

    // 初始视角 — 中国北京
    homeView: {
      longitude: 116.39,
      latitude: 39.91,
      height: 20000000,
    },

    onCreated: () => {
      console.log('[Main] 地球渲染完成')
      // 地球就绪后初始化标绘插件
      initDrawPlugin()
    },
    onError: (err) => {
      console.error('[Main] 地球渲染失败:', err)
    },
  })

  await globe.mount(globeContainer.value)
})

function syncDrawState() {
  if (!drawPluginInstance) return
  drawState.currentType = drawPluginInstance.currentType
  drawState.isDrawing = drawPluginInstance.isDrawing
  drawState.featureCount = drawPluginInstance.featureCount
}

function initDrawPlugin() {
  try {
    drawPluginInstance = new DrawPlugin({
      editAfterDraw: false,
      onStart: () => { syncDrawState() },
      onStop: () => { syncDrawState() },
      onDraw: (overlay, type) => {
        console.log(`[Main] 标绘完成: ${type}`, overlay)
        syncDrawState()
      },
      onError: (err) => {
        console.error('[Main] 标绘错误:', err)
      },
    })
    drawPluginInstance.mount(globe.viewer)
    // markRaw 防止 DrawPlugin 实例（含 DC-SDK 内部对象）被 Vue Proxy 包裹
    drawPlugin.value = markRaw(drawPluginInstance)
    console.log('[Main] 标绘插件初始化成功')
  } catch (err) {
    console.warn('[Main] 标绘插件初始化失败:', err.message)
  }
}

function toggleDrawToolbar() {
  drawToolbarVisible.value = !drawToolbarVisible.value
}

function onCleared() {
  console.log('[Main] 已清除所有标绘')
  syncDrawState()
}

function onExport({ features }) {
  const data = JSON.stringify(features, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `drawing-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onUnmounted(() => {
  drawPluginInstance?.unmount()
  globe?.unmount()
})
</script>

<style scoped>
.main-content {
  position: fixed;
  top: 54px;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-bg);
  transition: background 0.3s ease;
}

.globe-container {
  width: 100%;
  height: 100%;
}
</style>
