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
function getAzimuth(startPoint: number[], endPoint: number[]): number {
  const length = dist(startPoint, endPoint);
  if (length < 1e-10) return 0;

  const angle = Math.asin(Math.abs(endPoint[1] - startPoint[1]) / length);
  if (endPoint[1] >= startPoint[1] && endPoint[0] >= startPoint[0]) {
    return angle + Math.PI;
  }
  if (endPoint[1] >= startPoint[1] && endPoint[0] < startPoint[0]) {
    return Math.PI * 2 - angle;
  }
  if (endPoint[1] < startPoint[1] && endPoint[0] < startPoint[0]) {
    return angle;
  }
  return Math.PI - angle;
}

export function getAngleOfThreePoints(p1: number[], p2: number[], p3: number[]): number {
  const angle = getAzimuth(p2, p1) - getAzimuth(p2, p3);
  return angle < 0 ? angle + Math.PI * 2 : angle;
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
  const azimuth = getAzimuth(startPnt, basePnt);
  const alpha = clockwise ? azimuth + angle : azimuth - angle;
  const dx = distance * Math.cos(alpha);
  const dy = distance * Math.sin(alpha);
  return [basePnt[0] + dx, basePnt[1] + dy];
}

/**
 * 判断三点是否按顺时针方向排列。
 */
export function isClockWise(p1: number[], p2: number[], p3: number[]): boolean {
  return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

/**
 * 计算折线控制点的总长度。
 */
export function wholeDistance(points: number[][]): number {
  return points.reduce((total, point, index) => {
    if (index === points.length - 1) return total;
    return total + dist(point, points[index + 1]);
  }, 0);
}

/**
 * 获取标绘算法使用的基础长度。
 */
export function getBaseLength(points: number[][]): number {
  return wholeDistance(points) ** 0.99;
}

function getFactorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function getBinomialFactor(n: number, index: number): number {
  return getFactorial(n) / (getFactorial(index) * getFactorial(n - index));
}

/**
 * 根据控制点生成贝塞尔曲线采样点。
 */
export function getBezierPoints(points: number[][]): number[][] {
  if (points.length <= 2) return points;

  const bezierPoints: number[][] = [];
  const n = points.length - 1;
  for (let t = 0; t <= 1; t += 0.01) {
    let x = 0;
    let y = 0;
    for (let index = 0; index <= n; index++) {
      const factor = getBinomialFactor(n, index);
      const a = t ** index;
      const b = (1 - t) ** (n - index);
      x += factor * a * b * points[index][0];
      y += factor * a * b * points[index][1];
    }
    bezierPoints.push([x, y]);
  }
  bezierPoints.push(points[n]);
  return bezierPoints;
}
