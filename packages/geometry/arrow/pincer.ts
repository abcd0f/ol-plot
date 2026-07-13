import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';
import { dist, mid, getAngleOfThreePoints, getThirdPoint, createDegeneratePolygon } from '../../utils';

/** 箭头头部高度系数 */
const HEAD_HEIGHT_FACTOR = 0.25;

/** 箭头头部宽度系数 */
const HEAD_WIDTH_FACTOR = 0.3;

/** 箭颈高度系数 */
const NECK_HEIGHT_FACTOR = 0.85;

/** 箭颈宽度系数 */
const NECK_WIDTH_FACTOR = 0.15;

/** 半圆周率 */
const HALF_PI = Math.PI / 2;

/**
 * 计算点相对于底边中垂线的对称点(左右镜像)
 * 确保两个箭头在底边的同一侧
 * @param linePnt1 - 底边起点
 * @param linePnt2 - 底边终点
 * @param point - 要镜像的点
 * @returns 对称点坐标
 */
function getSymmetricPoint(linePnt1: number[], linePnt2: number[], point: number[]): number[] {
  // 底边方向向量
  const dx = linePnt2[0] - linePnt1[0];
  const dy = linePnt2[1] - linePnt1[1];
  const len = Math.sqrt(dx * dx + dy * dy);

  // 归一化底边方向
  const nx = dx / len;
  const ny = dy / len;

  // 垂直方向(逆时针旋转90度)
  const px = -ny;
  const py = nx;

  // 底边中点
  const midX = (linePnt1[0] + linePnt2[0]) / 2;
  const midY = (linePnt1[1] + linePnt2[1]) / 2;

  // 从中点到目标点的向量
  const vx = point[0] - midX;
  const vy = point[1] - midY;

  // 分解为平行分量和垂直分量
  const parallelComp = vx * nx + vy * ny; // 沿底边方向(左右)
  const perpComp = vx * px + vy * py; // 垂直底边方向(上下)

  // 左右镜像: 平行分量取反,垂直分量保持
  const mirrorX = midX - parallelComp * nx + perpComp * px;
  const mirrorY = midY - parallelComp * ny + perpComp * py;

  return [mirrorX, mirrorY];
}

/**
 * 计算点集合的总距离
 */
function wholeDistance(points: number[][]): number {
  let distance = 0;
  if (points && Array.isArray(points) && points.length > 0) {
    points.forEach((item, index) => {
      if (index < points.length - 1) {
        distance += dist(item, points[index + 1]);
      }
    });
  }
  return distance;
}

/**
 * 获取基础长度
 */
function getBaseLength(points: number[][]): number {
  return wholeDistance(points) ** 0.99;
}

/**
 * 计算箭头头部的5个关键点
 * @param points - 控制点数组
 * @returns [颈部左点, 头部左点, 箭头尖端, 头部右点, 颈部右点]
 */
function getArrowHeadPoints(points: number[][]): number[][] {
  const len = getBaseLength(points);
  const headHeight = len * HEAD_HEIGHT_FACTOR;
  const headPnt = points[points.length - 1];
  const headWidth = headHeight * HEAD_WIDTH_FACTOR;
  const neckWidth = headHeight * NECK_WIDTH_FACTOR;
  const neckHeight = headHeight * NECK_HEIGHT_FACTOR;

  const headEndPnt = getThirdPoint(points[points.length - 2], headPnt, 0, headHeight, true);
  const neckEndPnt = getThirdPoint(points[points.length - 2], headPnt, 0, neckHeight, true);

  const headLeft = getThirdPoint(headPnt, headEndPnt, HALF_PI, headWidth, false);
  const headRight = getThirdPoint(headPnt, headEndPnt, HALF_PI, headWidth, true);
  const neckLeft = getThirdPoint(headPnt, neckEndPnt, HALF_PI, neckWidth, false);
  const neckRight = getThirdPoint(headPnt, neckEndPnt, HALF_PI, neckWidth, true);

  return [neckLeft, headLeft, headPnt, headRight, neckRight];
}

/**
 * 计算箭头身体部分的点集
 * @param points - 控制点数组
 * @param neckLeft - 颈部左侧点
 * @param neckRight - 颈部右侧点
 * @param tailWidthFactor - 尾部宽度系数
 * @returns 身体部分的点集（左侧+右侧）
 */
function getArrowBodyPoints(
  points: number[][],
  neckLeft: number[],
  neckRight: number[],
  tailWidthFactor: number,
): number[][] {
  const allLen = wholeDistance(points);
  const len = getBaseLength(points);
  const tailWidth = len * tailWidthFactor;
  const neckWidth = dist(neckLeft, neckRight);
  const widthDif = (tailWidth - neckWidth) / 2;

  let tempLen = 0;
  const leftBodyPnts: number[][] = [];
  const rightBodyPnts: number[][] = [];

  for (let i = 1; i < points.length - 1; i++) {
    const angle = getAngleOfThreePoints(points[i - 1], points[i], points[i + 1]) / 2;
    tempLen += dist(points[i - 1], points[i]);
    const w = (tailWidth / 2 - (tempLen / allLen) * widthDif) / Math.sin(angle);
    const left = getThirdPoint(points[i - 1], points[i], Math.PI - angle, w, true);
    const right = getThirdPoint(points[i - 1], points[i], angle, w, false);
    leftBodyPnts.push(left);
    rightBodyPnts.push(right);
  }

  return leftBodyPnts.concat(rightBodyPnts);
}

/**
 * 获取立方贝塞尔曲线上的点
 */
function getCubicValue(t: number, startPnt: number[], cPnt1: number[], cPnt2: number[], endPnt: number[]): number[] {
  const clampedT = Math.max(Math.min(t, 1), 0);
  const tp = 1 - clampedT;
  const t2 = clampedT * clampedT;
  const t3 = t2 * clampedT;
  const tp2 = tp * tp;
  const tp3 = tp2 * tp;
  const x = tp3 * startPnt[0] + 3 * tp2 * clampedT * cPnt1[0] + 3 * tp * t2 * cPnt2[0] + t3 * endPnt[0];
  const y = tp3 * startPnt[1] + 3 * tp2 * clampedT * cPnt1[1] + 3 * tp * t2 * cPnt2[1] + t3 * endPnt[1];
  return [x, y];
}

/**
 * 获取贝塞尔曲线插值点集
 */
function getBezierPoints(points: number[][]): number[][] {
  if (points.length <= 2) {
    return points;
  }

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

/**
 * 计算阶乘
 */
function getFactorial(n: number): number {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 6;
  if (n === 4) return 24;
  if (n === 5) return 120;

  let result = 1;
  for (let i = 1; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * 计算二项式系数
 */
function getBinomialFactor(n: number, index: number): number {
  return getFactorial(n) / (getFactorial(index) * getFactorial(n - index));
}

/**
 * 计算单个箭头的完整点集
 * @param pnt1 - 起点1
 * @param pnt2 - 起点2
 * @param pnt3 - 箭头尖端点
 * @param clockWise - 是否顺时针
 * @returns 箭头的完整点集
 */
function getArrowPoints(pnt1: number[], pnt2: number[], pnt3: number[], clockWise: boolean): number[][] {
  const midPnt = mid(pnt1, pnt2);
  const len = dist(midPnt, pnt3);
  let midPnt1 = getThirdPoint(pnt3, midPnt, 0, len * 0.3, true);
  let midPnt2 = getThirdPoint(pnt3, midPnt, 0, len * 0.5, true);
  midPnt1 = getThirdPoint(midPnt, midPnt1, HALF_PI, len / 5, clockWise);
  midPnt2 = getThirdPoint(midPnt, midPnt2, HALF_PI, len / 4, clockWise);

  const points = [midPnt, midPnt1, midPnt2, pnt3];
  const arrowPnts = getArrowHeadPoints(points);
  const [neckLeftPoint, neckRightPoint] = [arrowPnts[0], arrowPnts[4]];

  const tailWidthFactor = dist(pnt1, pnt2) / getBaseLength(points) / 2;
  const bodyPnts = getArrowBodyPoints(points, neckLeftPoint, neckRightPoint, tailWidthFactor);

  const n = bodyPnts.length;
  let lPoints = bodyPnts.slice(0, n / 2);
  let rPoints = bodyPnts.slice(n / 2, n);

  lPoints.push(neckLeftPoint);
  rPoints.push(neckRightPoint);
  lPoints = lPoints.reverse();
  lPoints.push(pnt2);
  rPoints = rPoints.reverse();
  rPoints.push(pnt1);

  return lPoints.reverse().concat(arrowPnts, rPoints);
}

/**
 * 构建钳击箭头的 Polygon 坐标
 *
 * 钳击箭头由两个箭头组成,两个箭头从底边同侧向内收拢,形成钳击形状
 *
 * @param controlPoints - 控制点数组
 *   - 3点: [底边起点, 底边终点, 一个箭头尖端] - 自动计算对称的另一个尖端
 *   - 4点: [底边起点, 底边终点, 左箭头尖端, 右箭头尖端] - 直接使用两个尖端
 * @returns Polygon 坐标格式 number[][][]
 */
export function buildPincerArrow(controlPoints: number[][]): number[][][] {
  const count = controlPoints.length;

  if (count < 2) {
    return createDegeneratePolygon(controlPoints[0] || [0, 0]);
  }

  if (count === 2) {
    return [controlPoints];
  }

  const [pnt1, pnt2, pnt3] = [controlPoints[0], controlPoints[1], controlPoints[2]];

  // 确定左右箭头的尖端点
  let leftTip: number[];
  let rightTip: number[];

  if (count === 3) {
    // 3点模式: 根据pnt3计算对称点
    // pnt3固定为右箭头(靠近底线终点pnt2)，对称点固定为左箭头(靠近起点pnt1)
    const symmetricPnt = getSymmetricPoint(pnt1, pnt2, pnt3);
    leftTip = symmetricPnt;
    rightTip = pnt3;
  } else {
    // 4点模式: 根据投影位置判断哪个点在左侧，哪个在右侧
    const pnt4 = controlPoints[3];

    const baseVec = [pnt2[0] - pnt1[0], pnt2[1] - pnt1[1]];
    const baseLen = Math.sqrt(baseVec[0] ** 2 + baseVec[1] ** 2);
    const baseDir = [baseVec[0] / baseLen, baseVec[1] / baseLen];

    const vec3 = [pnt3[0] - pnt1[0], pnt3[1] - pnt1[1]];
    const proj3 = vec3[0] * baseDir[0] + vec3[1] * baseDir[1];

    const vec4 = [pnt4[0] - pnt1[0], pnt4[1] - pnt1[1]];
    const proj4 = vec4[0] * baseDir[0] + vec4[1] * baseDir[1];

    // 投影位置更小的是左箭头
    if (proj3 < proj4) {
      leftTip = pnt3;
      rightTip = pnt4;
    } else {
      leftTip = pnt4;
      rightTip = pnt3;
    }
  }

  // 计算底边的分割点
  const baseCenter = mid(pnt1, pnt2);
  const leftBase = mid(pnt1, baseCenter);
  const rightBase = mid(baseCenter, pnt2);

  // 生成左右两个箭头
  const leftArrowPnts = getArrowPoints(pnt1, leftBase, leftTip, false);
  const rightArrowPnts = getArrowPoints(rightBase, pnt2, rightTip, true);

  const m = leftArrowPnts.length;
  const t = (m - 5) / 2;

  const llBodyPnts = leftArrowPnts.slice(0, t);
  const lArrowPnts = leftArrowPnts.slice(t, t + 5);
  let lrBodyPnts = leftArrowPnts.slice(t + 5, m);

  let rlBodyPnts = rightArrowPnts.slice(0, t);
  const rArrowPnts = rightArrowPnts.slice(t, t + 5);
  const rrBodyPnts = rightArrowPnts.slice(t + 5, m);

  rlBodyPnts = getBezierPoints(rlBodyPnts);
  const bodyPnts = getBezierPoints(rrBodyPnts.concat(llBodyPnts.slice(1)));
  lrBodyPnts = getBezierPoints(lrBodyPnts);

  const pnts = rlBodyPnts.concat(rArrowPnts, bodyPnts, lArrowPnts, lrBodyPnts);

  return [pnts];
}

/**
 * 计算钳击箭头的中心点
 *
 * @param controlPoints - 控制点数组
 * @returns 箭头的中心坐标
 */
export function getPincerArrowCenter(controlPoints: number[][]): Coordinate {
  if (controlPoints.length < 2) {
    return controlPoints[0] || [0, 0];
  }

  // 计算所有控制点的平均位置作为中心
  let sumX = 0;
  let sumY = 0;
  for (const point of controlPoints) {
    sumX += point[0];
    sumY += point[1];
  }

  return [sumX / controlPoints.length, sumY / controlPoints.length];
}

/**
 * 从钳击箭头几何对象中提取控制点
 *
 * @param geometry - Polygon 几何对象
 * @returns 控制点数组,如果未找到则返回空数组
 */
export function getPincerArrowControlPoints(geometry: Polygon): number[][] {
  return geometry.get('_controlPoints') || [];
}

/**
 * OL Draw 交互的 geometryFunction,用于实时预览钳击箭头
 *
 * Draw 交互以 LineString 模式启动,
 * coordinates 在绘制过程中为控制点数组,
 * 本函数将控制点转换为钳击箭头 Polygon 以实现实时预览
 */
export function createPincerArrowGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;

    const controlPoints = coordinates;
    geom.setCoordinates(buildPincerArrow(controlPoints));
    geom.set('_controlPoints', controlPoints);
    return geom;
  };
}
