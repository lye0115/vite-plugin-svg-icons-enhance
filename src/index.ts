import { Plugin, transformWithEsbuild } from 'vite';
import fs, { readdirSync } from 'fs';
import { resolve, relative } from 'path';
import { transform } from '@svgr/core';
import chalk from 'chalk';
import { Config } from 'svgo';

interface SvgIconsPluginOptions {
  dir: string;
  log?: boolean;
  svgoOptions?: Config['plugins'];
}

const virtualModuleId = 'virtual:svg-icons-enhance';

// 虚拟模块的ID,vite
const resolvedVirtualModuleId = '\0' + virtualModuleId;

const globalOptions: SvgIconsPluginOptions = {
  dir: '',
  log: false,
  svgoOptions: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
        },
      },
    },
  ],
} as SvgIconsPluginOptions;

/**
 * 递归扫描指定目录及其子目录下的所有 SVG 文件
 * @param dir 要扫描的目录路径
 * @returns 返回所有找到的 SVG 文件的绝对路径数组
 */
function scanSvgFiles(dir: string): string[] {
  const results: string[] = [];

  function scan(directory: string) {
    const entries = readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.svg')) {
        results.push(fullPath);
      }
    }
  }

  scan(dir);
  // 修改 chalk 的使用方式
  globalOptions.log && console.log(chalk.red(`[vite-plugin-svg-icons-enhance] found ${results.length} svg resources`));
  return results;
}

/**
 * generate svg virtual module
 */
async function generateExports(svgFiles: string[], rootDir: string): Promise<string> {
  const iconsMapping: Record<string, string> = {};

  for (const filePath of svgFiles) {
    const relativePath = relative(rootDir, filePath);
    const iconKey = relativePath.replace(/\\|\//g, '-').replace(/\.svg$/, '');

    try {
      const svgCode = await fs.promises.readFile(filePath, 'utf8');
      // use svgr transform svg to reactElement
      const componentCode = await transform(svgCode, {
        plugins: ['@svgr/plugin-jsx'],
        svgoConfig: { plugins: globalOptions.svgoOptions },
        template: (variables, { tpl }) => {
          return tpl`
          ${variables.interfaces};
          (${variables.props}) => (${variables.jsx})`;
        },
      });

      // for vite dev esbuild
      const res = await transformWithEsbuild(componentCode, iconKey, {
        loader: 'jsx',
      });
      iconsMapping[iconKey] = res.code;
    } catch (error) {
      // 修改 chalk 的使用方式
      console.error(chalk.red('loading svg error:'), error);
    }
  }

  // 生成模块代码
  return `
    import * as React from "react";

    const icons = {
        ${Object.keys(iconsMapping)
          .map(key => {
            let code = iconsMapping[key].trim();
            code = code.replace(/;$/, '');
            return `'${key}': ${code}`;
          })
          .join(',\n  ')}
    };
    export default icons;
    `;
}

export default function SvgEnhancePlugin(options: SvgIconsPluginOptions): Plugin {
  Object.assign(globalOptions, options);
  const { dir } = globalOptions;

  if (!dir) {
    throw new Error('vite-plugin-svg-icons-enhance: dir is required');
  }

  return {
    name: 'vite-plugin-svg-icons-enhance',

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    // resolveId hook结束后调用
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const svgFiles = scanSvgFiles(dir);
        const generatedCode = await generateExports(svgFiles, dir);
        return {
          code: generatedCode,
        };
      }
    },

    // HRM
    handleHotUpdate({ server, file }) {
      if (file.endsWith('.svg') && file.includes(dir)) {
        const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
        if (module) {
          server.moduleGraph.invalidateModule(module);
          return [module];
        }
      }
    },
  };
}
