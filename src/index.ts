import { customAlphabet } from 'nanoid';
import { Config } from 'svgo';
import { Plugin } from 'vite';
import { detectFramework, Framework, generateReactExports, generateVueExports, scanSvgFiles } from './lib';

export interface SvgIconsPluginOptions {
  dir: string;
  framework?: Framework;
  log?: boolean;
  svgoOptions?: Config;
}

const virtualModuleId = 'virtual:svg-icons-enhance';

// 虚拟模块的ID,vite
const resolvedVirtualModuleId = '\0' + virtualModuleId;

export const globalOptions: SvgIconsPluginOptions = {
  dir: '',
  log: false,
  svgoOptions: {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            inlineStyles: {
              onlyMatchedOnce: false,
            },
            removeViewBox: false,
          },
        },
      },
    ],
  },
} as SvgIconsPluginOptions;

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
        const framework = detectFramework();
        if (framework === 'unknown') return;
        globalOptions.framework = framework;
        const svgFiles = scanSvgFiles(dir, globalOptions);
        const generatedCode = framework === 'vue' ? await generateVueExports(svgFiles, dir) : await generateReactExports(svgFiles, dir);
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
