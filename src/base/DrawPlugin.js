/**
 * DrawPlugin — 点线面标绘插件
 *
 * 基于 DC.Plot 原生 API，提供点/线/面的交互式绘制能力。
 * 使用 DC.VectorLayer 管理所有标绘要素。
 *
 * 用法：
 *   const draw = new DrawPlugin({ editAfterDraw: true })
 *   draw.mount(viewer)
 *   draw.start('POLYGON')
 *   draw.clear()
 *   draw.unmount()
 */

const DEFAULTS = {
  // 图层名称
  layerName: 'draw-layer',
  // 绘制完成后是否进入编辑模式
  editAfterDraw: false,
  // 默认样式
  styles: {
    point: { pixelSize: 10 },
    billboard: {},
    polyline: { width: 3 },
    polygon: { fill: true },
    circle: { fill: true },
    rect: { fill: true },
    attack_arrow: { width: 3 },
    double_arrow: { width: 3 },
    fine_arrow: { width: 3 },
    tailed_attack_arrow: { width: 3 },
    gathering_place: { fill: true },
  },
  // 回调
  onStart: null,
  onDraw: null,
  onEdit: null,
  onStop: null,
  onError: null,
}

class DrawPlugin {
  constructor(options = {}) {
    this._options = { ...DEFAULTS, ...options }
    this._viewer = null
    this._plot = null
    this._layer = null
    this._currentType = null
    this._isDrawing = false
    this._isMounted = false
    this._isDestroyed = false
  }

  get viewer() { return this._viewer }
  get plot() { return this._plot }
  get layer() { return this._layer }
  get isDrawing() { return this._isDrawing }
  get currentType() { return this._currentType }
  get featureCount() {
    return this._layer ? this._layer.getOverlays()?.length || 0 : 0
  }

  /**
   * 挂载到现有 DC.Viewer 实例
   * @param {object} viewer — DC.Viewer 实例
   */
  mount(viewer) {
    if (this._isMounted) return this
    if (this._isDestroyed) throw new Error('[DrawPlugin] 实例已销毁')
    if (!viewer) throw new Error('[DrawPlugin] viewer 不能为空')

    try {
      this._viewer = viewer

      // 创建矢量图层
      const name = this._options.layerName || 'draw-layer'
      this._layer = new DC.VectorLayer(name)
      this._viewer.addLayer(this._layer)

      // 创建 Plot 实例
      this._plot = new DC.Plot(this._viewer)

      this._isMounted = true
      return this
    } catch (err) {
      this._options.onError?.(err)
      throw err
    }
  }

  /**
   * 开始绘制
   * @param {string} type — 绘制类型，支持全大写或小写
   *   POINT | BILLBOARD | POLYLINE | POLYGON | CIRCLE | RECT
   *   ATTACK_ARROW | DOUBLE_ARROW | FINE_ARROW | TAILED_ATTACK_ARROW | GATHERING_PLACE
   * @param {object} [style] — 自定义样式（覆盖默认样式）
   */
  start(type, style) {
    if (!this._isMounted || !this._plot) {
      console.warn('[DrawPlugin] 未挂载，无法绘制')
      return
    }

    // 归一化为大写，兼容 'point' / 'POINT' 两种写法
    const key = typeof type === 'string' ? type.toUpperCase() : type
    const overlayType = DC.OverlayType?.[key]
    if (overlayType === undefined || overlayType === null) {
      console.warn(`[DrawPlugin] 不支持的绘制类型: ${type}`)
      return
    }

    const mergedStyle = {
      ...(this._options.styles[key.toLowerCase()] || {}),
      ...(style || {}),
    }

    this._currentType = key
    this._isDrawing = true
    this._options.onStart?.(key)

    this._plot.draw(overlayType, (overlay) => {
      if (overlay) {
        // 添加到矢量图层
        this._layer.addOverlay(overlay)

        // 触发回调
        this._options.onDraw?.(overlay, type)

        // 进入编辑模式
        if (this._options.editAfterDraw) {
          this._plot.edit(overlay)
          this._options.onEdit?.(overlay)
        }
      }

      this._isDrawing = false
      this._currentType = null
      this._options.onStop?.(overlay)
    }, mergedStyle)
  }

  /**
   * 停止/取消当前绘制
   *
   * DC.Plot 没有独立的 stop() 方法，取消方式：
   * - 用户右键单击可自然结束当前绘制
   * - 点击其他绘制模式时，start() 会调用 plot.draw() 内部解绑旧处理器
   * - 本方法仅重置内部状态
   */
  stop() {
    if (!this._isDrawing) return
    this._isDrawing = false
    this._currentType = null
    this._options.onStop?.(null)
  }

  /**
   * 清除所有已绘制的要素
   */
  clear() {
    this._isDrawing = false
    this._currentType = null

    if (this._layer) {
      try {
        this._layer.clear()
      } catch (e) {
        console.warn('[DrawPlugin] 清除图层失败:', e)
      }
    }
  }

  /**
   * 获取所有要素的坐标数据
   * @returns {Array<{type: string, coordinates: Array|Object}>}
   */
  getFeatures() {
    if (!this._layer) return []

    const overlays = this._layer.getOverlays() || []
    return overlays.map((overlay) => {
      const result = {
        type: overlay.type || 'unknown',
        coordinates: null,
      }

      try {
        if (overlay.position) {
          // Point 类型 — DC-SDK Position 对象：{ lng, lat, alt }
          const p = overlay.position
          result.coordinates = {
            longitude: p.lng ?? p.longitude ?? 0,
            latitude: p.lat ?? p.latitude ?? 0,
            height: p.alt ?? p.height ?? 0,
          }
        } else if (overlay.positions && Array.isArray(overlay.positions)) {
          // Polyline / Polygon 类型
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
   * 获取指定 overlay 的坐标数据
   * @param {object} overlay
   * @returns {{type: string, coordinates: any}}
   */
  getOverlayCoordinates(overlay) {
    if (!overlay) return null

    const result = {
      type: overlay.type || 'unknown',
      coordinates: null,
    }

    try {
      if (overlay.position) {
        // Point 类型 — DC-SDK Position 对象：{ lng, lat, alt }
        const p = overlay.position
        result.coordinates = {
          longitude: p.lng ?? p.longitude ?? 0,
          latitude: p.lat ?? p.latitude ?? 0,
          height: p.alt ?? p.height ?? 0,
        }
      } else if (overlay.positions && Array.isArray(overlay.positions)) {
        // Polyline / Polygon 类型
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
  }

  /**
   * 设置运行时样式
   * @param {'point'|'polyline'|'polygon'} type
   * @param {object} style
   */
  setStyle(type, style) {
    this._options.styles[type] = {
      ...(this._options.styles[type] || {}),
      ...style,
    }
  }

  /**
   * 销毁实例
   */
  unmount() {
    this._isDrawing = false
    this._currentType = null

    if (this._layer) {
      try {
        this._layer.clear()
        this._viewer?.removeLayer(this._layer)
      } catch (e) {
        /* ignore */
      }
      this._layer = null
    }

    if (this._plot) {
      try {
        this._plot.destroy?.()
      } catch (e) {
        /* ignore */
      }
      this._plot = null
    }

    this._viewer = null
    this._isMounted = false
    this._isDestroyed = true
  }
}

export default DrawPlugin
