import {createRouter, createWebHistory} from 'vue-router'

export const routes = [
  
]

const pages = import.meta.glob('../pages/*/index.js', {import: 'default', eager: true});


Object.keys(pages).forEach(path => {
    const page = pages[path]
    routes.push(page)
})

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router