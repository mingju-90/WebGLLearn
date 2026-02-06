<template>
  <div class="three-container">
    <sceneThree @ready="readyScene">
      <LoadGltfVue value="/glb/officeBuild.glb" @loaded="loadGltf" />
    </sceneThree>
    <div class="tools">
      <a-button @click="expandOfficeBuildingFloors(true)">展开</a-button>
      <a-button @click="expandOfficeBuildingFloors(false)">收起</a-button>
    </div>
  </div>
</template>

<script setup>
import * as THREE from 'three';
// 页面逻辑
import { onBeforeUnmount, onMounted } from 'vue';
import sceneThree from '../../components/threeComponents/sceneThree.vue';
import LoadGltfVue from '../../components/threeComponents/loadGltf.vue';
import { useThreeMousePick } from '../../hooks/threeHooks/mouseHooks';
import { setModelScale } from '../../utils/therrUtils';
import gsap from 'gsap'
import { getBox3Info } from '../../utils/threeIndex';


let threeObj = null
let officeBuild = null
/** 组件销毁时需要执行的清除方法 */
const unmountFnList = []


const readyScene = ({ scene, camera, renderer, controls, addUpdate }) => {
  threeObj = { scene, camera, renderer, controls, addUpdate }
}

const loadGltf = (model) => {
  officeBuild = model
  model.scene.traverse(item => {
    if(item.isMesh) console.log(getBox3Info(item))
  })
  console.log('loadGltf', model)
  // getBox3Info
  setModelScale(model.scene, 100)

  officeBuild.scene.children.forEach((child, index) => {
    child.oldPosition = {
      x: child.position.x,
      y: child.position.y,
      z: child.position.z,
    }
  })

  sortOfficeBuild(model)
  officeHover(model.scene.children)
  pullOutFloor()
}

/** 根据楼层的顺序调整 children 的排序 */
const sortOfficeBuild = (model) => {
  // 根据楼层的顺序调整 children 的排序
  const targetOrder = ['zuo1', 'zuo2', 'zuo3', 'zuo4', 'zuo5', 'zuoding'];
  model.scene.children.sort((a, b) => {
    // 获取每个对象在目标顺序中的索引
    const indexA = targetOrder.indexOf(a.name);
    const indexB = targetOrder.indexOf(b.name);
    // 按索引从小到大排序
    return indexA - indexB;
  });
}

/** 鼠标移入高亮楼层 */
const officeHover = (pickableObjects) => {
  let oldPickObj = null
  const picker = useThreeMousePick({
    ...threeObj, eventType: 'mousemove', pickableObjects, throttleTime: 1000 / 120, onPick: pickObj => {
      if (oldPickObj === pickObj) return
      if (oldPickObj) {
        oldPickObj.traverse(child => {
          if (!child.isMesh) return
          child.material = child.oldMaterial
          child.oldMaterial = undefined
        })
      }
      if (pickObj) {
        pickObj.traverse(child => {
          if (!child.isMesh) return
          child.oldMaterial = child.material
          child.material = new THREE.MeshPhongMaterial({
            color: 'yellow',
            transparent: true,
            opacity: 0.8,
            emissiveMap: child.material.map,
            emissiveIntensity: 3
          })
        })
      }
      oldPickObj = pickObj

    }
  })

  picker.enable()
  unmountFnList.push(picker.disable)
}

const pullOutFloor = () => {
  let oldPickObj = null
  const picker = useThreeMousePick({
    ...threeObj, eventType: 'click', pickableObjects: officeBuild.scene.children, throttleTime: 1000 / 120, onPick: pickObj => {
      if(!pickObj) return
      if (pickObj && pickObj !== oldPickObj) {
        gsap.to(pickObj.position, {
          z: pickObj.oldPosition.z + 40,
          duration: 1,
          ease: 'power1.inOut'
        })
      }
      if (oldPickObj) {
        gsap.to(oldPickObj.position, {
          z: oldPickObj.oldPosition.z,
          duration: 1,
          ease: 'power1.inOut'
        })
      }
      oldPickObj = pickObj === oldPickObj ? null : pickObj
    }
  })
  picker.enable()
  unmountFnList.push(picker.disable)
}


/** 展开收起楼层 */
const expandOfficeBuildingFloors = (flag) => {
  officeBuild.scene.children.forEach((child, index) => {
    gsap.to(child.position, {
      y: flag ? child.oldPosition.y + index * 10 : child.oldPosition.y,
      duration: 2,
      ease: 'power1.inOut'
    })
  })
}

onMounted(() => {
  console.log('three 页面加载完成');
});

onBeforeUnmount(() => {
  unmountFnList.forEach(fn => fn())
})
</script>

<style scoped lang="scss">
.three-container {
  padding: var(--spacing-base);
  height: 100%;
  position: relative;
}

.tools {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 12px;
}
</style>