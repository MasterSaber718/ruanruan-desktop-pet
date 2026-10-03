/**
 * Toon 渐变贴图生成器
 *
 * 参考 Blender ColorRamp + 魔之屋渲染方案：
 * - 5 级色阶（阴影/中调/明调/高光/反光）
 * - 使用 Three.js 内置 MeshToonMaterial + gradientMap
 * - 稳定可靠，不会因 shader 编译失败导致模型不显示
 *
 * gradientMap 是一张 1D 渐变贴图（Nx1 像素），
 * MeshToonMaterial 根据 NoL（法线·光向量）采样这张贴图，
 * 实现阶调光照效果。
 */

import * as THREE from 'three';

/**
 * 创建 5 级 Toon 渐变贴图
 *
 * 色阶值（从暗到亮）：
 *   0.0  - 完全阴影
 *   0.25 - 阴影过渡
 *   0.5  - 中间调
 *   0.75 - 明亮调
 *   1.0  - 最亮（高光区）
 *
 * @param levels 色阶数（默认 5）
 * @returns THREE.DataTexture
 */
export function createToonGradientMap(levels: number = 5): THREE.DataTexture {
  // 创建 Nx1 的 DataTexture
  const size = Math.max(levels, 2);
  const data = new Uint8Array(size);

  // 5 级色阶：0, 51, 102, 153, 204, 255
  // 用阶梯函数生成硬切边 toon 效果
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    // 阶梯函数：将连续值映射到 5 级
    const stepped = Math.floor(t * levels) / (levels - 1);
    data[i] = Math.round(stepped * 255);
  }

  const texture = new THREE.DataTexture(data, size, 1, THREE.RedFormat);
  texture.magFilter = THREE.NearestFilter; // 硬切边
  texture.minFilter = THREE.NearestFilter; // 硬切边
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}

/**
 * 缓存的渐变贴图（避免重复创建）
 */
let cachedGradientMap: THREE.DataTexture | null = null;

/**
 * 获取共享的 5 级 Toon 渐变贴图
 */
export function getSharedToonGradientMap(): THREE.DataTexture {
  if (!cachedGradientMap) {
    cachedGradientMap = createToonGradientMap(5);
  }
  return cachedGradientMap;
}
