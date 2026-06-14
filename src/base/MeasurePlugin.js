/**
 * MeasurePlugin — 测量工具插件
 *
 * 基于 DC.Measure 原生 API，DC-SDK 全自动处理鼠标交互和结果存储。
 *
 * 用法：
 *   const measure = new MeasurePlugin()
 *   measure.mount(viewer)
 *   measure.start('distance')
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
        console.log('[MeasurePlugin] 挂载成功')
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
   * 开始测量
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

    if (!this._dataSource) {
      this._dataSource = this._resolveDataSource()
    }

    this._activeMode = type
    this._options.onStart?.(type)

    try {
      method.call(this._measure)
    } catch (err) {
      console.error('[MeasurePlugin] 启动异常:', err)
      this._options.onError?.(err)
      this._activeMode = null
    }
  }

  stop() {
    if (!this._activeMode) return
    this._activeMode = null
    this._options.onStop?.(null)
  }

  /**
   * 清空所有测量 — 多路清空确保彻底
   */
  clear() {
    this._activeMode = null

    // 1. 清空已找到的 dataSource
    if (this._dataSource) {
      this._dataSource.entities.removeAll()
    }

    // 2. 重新查找一次，防止 dataSource 引用失效
    const ds = this._resolveDataSource()
    if (ds && ds !== this._dataSource) {
      ds.entities.removeAll()
      this._dataSource = ds
    }

    // 3. 遍历 viewer 所有 dataSources，清空名为 measure-layer 的
    const dsList = this._viewer?._delegate?.dataSources
    if (dsList) {
      for (let i = dsList.length - 1; i >= 0; i--) {
        const item = dsList.get(i)
        if (item?.name === 'measure-layer') {
          item.entities.removeAll()
        }
      }
    }

    // 4. 通过 measure getter 尝试清空
    const altDS = this._measure?.customDataSource
      || this._measure?._customDataSource
    if (altDS && altDS !== this._dataSource) {
      altDS.entities.removeAll()
    }
    this._measure?.deactivate();
    console.log('[MeasurePlugin] 已清空所有测量')
  }

  undo() {
    // 确保 dataSource 是最新的
    if (!this._dataSource) {
      this._dataSource = this._resolveDataSource()
    }
    if (!this._dataSource) return

    const entities = this._dataSource.entities.values
    if (entities.length === 0) return

    // 完整测量结构：N个点 + 1条polyline + 多个标签
    // 从末尾倒序找到 polyline 实体作为一组测量的边界
    let batchStart = -1
    for (let i = entities.length - 1; i >= 0; i--) {
      if (entities[i].polyline || entities[i].polygon) {
        batchStart = i
        break
      }
    }

    if (batchStart < 0) {
      // 没找到 polyline/polygon，删除所有
      this._dataSource.entities.removeAll()
      return
    }

    // 删除从 batchStart 到末尾的所有实体
    while (entities.length > batchStart) {
      this._dataSource.entities.remove(entities[entities.length - 1])
    }
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
    // 方法1：枚举 measure 实例属性（排除 viewer 自身）
    if (this._measure) {
      const seen = new Set()
      let obj = this._measure
      while (obj && obj !== Object.prototype) {
        // 遍历自有属性
        for (const key of Object.keys(obj)) {
          if (seen.has(key)) continue
          seen.add(key)
          // 跳过 viewer 引用
          if (key === '_viewer' || key === 'viewer') continue

          try {
            const val = obj[key]
            // CustomDataSource: 有 name(字符串) + entities.removeAll
            if (
              val && typeof val === 'object'
              && typeof val.entities?.removeAll === 'function'
              && typeof val.name === 'string'
            ) {
              console.log(`[MeasurePlugin] 通过属性 "${key}" (name="${val.name}") 找到 dataSource`)
              return val
            }
          } catch (e) { /* skip getter errors */ }
        }
        // 原型 getter
        const descs = Object.getOwnPropertyDescriptors(obj)
        for (const [key, desc] of Object.entries(descs)) {
          if (seen.has(key) || !desc.get) continue
          seen.add(key)
          if (key === '_viewer' || key === 'viewer') continue
          try {
            const val = desc.get.call(this._measure)
            if (
              val && typeof val === 'object'
              && typeof val.entities?.removeAll === 'function'
              && typeof val.name === 'string'
            ) {
              console.log(`[MeasurePlugin] 通过 getter "${key}" (name="${val.name}") 找到 dataSource`)
              return val
            }
          } catch (e) { /* skip */ }
        }
        obj = Object.getPrototypeOf(obj)
      }
    }

    // 方法2：从 viewer.dataSources 按名称查找
    const dsList = this._viewer?._delegate?.dataSources
    if (dsList) {
      for (let i = dsList.length - 1; i >= 0; i--) {
        const ds = dsList.get(i)
        if (ds?.name === 'measure-layer') {
          console.log('[MeasurePlugin] 通过 viewer.dataSources 名称找到')
          return ds
        }
      }
    }

    console.warn('[MeasurePlugin] 所有方法均未找到 dataSource')
    return null
  }

  /**
   * 调试：打印 dataSource 中所有实体类型，用于排查分段标签
   */
  debugEntities() {
    const ds = this._dataSource || this._resolveDataSource()
    if (!ds) {
      console.log('[MeasurePlugin] dataSource 未找到')
      return
    }
    const entities = ds.entities.values
    console.log(`[MeasurePlugin] dataSource 共 ${entities.length} 个实体:`)
    entities.forEach((e, i) => {
      const types = []
      if (e.point) types.push('point')
      if (e.polyline) types.push('polyline')
      if (e.polygon) types.push('polygon')
      if (e.label) types.push(`label("${e.label?.text?.getValue?.() || e.label?.text || ''}")`)
      if (e.billboard) types.push('billboard')
      console.log(`  [${i}] ${types.join(', ') || 'unknown'}`, e)
    })
  }

  _countEntities() {
    // 实时从 dataSource 读取
    if (this._dataSource) {
      try { return this._dataSource.entities.values.length } catch (e) { /* */ }
    }
    // 回退查找
    const ds = this._resolveDataSource()
    if (ds) {
      this._dataSource = ds
      try { return ds.entities.values.length } catch (e) { /* */ }
    }
    return 0
  }
}

export default MeasurePlugin
