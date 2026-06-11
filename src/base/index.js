/**
 * src/base — 3D 地球相关插件集合
 *
 * 每个插件遵循 DC-SDK API 风格：
 * - 类构造函数接收 options 配置对象
 * - mount(container) / unmount() 管理生命周期
 * - getter 属性暴露内部实例
 * - setOptions() 支持运行时更新配置
 */

export { default as GlobePlugin } from './GlobePlugin.js'
export { default as DrawPlugin } from './DrawPlugin.js'
