/**
 * MeasurePlugin — 测量工具插件
 *
 * 基于 DC.Measure 原生 API，DC-SDK 全自动处理：
 * - 鼠标交互（左键加点、右键完成）
 * - 每段距离/面积标签渲染
 * - 结果存储在 Cesium.CustomDataSource('measure-layer')
 *
 * 用法：
 *   const measure = new MeasurePlugin()
 *   measure.mount(viewer)
 *   measure.start('distance')   // 仅激活模式，不传 options
 *   measure.clear()
 *   measure.unmount()
 */

class MeasurePlugin {
  constructor(options = {}) {
    this._options = {
      onStart: null,
      onStop: null,
      onError: null,
      ...options,
    }
    this._viewer = null
    this._measure = null
    this._dataSource = null
    this._activeMode = null
    this._isMounted = false
    this._isDestroyed = false
  }

  get viewer() { return this._viewer }
  get isMeasuring() { return !!this._activeMode }
  get activeMode() { return this._activeMode }
  get resultCount() {
    return this._countEntities()
  }

  mount(viewer) {
    if (this._isMounted) return this
    if (this._isDestroyed) throw new Error('[MeasurePlugin] 实例已销毁')
    if (!viewer) throw new Error('[MeasurePlugin] viewer 不能为空')

    try {
      this._viewer = viewer

      if (typeof DC.Measure !== 'function') {
        throw new Error('[MeasurePlugin] DC.Measure 不可用')
      }

      this._measure = new DC.Measure(this._viewer)
      this._dataSource = this._resolveDataSource()

      if (this._dataSource) {
        console.log('[MeasurePlugin] 挂载成功, dataSource 已定位')
      } else {
        console.warn('[MeasurePlugin] dataSource 未定位，将在首次测量时重试')
      }

      this._isMounted = true
      return this
    } catch (err) {
      this._options.onError?.(err)
      throw err
    }
  }

  /**
   * 开始测量 — 直接调用 DC.Measure.distance()/area()，不传 options
   */
  start(type) {
    if (!this._isMounted || !this._measure) {
      console.warn('[MeasurePlugin] 未挂载')
      return
    }

    const method = this._measure[type]
    if (typeof method !== 'function') {
      console.warn(`[MeasurePlugin] DC.Measure 不支持: ${type}`)
      return
    }

    // 确保 dataSource 引用
    if (!this._dataSource) {
      this._dataSource = this._resolveDataSource()
    }

    this._activeMode = type
    this._options.onStart?.(type)
    console.log(`[MeasurePlugin] 激活: ${type}`)

    try {
      // DC.Measure.distance() / DC.Measure.area() — 无参数调用
      // DC-SDK 全自动处理鼠标交互和标签渲染
      method.call(this._measure)
    } catch (err) {
      console.error('[MeasurePlugin] 启动异常:', err)
      this._options.onError?.(err)
      this._activeMode = null
    }
  }

  /**
   * 结束当前测量（用户右键后点击按钮取消激活，此时更新 UI 状态）
   */
  stop() {
    if (!this._activeMode) return
    this._activeMode = null
    this._options.onStop?.(null)
    console.log(`[MeasurePlugin] 停止测量, 实体数: ${this._countEntities()}`)
  }

  clear() {
    this._activeMode = null
    console.log('[MeasurePlugin] 清空所有测量')

    if (this._dataSource) {
      this._dataSource.entities.removeAll()
    }
  }

  undo() {
    if (!this._dataSource) return

    const entities = this._dataSource.entities.values
    if (entities.length === 0) return

    console.log(`[MeasurePlugin] 撤销, 撤销前实体数: ${entities.length}`)

    // 一组完整测量的实体：N个点 + 1条线/面 + (N-1)个标签
    // 倒序找：从末尾往前找 polyline/polygon 实体作为边界
    let batchStart = entities.length - 1
    let foundPrimitive = false

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i]
      if (e.polyline || e.polygon) {
        // 这是线段/面 — 从这里往前到上一个线段/面之间是一组
        if (foundPrimitive) break
        foundPrimitive = true
        batchStart = i
      }
    }

    // 删除从 batchStart 到末尾的所有实体
    while (entities.length > batchStart) {
      this._dataSource.entities.remove(entities[entities.length - 1])
    }

    console.log(`[MeasurePlugin] 撤销后实体数: ${this._countEntities()}`)
  }

  unmount() {
    this.clear()
    if (this._measure) {
      try { this._measure.destroy?.() } catch (e) { /* ignore */ }
      this._measure = null
    }
    this._dataSource = null
    this._viewer = null
    this._isMounted = false
    this._isDestroyed = true
  }

  // ---- 内部 ----

  _resolveDataSource() {
    // 方法1：从 measure 实例获取
    const fromGetter = this._measure?.customDataSource
      || this._measure?._customDataSource
      || this._measure?.dataSource
      || this._measure?._dataSource
    if (fromGetter && typeof fromGetter.entities?.removeAll === 'function') {
      return fromGetter
    }

    // 方法2：从 viewer.dataSources 按名称查找
    const dsList = this._viewer?._delegate?.dataSources
    if (dsList) {
      for (let i = dsList.length - 1; i >= 0; i--) {
        const ds = dsList.get(i)
        if (ds?.name === 'measure-layer') return ds
      }
    }

    return null
  }

  _countEntities() {
    if (!this._dataSource) return 0
    try {
      return this._dataSource.entities.values.length
    } catch (e) {
      return 0
    }
  }
}

export default MeasurePlugin
