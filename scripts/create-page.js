import {existsSync, mkdirSync, writeFileSync} from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

// 根据文件路径获取目录的绝对路径  
// import.meta.url 获取的值 file:///Users/mingju/Desktop/练手代码/learing-code/scripts/create-page.js
// fileURLToPath /Users/mingju/Desktop/练手代码/learing-code/scripts/create-page.js. 
// __dirname /Users/mingju/Desktop/练手代码/learing-code/scripts
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 打印错误信息并终止 */
const logAndExit = err => {
    console.log(err)
    process.exit(1)
}

// process.argv 的值
// node 命令的路径 /Users/mingju/.nvm/versions/node/v18.20.8/bin/node
// 被执行脚本的绝对路径 /Users/mingju/Desktop/练手代码/learing-code/scripts/create-page.js
// 运行脚本传入的自定义参数
const pageName = process.argv[2]
if(!pageName) logAndExit('❌ 请输入页面名称! 例如: pnpm run create-page [页面名]')

// 页面文件夹路径(pages/[页面名])
const pageDir = path.resolve(__dirname, '../src/pages', pageName)

// 检查文件夹是否存在
if(existsSync(pageDir)) logAndExit(`❌ 页面 "${pageName}" 已存在！`)

// 穿件文件夹, 支持多级目录 
mkdirSync(pageDir, {recursive: true})

// 1. 生成 index.vue 模板
const vueTemplate = `
<template>
  <div class="${pageName}-container">
    <h1>${pageName} 页面</h1>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted } from 'vue';

onMounted(() => {
  console.log('${pageName} 页面加载完成');
});
</script>

<style scoped lang="scss">
.${pageName}-container {
  padding: var(--spacing-base);
  height: 100%;
}
</style>
`.trim();


// 2. 生成 index.js 模板（用于导出组件，便于路由注册等）
const jsTemplate = `
// ${pageName} 页面导出

const component = () => import('./index.vue')

export default {
    name: '${pageName}',
    component,
    path: '/${pageName}',
    description: '${pageName}'
}

`.trim();

// 写入文件（使用同步方法）
writeFileSync(path.join(pageDir, 'index.vue'), vueTemplate);
writeFileSync(path.join(pageDir, 'index.js'), jsTemplate);

console.log(`✅ 页面 "${pageName}" 创建成功! 路径: src/pages/${pageName}`);