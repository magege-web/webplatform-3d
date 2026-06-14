# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. 项目概览

基于 **Vue 3 + Vite + DC-SDK** 的 3D GIS/地图可视化应用脚手架。DC-SDK（来自 DVGis）提供基于 Cesium 的 3D 地球和 2D 地图能力。
* 重点：所有功能的实现必须是使用dc-sdk中的插件
* 参考文档：
- 功能案例： https://dc.dvgis.cn/#/examples 
- DC-SDK 开发文档： https://resource.dvgis.cn/dc-api/v2.x/zh/base/#dc-transform
- public下的 dc.min.js 为dc-sdk中的实现过程；

## 2. 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | ^3.3.4 |
| 构建工具 | Vite | ^4.4.5 |
| 路由 | vue-router (hash 模式) | ^4.6.4 |
| GIS 引擎 | @dvgis/dc-sdk | ^3.2.0 |
| Vite GIS 插件 | @dvgis/vite-plugin-dc | ^2.1.2 |
| UI 组件库 | Element Plus | ^2.14.1 |
| CSS 预处理 | Sass | ^1.100.0 |
| 包管理器 | pnpm | — |
| 代码格式化 | Prettier | ^3.0.0 |
| 代码检查 | ESLint + vue3-recommended | ^8.45.0 |
| 模块规范 | ES Modules (`"type": "module"`) | — |

## 3. 常用命令

```bash
pnpm dev        # 启动开发服务器 — 端口 8888，监听 0.0.0.0
pnpm build      # 生产构建到 dist/，base 为 './'（相对路径）
pnpm preview    # 本地预览生产构建
```

暂无测试框架和 lint 脚本。Lint 通过 Vite 的 ESLint 插件在 dev 时自动运行。

## 4. 项目结构

```
dc-vite/
├── index.html                 # HTML 入口 — 挂载 #app，加载 /src/main.js
├── vite.config.js             # Vite 配置 — base: './', port: 8888, DC 插件
├── package.json               # 依赖与脚本
├── pnpm-lock.yaml             # pnpm 锁文件
├── .eslintrc.cjs              # ESLint 配置 — vue3-recommended + prettier
├── CLAUDE.md                  # 项目文档（本文件）
├── public/
│   └── vite.svg               # 网站 favicon
└── src/
    ├── main.js                # 应用入口 — 创建 Vue 实例，注册 Element Plus + Router
    ├── App.vue                # 根组件 — 仅含 <router-view />
    ├── style.css              # 全局样式 — CSS reset + 深色/浅色双主题变量
    ├── router/
    │   └── index.js           # 路由配置 — hash 模式，首页懒加载 Main
    ├── Main/
    │   └── index.vue          # 首页路由页面 — 引用 Navbar + 地图场景容器
    ├── components/
    │   └── Navbar.vue         # 顶部导航栏组件（独立封装）
    └── assets/
        └── vue.svg            # Vue logo 静态资源
```

## 5. 路由设计

| 路径 | 名称 | 组件 | 加载方式 |
|------|------|------|----------|
| `/` | Main | `Main/index.vue` | 懒加载 `() => import()` |

- 使用 **hash 模式**（`createWebHashHistory`），适配部署到子目录的场景。
- 新增页面只需在 `src/router/index.js` 的 `routes` 数组中添加配置即可。
- `App.vue` 根组件只放 `<router-view />`，不直接引入任何页面组件。

## 6. 已实现功能点

### 6.1 顶部导航栏 (`src/components/Navbar.vue`)

独立封装的导航栏组件，fixed 定位，高 54px，带毛玻璃效果和底部渐变装饰线。包含以下按钮：

| 按钮 | 功能 | 状态 |
|------|------|------|
| 菜单 | 切换侧栏 — 通过 `CustomEvent('topbar:toggle-sidebar')` 通知外部 | ✅ |
| 首页 | 返回首页 | ✅（图标就绪，待绑定路由跳转） |
| 搜索 | 搜索功能 | ✅（图标就绪，待绑定逻辑） |
| 图层 | 图层管理 | ✅（图标就绪，待绑定逻辑） |
| 刷新 | 刷新页面/数据 | ✅（图标就绪，待绑定逻辑） |
| 全屏 | 进入/退出浏览器全屏 | ✅ **已实现** |
| 主题切换 | 深色 ↔ 浅色主题切换 | ✅ **已实现** |

### 6.2 全屏功能

- 使用浏览器原生 **Fullscreen API**
- 点击全屏按钮 → `document.documentElement.requestFullscreen()`
- 再次点击 → `document.exitFullscreen()`
- 监听 `fullscreenchange` 事件，按 `Esc` 退出全屏时按钮图标自动同步
- **关键实现细节**：不能使用 `async/await`，必须用 `.catch()` 链式调用，因为 `requestFullscreen()` 必须在用户手势（click 事件）中**同步调用**，否则浏览器会静默拒绝

### 6.3 主题切换（深色/浅色）

- 通过 `<html>` 上的 `data-theme` 属性控制：`data-theme="dark"` | `data-theme="light"`
- CSS 变量定义在 `src/style.css` 中，使用 `[data-theme='dark']` / `[data-theme='light']` 选择器
- 所有组件通过 `var(--theme-xxx)` 引用变量，自动响应主题切换
- 主题偏好存储在 `localStorage`（key: `app-theme`），刷新不丢失
- 默认使用深色主题
- 切换按钮使用太阳/月亮 SVG 图标

#### 主题 CSS 变量对照表

| 变量 | 深色主题 | 浅色主题 | 用途 |
|------|----------|----------|------|
| `--theme-panel` | `rgba(8,16,32,0.88)` | `rgba(255,255,255,0.92)` | 面板/导航栏背景 |
| `--theme-panel-border` | `rgba(0,240,255,0.08)` | `rgba(0,120,160,0.12)` | 面板边框色 |
| `--theme-accent` | `#00f0ff` (青色) | `#0078a0` (深蓝) | 强调色 |
| `--theme-accent-dim` | `rgba(0,240,255,0.08)` | `rgba(0,120,160,0.06)` | 强调色弱化版（hover 背景） |
| `--theme-accent-glow` | `rgba(0,240,255,0.28)` | `rgba(0,120,160,0.18)` | 发光/阴影色 |
| `--theme-text` | `#e2e8f0` | `#1a1a2e` | 主文字色 |
| `--theme-text-muted` | `#64748b` | `#6b7280` | 次要文字色 |
| `--theme-bg` | `#0a0f1a` | `#f0f4f8` | 页面背景色 |
| `--theme-divider` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` | 分割线色 |

## 7. DC-SDK 使用说明

- `@dvgis/vite-plugin-dc` 插件（`DC({useCDN:true})`）在构建时从 CDN 加载 Cesium/DC-SDK 资源。
- **不要**把这些库作为 npm 模块 import — 它们是全局变量。
- 组件中可直接使用的**全局变量**（无需 import）：`DC`、`Cesium`、`echarts`
- 这些全局变量已在 [.eslintrc.cjs](.eslintrc.cjs) 的 `globals` 中声明，lint 不会报错。
- DC-SDK 运行时版本：`@dvgis/dc-sdk` ^3.2.0

## 8. 代码风格

- **包管理器**：pnpm（锁文件 `pnpm-lock.yaml`，不要用 npm/yarn）
- **语言**：JavaScript（ES Modules）
- **Vue 组件**：统一使用 `<script setup>` Composition API
- **格式化**：Prettier — 单引号、无分号
- **Lint**：ESLint + `plugin:vue/vue3-recommended` + `plugin:prettier/recommended`
- **生产环境**：`no-console` 和 `no-debugger` 会 warn
- **构建输出**：`base: './'` 相对路径，可部署到任意子目录

## 9. 架构约定

1. **路由页面**放在 `src/` 下以目录组织（如 `src/Main/index.vue`），通过 `router/index.js` 懒加载注册。
2. **可复用组件**放在 `src/components/` 下。
3. **全局样式和主题变量**放在 `src/style.css` 中。
4. **静态资源**放在 `src/assets/` 下。
5. **新增页面流程**：
   - 在 `src/` 下创建 `PageName/index.vue`
   - 在 `src/router/index.js` 的 `routes` 数组中添加路由配置
   - 如需导航链接，在 `Navbar.vue` 中添加对应按钮

## 10. 注意事项

- **全屏 API**：不能用 `async/await`，必须 `.catch()` 链式调用（原因见 6.2）。
- **主题变量**：新增组件需要支持主题切换时，在组件 scoped style 顶部用 `--xxx: var(--theme-xxx)` 的方式桥接全局变量，不要直接在样式中硬编码颜色值。
- **macOS 文件系统不区分大小写**，但 import 路径必须保持文件名大小写一致，否则在 Linux 构建时会报错。
