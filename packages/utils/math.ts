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

/**
 * 计算两点的中点
 * @param p1 - 第一个点
 * @param p2 - 第二个点
 * @returns 中点坐标
 */
export function mid(p1: number[], p2: number[]): number[] {
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

/**
 * 计算三个点形成的夹角（弧度制）
 * @param p1 - 第一个点
 * @param p2 - 中心点（角的顶点）
 * @param p3 - 第三个点
 * @returns 夹角（0 到 2π）
 */
export function getAngleOfThreePoints(p1: number[], p2: number[], p3: number[]): number {
  const angle1 = Math.atan2(p1[1] - p2[1], p1[0] - p2[0]);
  const angle2 = Math.atan2(p3[1] - p2[1], p3[0] - p2[0]);
  let angle = angle2 - angle1;
  if (angle < 0) {
    angle += Math.PI * 2;
  }
  return angle;
}

/**
 * 从两个点和角度、距离计算第三个点的位置
 * @param startPnt - 起始参考点
 * @param basePnt - 基准点（计算方向的基点）
 * @param angle - 相对于basePnt→startPnt方向的旋转角度（弧度）
 * @param distance - 从basePnt到目标点的距离
 * @param clockwise - true为顺时针旋转，false为逆时针旋转
 * @returns 计算得到的第三个点坐标
 */
export function getThirdPoint(
  startPnt: number[],
  basePnt: number[],
  angle: number,
  distance: number,
  clockwise: boolean,
): number[] {
  // 计算basePnt到startPnt的基准角度
  const azimuth = Math.atan2(startPnt[1] - basePnt[1], startPnt[0] - basePnt[0]);

  // 根据顺时针或逆时针调整角度
  const targetAngle = clockwise ? azimuth + angle : azimuth - angle;

  // 计算目标点坐标
  const x = basePnt[0] + distance * Math.cos(targetAngle);
  const y = basePnt[1] + distance * Math.sin(targetAngle);

  return [x, y];
}
