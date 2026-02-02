<template>
  <div class="app-wrap">
    <List :data-source="routes" class="menu">
      <template #renderItem="{ item }">
        <ListItem>
          <ListItemMeta :description="item.description">
            <template #title>
              <router-link :to="{ name: item.name }" >
                <span :class="{active: route.name === item.name}">{{ item.name }}</span>
              </router-link>
            </template>
          </ListItemMeta>
        </ListItem>
      </template>
    </List>
    <div class="main">
      <RouterView></RouterView>
    </div>
  </div>
</template>

<script setup>
// 引入所需的响应式函数和钩子函数
import { ref, reactive } from 'vue';
import { routes } from './router';
import { List, ListItem, ListItemMeta } from 'ant-design-vue';
import { useRoute } from 'vue-router';

const route = useRoute()

console.log(route)

</script>

<style lang="scss">
#app {
  width: 100%;
  height: 100%;
}
.app-wrap {
  width: 100%;
  height: 100%;
  display: flex;

  .menu {
    width: 180px;
  }

  .main {
    width: calc(100% - 180px);
    position: relative;
  }
  .active {
    color: var(--color-primary);
  }
}
</style>