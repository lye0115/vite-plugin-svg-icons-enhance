import { transform } from '@svgr/core';
import chalk from 'chalk';
import fs, { readdirSync } from 'fs';
import { customAlphabet } from 'nanoid';
import path, { relative } from 'path';
import { optimize } from 'svgo';
import { transformWithEsbuild } from 'vite';
import { compileTemplate } from 'vue/compiler-sfc';
import { globalOptions, SvgIconsPluginOptions } from '.';
export type Framework = 'vue' | 'react' | 'unknown';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

// 检测当前项目是vue还是react项目
export const detectFramework: () => Framework = () => {
  try {
    // 读取项目根目录的 package.json
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // 检查是否包含 Vue 或 React
    const hasVue = 'vue' in dependencies || '@vue/runtime-core' in dependencies;
    const hasReact = 'react' in dependencies || 'react-dom' in dependencies;

    if (hasVue && !hasReact) return 'vue';
    if (hasReact && !hasVue) return 'react';
    if (hasVue && hasReact) {
      chalk.red('无法识别当前是Vue还是React，请手动指定');
      throw new Error('当前项目同时包含 Vue 和 React');
    }

    return 'unknown';
  } catch (error) {
    console.error('Error detecting framework:', error);
    return 'unknown';
  }
};

/**
 * 递归扫描指定目录及其子目录下的所有 SVG 文件
 * @param dir 要扫描的目录路径
 * @returns 返回所有找到的 SVG 文件的绝对路径数组
 */
export const scanSvgFiles = (dir: string, globalOptions: SvgIconsPluginOptions) => {
  const results: string[] = [];

  function scan(directory: string) {
    const entries = readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.resolve(directory, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.svg')) {
        results.push(fullPath);
      }
    }
  }

  scan(dir);
  globalOptions.log && console.log(chalk.red(`[vite-plugin-svg-icons-enhance] found ${results.length} svg resources`));
  return results;
};

/**
 * generate svg virtual module
 */
export async function generateReactExports(svgFiles: string[], rootDir: string): Promise<string> {
  const iconsMapping: Record<string, string> = {};

  for (const filePath of svgFiles) {
    const relativePath = relative(rootDir, filePath);
    const iconKey = relativePath.replace(/\\|\//g, '-').replace(/\.svg$/, '');

    try {
      const svgCode = await fs.promises.readFile(filePath, 'utf8');
      // use svgr transform svg to reactElement
      const componentCode = await transform(svgCode, {
        plugins: ['@svgr/plugin-jsx'],
        svgoConfig: { ...globalOptions.svgoOptions },
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

// transform svg to vue component
export async function generateVueExports(svgFiles: string[], rootDir: string): Promise<string> {
  const componentMap: Record<string, { code: string; uuid: string }> = {};

  for (const filePath of svgFiles) {
    const relativePath = relative(rootDir, filePath);
    const iconKey = relativePath.replace(/\\|\//g, '-').replace(/\.svg$/, '');

    try {
      const sourceCode = await fs.promises.readFile(filePath, 'utf8');
      const optimizedCode = optimize(sourceCode, {
        ...globalOptions.svgoOptions,
      }).data;

      const compiledCode = compileTemplate({
        source: optimizedCode,
        filename: filePath,
        id: iconKey,
        transformAssetUrls: false,
      });

      // 生成随机uuid,compileTemplate编译后会生成重复变量问题
      const uuid = nanoid(8);

      // 清理编译后的代码，移除import和export关键字
      let cleanedCode = compiledCode.code
        .replace(/import\s+{[^}]+}\s+from\s+["']vue["'];?/g, '') // 移除import
        .replace(/export\s+function\s+render/g, 'function render') // 修改export function
        .replace(/_hoisted_1/g, `${uuid}_hoisted_1`) // 修改_hoisted_1变量，compileTemplate编译后总是会生成_hoisted_1，多模块下会有问题
        .replace(/render/g, `${uuid}_render`); // 修改render变量，compileTemplate编译后总是会生成render，多模块下会有问题

      componentMap[iconKey] = { code: cleanedCode, uuid };
    } catch (error) {
      console.error(`Error processing SVG file ${filePath}:`, error);
    }
  }

  // fs.promises.appendFile(
  //   resolve(process.cwd(), "./code.js"),
  //   componentMap["vue"].code
  // );

  // 生成简化的代码，避免任何语法问题
  return `import { 
            createElementVNode as _createElementVNode, 
            openBlock as _openBlock, 
            createElementBlock as _createElementBlock, 
            createStaticVNode as _createStaticVNode,
            createCommentVNode as _createCommentVNode,
            createTextVNode as _createTextVNode,
            toDisplayString as _toDisplayString,
            Fragment as _Fragment,
            renderList as _renderList,
            normalizeClass as _normalizeClass,
            normalizeStyle as _normalizeStyle,
            withCtx as _withCtx,
            } from "vue";
          const icons = {};
          ${Object.keys(componentMap)
            .map(
              key => `
                // ${key} component
                   ${componentMap[key].code}
                   icons["${key}"] = { render:${componentMap[key].uuid}_render };`
            )
            .join('\n')}
          export default icons;`;
}
