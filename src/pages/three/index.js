// three 页面导出

const component = () => import('./index.vue')

export default {
    name: 'three',
    component,
    path: '/three',
    description: '基本的模型加载和hover高亮,点击抽出的效果'
}