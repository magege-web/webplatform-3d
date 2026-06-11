/**
 * MeasurePlugin — 测量工具插件
 *
 * 基于 DC.Measure 原生 API，提供距离和面积测量。
 * DC.Measure 内部使用 Cesium.CustomDataSource('measure-layer') 存储结果，
 * 通过 viewer._delegate.dataSources 访问。
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
    this._countBeforeMeasure = 0
    this._resultCount = 0
    this._isMounted = false
    this._isDestroyed = false
  }

  get viewer() { return this._viewer }
  get isMeasuring() { return this._isMeasuring }
  get activeMode() { return this._activeMode }
  get resultCount() {
    // 实时从 dataSource 读取，确保准确性
    this._resultCount = this._countEntities()
    return this._resultCount
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

      // 多路回退查找 dataSource
      this._dataSource = this._resolveDataSource()
      if (!this._dataSource) {
        console.warn('[MeasurePlugin] 无法定位 measure dataSource，撤销/清空将不可用')
      }

      console.log('[MeasurePlugin] 挂载成功, dataSource:', !!this._dataSource)
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

    if (this._isMeasuring) {
      this.stop()
    }

    const method = this._measure[type]
    if (typeof method !== 'function') {
      console.warn(`[MeasurePlugin] DC.Measure 不支持: ${type}`)
      return
    }

    // 确保 dataSource 引用有效
    if (!this._dataSource) {
      this._dataSource = this._resolveDataSource()
    }

    this._countBeforeMeasure = this._countEntities()
    this._activeMode = type
    this._isMeasuring = true
    this._options.onStart?.(type)

    console.log(`[MeasurePlugin] 开始测量: ${type}, 当前实体数: ${this._countBeforeMeasure}`)

    try {
      method.call(this._measure, {
        onDrawStop: () => {
          console.log('[MeasurePlugin] onDrawStop 触发')
          this._activeMode = null
          this._isMeasuring = false
          this._resultCount = this._countEntities()
          console.log(`[MeasurePlugin] 测量结束, 实体数: ${this._resultCount}`)
          this._options.onStop?.(null)
        },
      })
    } catch (err) {
      console.error('[MeasurePlugin] 启动测量异常:', err)
      this._options.onError?.(err)
      this._activeMode = null
      this._isMeasuring = false
    }
  }

  stop() {
    if (!this._isMeasuring) return
    console.log('[MeasurePlugin] 取消当前测量')

    if (this._dataSource) {
      this._rollbackEntities(this._countBeforeMeasure)
    }

    this._activeMode = null
    this._isMeasuring = false
    this._countBeforeMeasure = 0
    this._resultCount = this._countEntities()
    this._options.onStop?.(null)
  }

  clear() {
    this.stop()
    console.log('[MeasurePlugin] 清空所有测量')

    if (this._dataSource) {
      this._dataSource.entities.removeAll()
    }

    this._resultCount = 0
    this._countBeforeMeasure = 0
  }

  undo() {
    if (!this._dataSource) return
    const entities = this._dataSource.entities.values
    if (entities.length === 0) return

    console.log(`[MeasurePlugin] 撤销, 撤销前实体数: ${entities.length}`)

    // 回滚到上次测量前的状态
    this._rollbackEntities(this._countBeforeMeasure)
    this._countBeforeMeasure = 0
    this._resultCount = this._countEntities()

    console.log(`[MeasurePlugin] 撤销后实体数: ${this._resultCount}`)
  }

  get entityCount() {
    return this._countEntities()
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

  /** 多路回退定位 dataSource */
  _resolveDataSource() {
    // 方法1：从 measure 实例的 getter 获取
    const fromGetter = this._measure?.customDataSource
      || this._measure?._customDataSource
      || this._measure?.dataSource
      || this._measure?._dataSource
    if (fromGetter && typeof fromGetter.entities?.removeAll === 'function') {
      console.log('[MeasurePlugin] 通过 getter 找到 dataSource')
      return fromGetter
    }

    // 方法2：从 viewer.dataSources 按名称查找
    const dsList = this._viewer?._delegate?.dataSources
    if (dsList) {
      for (let i = dsList.length - 1; i >= 0; i--) {
        const ds = dsList.get(i)
        if (ds && ds.name === 'measure-layer') {
          console.log('[MeasurePlugin] 通过名称找到 dataSource')
          return ds
        }
      }
    }

    // 方法3：遍历 dataSources 找到最新添加的非图层 dataSource
    // DC.Measure 的 dataSource 不含 imageryLayers
    if (dsList) {
      for (let i = dsList.length - 1; i >= 0; i--) {
        const ds = dsList.get(i)
        // Cesium.CustomDataSource 通常 name 不为空
        if (ds && !ds.name?.startsWith('dc-') && ds.entities) {
          console.log(`[MeasurePlugin] 通过遍历找到 dataSource: "${ds.name}"`)
          return ds
        }
      }
    }

    return null
  }

  /** 获取当前 dataSource 中的实体数量 */
  _countEntities() {
    if (!this._dataSource) return 0
    try {
      return this._dataSource.entities.values.length
    } catch (e) {
      return 0
    }
  }

  /** 回滚实体到指定数量 */
  _rollbackEntities(targetCount) {
    if (!this._dataSource) return
    const entities = this._dataSource.entities.values
    while (entities.length > targetCount) {
      this._dataSource.entities.remove(entities[entities.length - 1])
    }
  }
}

export default MeasurePlugin
