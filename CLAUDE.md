# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3 + Vite + DC-SDK scaffold for building 3D GIS/mapping applications. DC-SDK (from DVGis) provides Cesium-based 3D globe and 2D map capabilities.

## Commands

```bash
pnpm dev        # Start dev server on port 8888, bound to 0.0.0.0
pnpm build      # Production build to dist/
pnpm preview    # Preview production build locally
```

No test framework or lint script is configured yet. Linting runs via the Vite ESLint plugin during dev.

## Architecture

```
src/
├── main.js      # App entry point — mounts Vue app to #app
├── App.vue      # Root component (currently bare scaffold)
├── style.css    # Global styles (CSS reset, full-viewport #app)
└── assets/      # Static assets
```

- **Entry**: [index.html](index.html) loads [src/main.js](src/main.js) as a module.
- **Build**: Vite 4 with `base: './'` (relative paths — important for deployment to subdirectories).

## DC-SDK Setup

- The `@dvgis/vite-plugin-dc` plugin (`DC({useCDN:true})`) loads Cesium/DC-SDK resources from CDN at build time. Do not import these as npm modules — they're available as globals.
- **Global variables** available in components without import: `DC`, `Cesium`, `echarts`. These are declared in [.eslintrc.cjs](.eslintrc.cjs) globals to suppress lint errors.
- The DC-SDK runtime version is `@dvgis/dc-sdk` ^3.2.0.

## Code Style

- **Package manager**: pnpm (lockfile is `pnpm-lock.yaml`)
- **Language**: JavaScript (ES modules, `"type": "module"`)
- **Formatting**: Prettier — single quotes, no semicolons
- **Linting**: ESLint with `plugin:vue/vue3-recommended` and Prettier integration. `no-console`/`no-debugger` warn in production.
- Vue components use `<script setup>` composition API.
