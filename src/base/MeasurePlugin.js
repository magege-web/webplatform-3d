/**
 * MeasurePlugin — 测量工具插件
 *
 * 基于 DC.Measure 原生 API，提供距离和面积测量能力。
 * 与 DrawPlugin 对标，同样使用 DC.VectorLayer 管理测量结果。
 *
 * 用法：
 *   const measure = new MeasurePlugin()
 *   measure.mount(viewer)
 *   measure.start('distance')
 *   measure.clear()
 *   measure.unmount()
 */

const DEFAULTS = {
  // 图层名称
  layerName: 'measure-layer',
  // 回调
  onStart: null,
  onStop: null,
  onError: null,
}

/** DC.Measure API 可能有多种命名方式，按优先级尝试 */
const METHOD_ALIASES = {
  distance: ['distance'],
  area: ['area', 'areaSurface'],
}

class MeasurePlugin {
  constructor(options = {}) {
    this._options = { ...DEFAULTS, ...options }
    this._viewer = null
    this._measure = null
    this._layer = null
    this._activeMode = null
    this._isMeasuring = false
    this._resultCount = 0
    this._isMounted = false
    this._isDestroyed = false
  }

  get viewer() { return this._viewer }
  get measure() { return this._measure }
  get layer() { return this._layer }
  get isMeasuring() { return this._isMeasuring }
  get activeMode() { return this._activeMode }
  get resultCount() { return this._resultCount }

  /**
   * 挂载到现有 DC.Viewer 实例
   */
  mount(viewer) {
    if (this._isMounted) return this
    if (this._isDestroyed) throw new Error('[MeasurePlugin] 实例已销毁')
    if (!viewer) throw new Error('[MeasurePlugin] viewer 不能为空')

    try {
      this._viewer = viewer

      // 创建矢量图层
      const name = this._options.layerName || 'measure-layer'
      this._layer = new DC.VectorLayer(name)
      this._viewer.addLayer(this._layer)

      // 创建 Measure 实例
      if (typeof DC.Measure !== 'function') {
        throw new Error('[MeasurePlugin] DC.Measure 不可用')
      }
      this._measure = new DC.Measure(this._viewer)

      this._isMounted = true
      return this
    } catch (err) {
      this._options.onError?.(err)
      throw err
    }
  }

  /**
   * 开始测量
   * @param {'distance'|'area'} type
   */
  start(type) {
    if (!this._isMounted || !this._measure) {
      console.warn('[MeasurePlugin] 未挂载，无法测量')
      return
    }

    // 停止当前测量
    if (this._isMeasuring) {
      // DC.Measure 重新调用时会解绑旧的测量
    }

    // 查找可用的测量方法
    const aliases = METHOD_ALIASES[type] || [type]
    let method = null
    for (const alias of aliases) {
      if (typeof this._measure[alias] === 'function') {
        method = this._measure[alias].bind(this._measure)
        break
      }
    }

    if (!method) {
      console.warn(`[MeasurePlugin] DC.Measure 不支持测量类型: ${type}`)
      return
    }

    this._activeMode = type
    this._isMeasuring = true
    this._options.onStart?.(type)

    try {
      method((overlay) => {
        if (overlay) {
          this._layer.addOverlay(overlay)
          this._resultCount++
        }

        this._activeMode = null
        this._isMeasuring = false
        this._options.onStop?.(overlay)
      })
    } catch (err) {
      this._options.onError?.(err)
      this._activeMode = null
      this._isMeasuring = false
    }
  }

  /**
   * 停止/取消当前测量
   */
  stop() {
    if (!this._isMeasuring) return
    this._activeMode = null
    this._isMeasuring = false
    this._options.onStop?.(null)
  }

  /**
   * 清除所有测量结果
   */
  clear() {
    this._isMeasuring = false
    this._activeMode = null

    if (this._layer) {
      try {
        this._layer.clear()
      } catch (e) {
        console.warn('[MeasurePlugin] 清除图层失败:', e)
      }
    }
    this._resultCount = 0
  }

  /**
   * 撤销最后一次测量
   */
  undo() {
    if (!this._layer) return
    const overlays = this._layer.getOverlays() || []
    if (overlays.length === 0) return

    const last = overlays[overlays.length - 1]
    try {
      this._layer.removeOverlay(last)
      this._resultCount = Math.max(0, this._resultCount - 1)
    } catch (e) {
      console.warn('[MeasurePlugin] 撤销失败:', e)
    }
  }

  /**
   * 获取所有测量结果的坐标数据
   */
  getResults() {
    if (!this._layer) return []

    const overlays = this._layer.getOverlays() || []
    return overlays.map((overlay) => {
      const result = {
        type: overlay.type || 'unknown',
        coordinates: null,
      }

      try {
        if (overlay.position) {
          const p = overlay.position
          result.coordinates = {
            longitude: p.lng ?? p.longitude ?? 0,
            latitude: p.lat ?? p.latitude ?? 0,
            height: p.alt ?? p.height ?? 0,
          }
        } else if (overlay.positions && Array.isArray(overlay.positions)) {
          result.coordinates = overlay.positions.map((p) => ({
            longitude: p.lng ?? p.longitude ?? 0,
            latitude: p.lat ?? p.latitude ?? 0,
            height: p.alt ?? p.height ?? 0,
          }))
        }
      } catch (e) {
        result.coordinates = null
      }

      return result
    })
  }

  /**
   * 销毁实例
   */
  unmount() {
    this._isMeasuring = false
    this._activeMode = null

    if (this._layer) {
      try {
        this._layer.clear()
        this._viewer?.removeLayer(this._layer)
      } catch (e) {
        /* ignore */
      }
      this._layer = null
    }

    if (this._measure) {
      try {
        this._measure.destroy?.()
      } catch (e) {
        /* ignore */
      }
      this._measure = null
    }

    this._viewer = null
    this._resultCount = 0
    this._isMounted = false
    this._isDestroyed = true
  }
}

export default MeasurePlugin
