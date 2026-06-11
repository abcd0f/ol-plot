/**
 * 纯数学 / 坐标计算工具函数
 *
 * 零 OpenLayers 依赖，仅使用 `Math.*` 和基本类型。
 * 可用于任意需要二维坐标运算的场景。
 */

/**
 * 计算两点之间的欧几里得距离
 * @param a - 第一个点的坐标 [x, y]
 * @param b - 第二个点的坐标 [x, y]
 * @returns 两点之间的直线距离
 */
export function dist(a: number[], b: number[]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

/**
 * 计算从 p0 到 p1 的方向向量和法向量。
 *
 * 方向向量 = (p1 - p0) / length（单位向量）
 * 法向量 = 方向向量逆时针旋转 90°
 *
 * @param p0 - 起点坐标
 * @param p1 - 终点坐标
 * @param length - 两点间距离（可预先计算以避免重复）
 * @returns 方向向量 (dx, dy) 和法向量 (nx, ny)
 */
export function computeDirectionAndNormal(
  p0: number[],
  p1: number[],
  length: number,
): { dx: number; dy: number; nx: number; ny: number } {
  const dx = (p1[0] - p0[0]) / length;
  const dy = (p1[1] - p0[1]) / length;
  // 法向量：方向向量逆时针旋转 90°
  const nx = -dy;
  const ny = dx;
  return { dx, dy, nx, ny };
}

/**
 * 创建退化 Polygon（两点重合时的兜底）。
 *
 * 当箭头尾部和尖端重合（零长度）时，返回一个最小三角形，
 * 防止 OpenLayers 渲染空几何报错。
 *
 * @param point - 退化点坐标
 * @returns 退化的 Polygon 坐标 `number[][][]`
 */
export function createDegeneratePolygon(point: number[]): number[][][] {
  return [[[...point], [...point], [...point]]];
}
