<template>
  <Navbar />
  <main class="main-content">
    <div id="globe-viewer" ref="globeContainer" class="globe-container"></div>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import { GlobePlugin } from '@/base'

const globeContainer = ref(null)

/** @type {GlobePlugin | null} */
let globe = null

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
    },
    onError: (err) => {
      console.error('[Main] 地球渲染失败:', err)
    },
  })

  await globe.mount(globeContainer.value)
})

onUnmounted(() => {
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
