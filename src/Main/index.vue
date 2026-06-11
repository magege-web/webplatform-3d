<template>
  <Navbar
    :draw-active="drawToolbarVisible"
    :measure-active="measureToolbarVisible"
    @toggle-draw="toggleDrawToolbar"
    @toggle-measure="toggleMeasureToolbar"
  />
  <main class="main-content">
    <div id="globe-viewer" ref="globeContainer" class="globe-container"></div>
    <!-- 标绘工具栏 -->
    <DrawToolbar
      :draw-plugin="drawPlugin"
      :draw-state="drawState"
      :visible="drawToolbarVisible"
      @clear="onDrawCleared"
      @export="onExport"
    />
    <!-- 测量工具栏 -->
    <MeasureToolbar
      :measure-plugin="measurePlugin"
      :visible="measureToolbarVisible"
      @clear="onMeasureCleared"
    />
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef, reactive, markRaw } from 'vue'
import Navbar from '@/components/Navbar.vue'
import DrawToolbar from '@/components/DrawToolbar.vue'
import MeasureToolbar from '@/components/MeasureToolbar.vue'
import { GlobePlugin, DrawPlugin, MeasurePlugin } from '@/base'

const globeContainer = ref(null)
const drawToolbarVisible = ref(false)
const measureToolbarVisible = ref(false)

/** @type {GlobePlugin | null} */
let globe = null

// ---- 标绘 ----

const drawPlugin = shallowRef(null)
let drawPluginInstance = null

const drawState = reactive({
  currentType: null,
  isDrawing: false,
  featureCount: 0,
})

// ---- 测量 ----

const measurePlugin = shallowRef(null)
let measurePluginInstance = null

// ---- 初始化 ----

onMounted(async () => {
  globe = new GlobePlugin({
    sceneMode: 3,
    baseLayer: { type: 'amap', style: 'img', crs: 'WGS84' },
    homeView: {
      longitude: 116.39,
      latitude: 39.91,
      height: 20000000,
    },

    onCreated: () => {
      console.log('[Main] 地球渲染完成')
      initDrawPlugin()
      initMeasurePlugin()
    },
    onError: (err) => {
      console.error('[Main] 地球渲染失败:', err)
    },
  })

  await globe.mount(globeContainer.value)
})

// ---- 标绘初始化 ----

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
    drawPlugin.value = markRaw(drawPluginInstance)
    console.log('[Main] 标绘插件初始化成功')
  } catch (err) {
    console.warn('[Main] 标绘插件初始化失败:', err.message)
  }
}

// ---- 测量初始化 ----

function initMeasurePlugin() {
  try {
    measurePluginInstance = new MeasurePlugin({
      onError: (err) => {
        console.error('[Main] 测量错误:', err)
      },
    })
    measurePluginInstance.mount(globe.viewer)
    measurePlugin.value = markRaw(measurePluginInstance)
    console.log('[Main] 测量插件初始化成功')
  } catch (err) {
    console.warn('[Main] 测量插件初始化失败:', err.message)
  }
}

// ---- 工具栏切换（互斥） ----

function toggleDrawToolbar() {
  drawToolbarVisible.value = !drawToolbarVisible.value
  if (drawToolbarVisible.value) {
    measureToolbarVisible.value = false
  }
}

function toggleMeasureToolbar() {
  measureToolbarVisible.value = !measureToolbarVisible.value
  if (measureToolbarVisible.value) {
    drawToolbarVisible.value = false
  }
}

// ---- 事件处理 ----

function onDrawCleared() {
  console.log('[Main] 已清除所有标绘')
  syncDrawState()
}

function onMeasureCleared() {
  console.log('[Main] 已清除所有测量')
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

// ---- 清理 ----

onUnmounted(() => {
  measurePluginInstance?.unmount()
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
