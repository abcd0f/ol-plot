<template>
  <div class="map-toolbar" :style="cssVars">
    <span class="map-toolbar-hint">{{ hint }}</span>
    <div class="map-toolbar-divider" />
    <button class="map-toolbar-btn danger" @click="$emit('clear')">清除</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    color?: string;
    hint?: string;
  }>(),
  {
    color: '#1890ff',
    hint: '点击空白处绘制 · 双击完成后自动进入编辑 · 点击要素切换编辑 · 点击空白取消选中',
  },
);

defineEmits<{
  clear: [];
}>();

const cssVars = computed(() => ({ '--accent': props.color }));
</script>

<style scoped>
.map-toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  z-index: 10;
}

.map-toolbar-hint {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.map-toolbar-btn {
  padding: 4px 12px;
  color: #333;
  background: transparent;
  border: 1px solid #d9d9d9;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  user-select: none;
}

.map-toolbar-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

.map-toolbar-btn.danger {
  color: #ff4d4f;
  border-color: #ffccc7;
}

.map-toolbar-btn.danger:hover {
  color: #fff;
  background: #ff4d4f;
  border-color: #ff4d4f;
}

.map-toolbar-divider {
  width: 1px;
  height: 18px;
  background: #e8e8e8;
  margin: 0 2px;
}
</style>
