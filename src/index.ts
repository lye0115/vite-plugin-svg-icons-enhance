import { Plugin, transformWithEsbuild } from "vite";
import fs, { readdirSync } from "fs";
import { resolve, relative } from "path";
import { transform } from "@svgr/core";

interface SvgIconsPluginOptions {
  // SVG 文件所在的目录
  dir: string;
}

const virtualModuleId = "virtual:svg-icons";

// 虚拟模块的ID,vite
const resolvedVirtualModuleId = "\0" + virtualModuleId;

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
      } else if (entry.isFile() && entry.name.endsWith(".svg")) {
        results.push(fullPath);
      }
    }
  }

  scan(dir);
  console.info(
    `[vite-plugin-svg-icons-enhance] 一共扫描到的svg文件${results.length}个svg资源`
  );
  return results;
}

/**
 * 为给定的 SVG 文件列表生成虚拟模块的导出代码
 */
async function generateExports(
  svgFiles: string[],
  rootDir: string
): Promise<string> {
  // 直接使用对象存储组件
  const iconsObj: Record<string, string> = {};

  // 处理每个SVG文件
  for (const filePath of svgFiles) {
    const relativePath = relative(rootDir, filePath);
    const iconKey = relativePath.replace(/\\|\//g, "-").replace(/\.svg$/, "");

    try {
      // 读取SVG内容
      const svgCode = await fs.promises.readFile(filePath, "utf8");
      // 转换为组件
      const componentCode = await transform(svgCode, {
        plugins: ["@svgr/plugin-jsx"],
        template: (variables, { tpl }) => {
          return tpl`
        ${variables.interfaces};
        (${variables.props}) => (${variables.jsx})`;
        },
      });

      // 转换处理，适配vite开发阶段的ESbuild
      const res = await transformWithEsbuild(componentCode, iconKey, {
        loader: "jsx",
      });
      iconsObj[iconKey] = res.code;
    } catch (error) {
      // 错误处理
      console.log("加载svg出错error：", error);
    }
  }

  // 生成模块代码
  return `
import * as React from "react";

// 导出对象
const icons = {
  ${Object.keys(iconsObj)
    .map((key) => {
      // 先去掉"const xxx = "前缀
      let code = iconsObj[key].trim();
      // 再去掉末尾的分号
      code = code.replace(/;$/, "");
      return `'${key}': ${code}`;
    })
    .join(",\n  ")}
};

export default icons;
`;
}

export default function svgIconsPlugin(options: SvgIconsPluginOptions): Plugin {
  const { dir } = options;

  return {
    name: "vite-plugin-svg-icons-enhance",

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const svgFiles = scanSvgFiles(dir);
        const generatedCode = await generateExports(svgFiles, dir);
        return {
          code: generatedCode,
        };
      }
    },

    // 支持热更新
    handleHotUpdate({ server, file }) {
      if (file.endsWith(".svg") && file.includes(dir)) {
        // 当SVG文件改变时通知客户端更新
        const module = server.moduleGraph.getModuleById(
          resolvedVirtualModuleId
        );
        if (module) {
          server.moduleGraph.invalidateModule(module);
          return [module];
        }
      }
    },
  };
}
