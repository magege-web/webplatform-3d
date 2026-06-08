<template>
  <Navbar />
  <main class="main-content">
    <!-- 地图/3D 场景容器 -->
  </main>
</template>

<script setup>
import Navbar from '@/components/Navbar.vue'
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
</style>
