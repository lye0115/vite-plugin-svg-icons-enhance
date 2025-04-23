# 🚀 vite-plugin-svg-icons-enhance

<p align="center">
  <img src="https://img.shields.io/npm/v/vite-plugin-svg-icons-enhance" alt="npm version">
  <img src="https://img.shields.io/npm/dm/vite-plugin-svg-icons-enhance" alt="downloads">
  <img src="https://img.shields.io/npm/l/vite-plugin-svg-icons-enhance" alt="license">
</p>

<p align="center">
  <b>为 Vite 项目自动生成 SVG 图标组件</b><br>
  提供了一种简单高效的方式来管理和使用 SVG 图标，支持 React 和 Vue，内置 SVGO 优化
</p>

## ✨ 特性

- 🔍 **自动扫描** - 递归扫描指定目录及其子目录下的所有 SVG 文件
- 🧩 **组件生成** - 自动将 SVG 转换为 React/Vue 组件
- 🔄 **HMR 支持** - 支持热模块替换，实时预览修改效果
- 🛠️ **SVGO 优化** - 内置 SVGO 优化，减小 SVG 文件体积
- 🌈 **多框架支持** - 同时支持 React 和 Vue3 项目
- 🔌 **简单易用** - 通过虚拟模块导入所有图标，使用方便

## 📦 安装

```bash
# npm
npm install vite-plugin-svg-icons-enhance --save-dev

# yarn
yarn add vite-plugin-svg-icons-enhance -D

# pnpm
pnpm add vite-plugin-svg-icons-enhance -D
```

## 🔧 配置

在 `vite.config.js` 或 `vite.config.ts` 中添加插件：

```typescript
import { defineConfig } from 'vite';
// 根据您的项目选择相应的框架插件
import react from '@vitejs/plugin-react'; // React项目
// 或
import vue from '@vitejs/plugin-vue'; // Vue项目

import SvgEnhancePlugin from 'vite-plugin-svg-icons-enhance';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    // 根据项目选择相应的框架插件
    react(), // React项目
    // 或
    vue(), // Vue项目

    SvgEnhancePlugin({
      // SVG 图标所在目录，必填
      dir: resolve(__dirname, 'src/assets/icons'),
      // 是否在控制台输出日志信息，默认 false,可选
      log: true,
      // 框架类型，不填会自动检测，也可以手动指定
      framework: 'react', // 'react' | 'vue'
      // SVGO 优化选项，可选
      svgoOptions: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              // 保留 viewBox 属性
              removeViewBox: false,
              // 其他 SVGO 配置...
            },
          },
        },
      ],
    }),
  ],
});
```

## 📝 TypeScript 支持

本插件提供了针对不同框架的类型声明。要使用正确的类型，需要在项目的 `tsconfig.json` 中添加相应的配置：

### React 项目

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite-plugin-svg-icons-enhance/react"]
  }
}
```

### Vue 项目

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite-plugin-svg-icons-enhance/vue"]
  }
}
```

如果您仍然遇到类型识别问题，可以在项目中手动添加声明文件：

#### React 项目中的声明文件

```typescript
// src/types/svg-icons.d.ts
declare module 'virtual:svg-icons-enhance' {
  import * as React from 'react';
  const icons: Record<string, React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>>;
  export default icons;
}
```

#### Vue 项目中的声明文件

```typescript
// src/types/svg-icons.d.ts
declare module 'virtual:svg-icons-enhance' {
  import { Component } from 'vue';
  const icons: Record<string, Component>;
  export default icons;
}
```

## 🎯 使用方法

### React 项目

#### 基本使用

```tsx
import React from 'react';
import icons from 'virtual:svg-icons-enhance';

function IconDemo() {
  // 假设在 src/assets/icons/common/home.svg 存在
  // 图标键名格式为：目录-文件名
  const HomeIcon = icons['common-home'];

  return (
    <div>
      <h1>SVG 图标示例</h1>
      {HomeIcon ? <HomeIcon width={24} height={24} color="blue" /> : <span>图标未找到</span>}

      {/* 动态使用图标 */}
      {Object.entries(icons).map(([name, Icon]) => (
        <div key={name} style={{ margin: '10px' }}>
          <Icon width={20} height={20} />
          <span style={{ marginLeft: '8px' }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

export default IconDemo;
```

#### 创建可复用的 SvgIcon 组件 (React)

```tsx
// src/components/SvgIcon.tsx
import classNames from 'classnames';
import { FC } from 'react';
import virtualIcons from 'virtual:svg-icons-enhance';

type PropsType = {
  name: string;
  size?: string | number;
  color?: string;
  className?: string;
};

const SvgIcon: FC<React.SVGAttributes<SVGSVGElement> & PropsType> = ({ name, size = '1em', color = 'currentColor', className = '' }) => {
  const Icon = virtualIcons[name];

  return (
    <Icon
      className={classNames(' inline-block', className)}
      fill={color}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
      }}
    />
  );
};

export default SvgIcon;
```

### Vue3 项目

#### 基本使用

```vue
<template>
  <div>
    <h1>SVG 图标示例</h1>
    <!-- 直接使用图标组件 -->
    <component :is="icons['common-home']" width="24" height="24" />

    <!-- 动态渲染所有图标 -->
    <div v-for="(Icon, name) in icons" :key="name" style="margin: 10px;">
      <component :is="Icon" width="20" height="20" />
      <span style="margin-left: 8px;">{{ name }}</span>
    </div>
  </div>
</template>

<script setup>
import icons from 'virtual:svg-icons-enhance';
</script>
```

#### 创建可复用的 SvgIcon 组件 (Vue3)

```vue
<!-- src/components/SvgIcon.vue -->
<template>
  <component
    :class="['usyncls-icon', className]"
    :style="{
      width: typeof size === 'number' ? size + 'px' : size,
      height: typeof size === 'number' ? size + 'px' : size,
      color: color,
    }"
    :is="iconComponent"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import virtualIcons from 'virtual:svg-icons-enhance';

const props = withDefaults(
  defineProps<{
    name: string;
    size?: string | number;
    color?: string;
    className?: string;
  }>(),
  {
    size: '1em',
    color: 'currentColor',
    className: '',
  }
);

const iconComponent = computed(() => virtualIcons[props.name]);
</script>

<style lang="scss">
.usyncls-icon {
  display: inline-block;
  vertical-align: middle;
  fill: currentColor;
  overflow: hidden;
}
</style>
```

使用此组件：

```vue
<template>
  <div>
    <h1>SVG 图标示例</h1>

    <!-- 使用默认大小和颜色 -->
    <SvgIcon name="common-home" />

    <!-- 自定义大小（数字表示像素） -->
    <SvgIcon name="common-user" :size="24" />

    <!-- 自定义大小（字符串支持各种CSS单位） -->
    <SvgIcon name="nav-settings" size="2rem" />

    <!-- 自定义颜色 -->
    <SvgIcon name="common-notification" color="#ff5500" />

    <!-- 添加自定义类名 -->
    <SvgIcon name="common-search" className="custom-icon" />
  </div>
</template>

<script setup>
import SvgIcon from '@/components/SvgIcon.vue';
</script>
```

#### 与 UI 框架集成 (Vue)

```vue
<template>
  <a-button type="primary">
    <SvgIcon name="common-upload" :size="16" className="mr-1" />
    上传文件
  </a-button>
</template>

<script setup>
import { Button as AButton } from 'ant-design-vue';
import SvgIcon from '@/components/SvgIcon.vue';
</script>
```

## 🔍 图标命名规则

插件会将 SVG 文件路径转换为图标名称：

- SVG 文件路径中的 `/` 或 `\` 会被替换为 `-`
- 文件扩展名 `.svg` 会被移除

例如：

| SVG 文件路径                      | 图标键名     |
| --------------------------------- | ------------ |
| src/assets/icons/home.svg         | home         |
| src/assets/icons/common/user.svg  | common-user  |
| src/assets/icons/nav/settings.svg | nav-settings |

## 🛠️ 高级配置

### SVGO 优化选项

本插件支持通过 `svgoOptions` 自定义 SVGO 配置，以下是一些常用的 SVGO 优化选项：

```typescript
svgoOptions: [
  {
    name: 'preset-default',
    params: {
      overrides: {
        // 保留 viewBox
        removeViewBox: false,
        // 清理 ID
        cleanupIDs: true,
        // 移除元数据
        removeMetadata: true,
        // 移除注释
        removeComments: true,
        // 优化路径数据
        convertPathData: {
          floatPrecision: 2,
        },
      },
    },
  },
];
```

### 框架自动检测

插件会自动检测您的项目使用的框架(仅支持 vue 和 react)，但您也可以通过 `framework` 选项手动指定：

```typescript
SvgEnhancePlugin({
  dir: resolve(__dirname, 'src/assets/icons'),
  framework: 'vue', // 'react'
});
```

## 🎨 最佳实践

1. **组织图标目录结构**：按照功能或模块划分图标目录，便于管理和查找

   ```
   src/assets/icons/
   ├── common/    # 通用图标
   ├── nav/       # 导航图标
   ├── social/    # 社交媒体图标
   └── actions/   # 操作相关图标
   ```

2. **使用一致的命名规范**：保持图标文件命名一致性，例如全部使用小写和连字符

   ```
   user-profile.svg    ✅
   UserProfile.svg     ❌
   ```

3. **确保 SVG 文件质量**：使用设计工具导出 SVG 时，清理不必要的属性和层

4. **预留默认属性**：在 `SvgIcon` 组件中设置合理的默认值，减少重复配置

5. **类型声明正确引用**：根据项目框架选择正确的类型声明路径

   ```json
   // React项目
   "types": ["vite-plugin-svg-icons-enhance/react"]

   // Vue项目
   "types": ["vite-plugin-svg-icons-enhance/vue"]
   ```

## 🔄 热更新

本插件支持 HMR（热模块替换），当您修改 SVG 文件时，相关组件会自动刷新，无需手动重启开发服务器。

## 🤝 贡献

欢迎提交问题和贡献代码！

## 📜 许可证

[ISC License](LICENSE)
