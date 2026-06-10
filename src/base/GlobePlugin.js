/**
 * GlobePlugin — 3D 地球渲染插件
 *
 * 基于 @dvgis/dc-sdk 原生 API，提供可配置的地球初始化能力。
 */

const DEFAULTS = {
  // 场景模式：3=SCENE3D | 2=SCENE2D | 1=COLUMBUS_VIEW
  sceneMode: 3,
  // 初始视角
  homeView: { longitude: 105, latitude: 35, height: 19000000 },
  // 底图配置：null=默认 | { type, ... }=DC-SDK图层配置
  baseLayer: null,
  // Cesium 资源路径
  baseUrl: null,
  // 回调
  onReady: null,
  onCreated: null,
  onDestroyed: null,
  onError: null,
}

class GlobePlugin {
  constructor(options = {}) {
    this._options = { ...DEFAULTS, ...options }
    this._viewer = null
    this._isMounted = false
    this._isDestroyed = false
  }

  get viewer() { return this._viewer }

  async mount(container) {
    if (this._isMounted) return this
    if (this._isDestroyed) throw new Error('[GlobePlugin] 实例已销毁')

    try {
      const el = typeof container === 'string'
        ? document.getElementById(container)
        : container
      if (!el) throw new Error(`找不到容器: ${container}`)

      const style = window.getComputedStyle(el)
      if (style.width === '0px' || style.height === '0px') {
        el.style.width = '100%'
        el.style.height = '100%'
      }
      if (!el.id) el.id = 'globe-container'

      // DC-SDK 就绪
      await DC.ready({})
      this._options.onReady?.()

      // 创建 Viewer
      this._viewer = new DC.Viewer(el.id)

      // step 1: 加载底图
      if (this._options.baseLayer) {
        this._loadBaseLayer()
      }

      // step 2: 设置初始视角（立即定位，无动画）
      this._flyHome()

      // step 3: 待 step2 无报错后再放开
      // this._viewer.changeSceneMode(this._options.sceneMode, 0)

      this._isMounted = true
      this._options.onCreated?.(this)
      return this
    } catch (err) {
      this._options.onError?.(err)
      throw err
    }
  }

  unmount() {
    if (!this._isMounted || !this._viewer) return
    try { this._viewer.destroy() } catch (e) { /* ignore */ }
    this._viewer = null
    this._isMounted = false
    this._isDestroyed = true
    this._options.onDestroyed?.()
  }

  // ---- 私有 ----

  _loadBaseLayer() {
    const bl = this._options.baseLayer
    if (!bl) return

    const factory = DC.ImageryLayerFactory
    if (!factory) return

    const { type, ...opts } = bl

    // 正确的 DC-SDK 工厂方法名（注意大小写）
    const methodMap = {
      amap: 'createAmapImageryLayer',
      arcgis: 'createArcGisImageryLayer',
      baidu: 'createBaiduImageryLayer',
      bing: 'createBingImageryLayer',
      coord: 'createCoordImageryLayer',
      geovis: 'createGeoVisImageryLayer',
      google: 'createGoogleImageryLayer',
      grid: 'createGridImageryLayer',
      mapbox: 'createMapboxImageryLayer',
      mapbox_style: 'createMapboxStyleImageryLayer',
      osm: 'createOSMImageryLayer',
      single_tile: 'createSingleTileImageryLayer',
      tms: 'createTMSImageryLayer',
      tdt: 'createTdtImageryLayer',
      tencent: 'createTencentImageryLayer',
      wms: 'createWMSImageryLayer',
      wmts: 'createWMTSImageryLayer',
      xyz: 'createXYZImageryLayer',
    }

    const methodName = methodMap[type]
    if (!methodName) {
      console.warn('[GlobePlugin] 未知底图类型:', type)
      return
    }

    const createFn = factory[methodName]
    if (typeof createFn !== 'function') {
      console.warn('[GlobePlugin] 工厂方法不存在:', methodName)
      return
    }

    try {
      const layer = createFn(opts)
      this._viewer.addBaseLayer(layer)
      console.log('[GlobePlugin] 底图加载成功:', type)
    } catch (e) {
      console.warn('[GlobePlugin] 底图加载失败:', e.message)
    }
  }

  _flyHome() {
    const viewer = this._viewer
    if (!viewer) return

    // DC-SDK 的 flyTo 有 bug（会触发 "key is required" 渲染错误），
    // 直接通过底层 Cesium camera.flyTo 来实现
    const cv = viewer._delegate
    if (!cv?.camera) {
      console.warn('[GlobePlugin] 无法获取 Cesium camera')
      return
    }

    const hv = this._options.homeView
    if (typeof DC.Cartesian3?.fromDegrees !== 'function') {
      console.warn('[GlobePlugin] DC.Cartesian3.fromDegrees 不可用')
      return
    }

    const dest = DC.Cartesian3.fromDegrees(hv.longitude, hv.latitude, hv.height)
    console.log('[GlobePlugin] 飞行到:', hv.longitude, hv.latitude, hv.height)

    // setView 直接定位，无飞行动画
    cv.camera.setView({
      destination: dest,
      orientation: {
        heading: 0,
        pitch: -Math.PI / 2,
        roll: 0,
      },
    })
  }
}

export default GlobePlugin
