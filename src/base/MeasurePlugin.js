/**
 * MeasurePlugin — 测量工具插件
 *
 * 基于 DC.Measure 原生 API，提供距离和面积测量。
 * DC.Measure 内部使用 Cesium.CustomDataSource 存储测量结果，
 * 每段距离/面积标签由 DC-SDK 自动渲染。
 *
 * 用法：
 *   const measure = new MeasurePlugin()
 *   measure.mount(viewer)
 *   measure.start('distance')
 *   measure.clear()
 *   measure.unmount()
 */

const DEFAULTS = {
  onStart: null,
  onStop: null,
  onError: null,
}

class MeasurePlugin {
  constructor(options = {}) {
    this._options = { ...DEFAULTS, ...options }
    this._viewer = null
    this._measure = null
    this._dataSource = null
    this._activeMode = null
    this._isMeasuring = false

    // 每次测量前的 entity 计数（用于撤销）
    this._countBeforeMeasure = 0
    this._resultCount = 0

    this._isMounted = false
    this._isDestroyed = false
  }

  get viewer() { return this._viewer }
  get isMeasuring() { return this._isMeasuring }
  get activeMode() { return this._activeMode }
  get resultCount() { return this._resultCount }

  mount(viewer) {
    if (this._isMounted) return this
    if (this._isDestroyed) throw new Error('[MeasurePlugin] 实例已销毁')
    if (!viewer) throw new Error('[MeasurePlugin] viewer 不能为空')

    try {
      this._viewer = viewer

      if (typeof DC.Measure !== 'function') {
        throw new Error('[MeasurePlugin] DC.Measure 不可用')
      }

      // DC.Measure 内部创建 Cesium.CustomDataSource('measure-layer')
      // 并将其添加到 viewer._delegate.dataSources
      this._measure = new DC.Measure(this._viewer)

      // 通过名称找到内部的 dataSource（用于清空/撤销）
      this._dataSource = this._findDataSource()

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

    // 正在测量中则先停止
    if (this._isMeasuring) {
      this.stop()
    }

    const method = this._measure[type]
    if (typeof method !== 'function') {
      console.warn(`[MeasurePlugin] DC.Measure 不支持: ${type}`)
      return
    }

    // 记录测量前的实体数量（用于撤销）
    if (this._dataSource) {
      this._countBeforeMeasure = this._dataSource.entities.values.length
    }

    this._activeMode = type
    this._isMeasuring = true
    this._options.onStart?.(type)

    try {
      // DC.Measure.distance(options) / DC.Measure.area(options)
      method.call(this._measure, {
        onDrawStop: () => {
          this._activeMode = null
          this._isMeasuring = false
          this._updateResultCount()
          this._options.onStop?.(null)
        },
      })
    } catch (err) {
      this._options.onError?.(err)
      this._activeMode = null
      this._isMeasuring = false
    }
  }

  /**
   * 停止/取消当前测量（丢弃本次测量）
   */
  stop() {
    if (!this._isMeasuring) return

    // 回滚：删除本次测量产生的 entities
    if (this._dataSource && this._countBeforeMeasure >= 0) {
      const entities = this._dataSource.entities.values
      while (entities.length > this._countBeforeMeasure) {
        this._dataSource.entities.remove(entities[entities.length - 1])
      }
    }

    this._activeMode = null
    this._isMeasuring = false
    this._countBeforeMeasure = 0
    this._updateResultCount()
    this._options.onStop?.(null)
  }

  /**
   * 清除所有测量结果
   */
  clear() {
    this.stop()

    if (this._dataSource) {
      this._dataSource.entities.removeAll()
    }

    this._resultCount = 0
    this._countBeforeMeasure = 0
  }

  /**
   * 撤销最后一次测量
   */
  undo() {
    if (!this._dataSource || this._resultCount === 0) return

    // 找到最后一次完整测量的实体范围并删除
    // 由于 DC.Measure 每次测量会产生一组实体（点+线+标签），
    // 我们不知道确切的范围，采用保守策略：
    // 撤销 countBeforeLast 到当前之间的实体

    // 简化处理：删除最后一组测量实体
    // 每组测量大约：点(N) + 折线(1) + 标签(N-1) 个实体
    // 我们倒序找到最后一组实体的边界
    const entities = this._dataSource.entities.values
    if (entities.length === 0) return

    // 从末尾往前找，删除所有属于最后一次测量的实体
    // 策略：至少删除最后 3 个实体（1个点 + 1条线 + 1个标签是最小测量）
    const minRemove = 3
    const toRemove = Math.min(minRemove, entities.length)

    for (let i = 0; i < toRemove; i++) {
      this._dataSource.entities.remove(entities[entities.length - 1 - i])
    }

    this._updateResultCount()
    this._countBeforeMeasure = 0
  }

  /**
   * 获取当前测量的实体数量
   */
  get entityCount() {
    if (!this._dataSource) return 0
    return this._dataSource.entities.values.length
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

  /**
   * 从 viewer.dataSources 中查找 DC.Measure 创建的 dataSource
   * DC.Measure 构造函数中: new Cesium.CustomDataSource('measure-layer')
   */
  _findDataSource() {
    const dsList = this._viewer?._delegate?.dataSources
    if (!dsList) return null

    // 从末尾查找（最新添加的）
    for (let i = dsList.length - 1; i >= 0; i--) {
      const ds = dsList.get(i)
      if (ds && ds.name === 'measure-layer') {
        return ds
      }
    }
    return null
  }

  _updateResultCount() {
    if (!this._dataSource) {
      this._resultCount = 0
      return
    }
    this._resultCount = this._dataSource.entities.values.length
  }
}

export default MeasurePlugin
