import Polygon from 'ol/geom/Polygon';
import {
  createDegeneratePolygon,
  dist,
  getAngleOfThreePoints,
  getBaseLength,
  getBezierPoints,
  getThirdPoint,
  isClockWise,
  mid,
  wholeDistance,
} from '../../utils';

const HALF_PI = Math.PI / 2;
// 箭头头部高度相对于基准长度的比例
const HEAD_HEIGHT_FACTOR = 0.25;
// 箭头头部（翼展）宽度相对于头部高度的比例
const HEAD_WIDTH_FACTOR = 0.3;
// 箭头颈部到头部尖端的距离相对于头部高度的比例
const NECK_HEIGHT_FACTOR = 0.85;
// 箭头颈部宽度相对于头部高度的比例
const NECK_WIDTH_FACTOR = 0.15;

// 复制一个二维点，避免直接引用原数组导致的意外修改
function clonePoint(point: number[]): number[] {
  return [point[0], point[1]];
}

// 闭合多边形环：若首尾点不重合则追加首点，形成封闭 ring
function closeRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;

  return [...ring, clonePoint(first)];
}

/**
 * 获取 3 点模式下第二个箭头端点的对称点。
 */
function getTempPoint4(linePnt1: number[], linePnt2: number[], point: number[]): number[] {
  // 底边中点，作为对称计算的基准点
  const midPnt = mid(linePnt1, linePnt2);
  // 第三点到中点的距离，以及三点夹角，用于分解出正交方向的两段距离
  const len = dist(midPnt, point);
  const angle = getAngleOfThreePoints(linePnt1, midPnt, point);

  let distance1: number;
  let distance2: number;
  let midPoint: number[];

  // 根据夹角所处象限，分别沿两个正交方向推算对称点的位置
  if (angle < HALF_PI) {
    distance1 = len * Math.sin(angle);
    distance2 = len * Math.cos(angle);
    midPoint = getThirdPoint(linePnt1, midPnt, HALF_PI, distance1, false);
    return getThirdPoint(midPnt, midPoint, HALF_PI, distance2, true);
  }

  if (angle >= HALF_PI && angle < Math.PI) {
    distance1 = len * Math.sin(Math.PI - angle);
    distance2 = len * Math.cos(Math.PI - angle);
    midPoint = getThirdPoint(linePnt1, midPnt, HALF_PI, distance1, false);
    return getThirdPoint(midPnt, midPoint, HALF_PI, distance2, false);
  }

  if (angle >= Math.PI && angle < Math.PI * 1.5) {
    distance1 = len * Math.sin(angle - Math.PI);
    distance2 = len * Math.cos(angle - Math.PI);
    midPoint = getThirdPoint(linePnt1, midPnt, HALF_PI, distance1, true);
    return getThirdPoint(midPnt, midPoint, HALF_PI, distance2, true);
  }

  distance1 = len * Math.sin(Math.PI * 2 - angle);
  distance2 = len * Math.cos(Math.PI * 2 - angle);
  midPoint = getThirdPoint(linePnt1, midPnt, HALF_PI, distance1, true);
  return getThirdPoint(midPnt, midPoint, HALF_PI, distance2, false);
}

/**
 * 将双箭头控制点规范化为 [P1, P2, P3, P4, P5]。
 */
export function normalizeDoubleArrowControlPoints(controlPoints: number[][]): number[][] {
  if (controlPoints.length < 3) return controlPoints.map(clonePoint);

  const pnt1 = clonePoint(controlPoints[0]);
  const pnt2 = clonePoint(controlPoints[1]);
  const pnt3 = clonePoint(controlPoints[2]);
  const tempPoint4 = controlPoints[3] ? clonePoint(controlPoints[3]) : getTempPoint4(pnt1, pnt2, pnt3);
  const connPoint = controlPoints[4] ? clonePoint(controlPoints[4]) : mid(pnt1, pnt2);

  return [pnt1, pnt2, pnt3, tempPoint4, connPoint];
}

// 计算单个箭头头部的 5 个特征点：左颈、左翼、尖端、右翼、右颈
function getArrowHeadPoints(points: number[][]): number[][] {
  const len = getBaseLength(points);
  // 依据基准长度按比例推导头部各尺寸
  const headHeight = len * HEAD_HEIGHT_FACTOR;
  const headPnt = points[points.length - 1];
  const headWidth = headHeight * HEAD_WIDTH_FACTOR;
  const neckWidth = headHeight * NECK_WIDTH_FACTOR;
  const neckHeight = headHeight * NECK_HEIGHT_FACTOR;
  // 沿箭头轴线向内退让，分别得到头部底边与颈部底边的中点
  const headEndPnt = getThirdPoint(points[points.length - 2], headPnt, 0, headHeight, true);
  const neckEndPnt = getThirdPoint(points[points.length - 2], headPnt, 0, neckHeight, true);
  // 以两条底边中点为基准，向两侧正交偏移得到翼展点和颈部点
  const headLeft = getThirdPoint(headPnt, headEndPnt, HALF_PI, headWidth, false);
  const headRight = getThirdPoint(headPnt, headEndPnt, HALF_PI, headWidth, true);
  const neckLeft = getThirdPoint(headPnt, neckEndPnt, HALF_PI, neckWidth, false);
  const neckRight = getThirdPoint(headPnt, neckEndPnt, HALF_PI, neckWidth, true);

  return [neckLeft, headLeft, headPnt, headRight, neckRight];
}

// 计算箭身左右两侧的轮廓点：箭身宽度从尾部（tailWidth）线性收窄到颈部（neckWidth）
function getArrowBodyPoints(
  points: number[][],
  neckLeft: number[],
  neckRight: number[],
  tailWidthFactor: number,
): number[][] {
  // 折线总长度与基准长度，前者用于计算宽度沿路径的线性插值
  const allLen = wholeDistance(points);
  const len = getBaseLength(points);
  const tailWidth = len * tailWidthFactor;
  const neckWidth = dist(neckLeft, neckRight);
  // 尾部与颈部半宽之差，用于沿路径插值收窄
  const widthDif = (tailWidth - neckWidth) / 2;
  let tempLen = 0;
  const leftBodyPnts: number[][] = [];
  const rightBodyPnts: number[][] = [];

  // 遍历折线中间的每个拐点，在其角平分线方向上向两侧偏移出轮廓点
  for (let i = 1; i < points.length - 1; i++) {
    const angle = getAngleOfThreePoints(points[i - 1], points[i], points[i + 1]) / 2;
    tempLen += dist(points[i - 1], points[i]);
    const sin = Math.sin(angle);
    // 角度接近 0/π 或路径退化时无法计算偏移，跳过
    if (Math.abs(sin) < 1e-10 || allLen < 1e-10) continue;

    // 当前拐点处的偏移量：半宽按路径进度线性收窄，再除以 sin 补偿拐角处的斜切
    const w = (tailWidth / 2 - (tempLen / allLen) * widthDif) / sin;
    const left = getThirdPoint(points[i - 1], points[i], Math.PI - angle, w, true);
    const right = getThirdPoint(points[i - 1], points[i], angle, w, false);
    leftBodyPnts.push(left);
    rightBodyPnts.push(right);
  }

  return leftBodyPnts.concat(rightBodyPnts);
}

// 由底边两端点 pnt1/pnt2 与尖端方向点 pnt3 构造单个完整箭头（箭身 + 箭头）的有序轮廓点
function getArrowPoints(pnt1: number[], pnt2: number[], pnt3: number[], clockWise: boolean): number[][] {
  const midPnt = mid(pnt1, pnt2);
  const len = dist(midPnt, pnt3);
  // 沿中点到尖端方向取两个途经点，并向侧向弯曲，使箭身形成弧线而非直线
  let midPnt1 = getThirdPoint(pnt3, midPnt, 0, len * 0.3, true);
  let midPnt2 = getThirdPoint(pnt3, midPnt, 0, len * 0.5, true);
  midPnt1 = getThirdPoint(midPnt, midPnt1, HALF_PI, len / 5, clockWise);
  midPnt2 = getThirdPoint(midPnt, midPnt2, HALF_PI, len / 4, clockWise);

  // 以中点、两个弯曲途经点、尖端组成箭身骨架折线
  const points = [midPnt, midPnt1, midPnt2, pnt3];
  const arrowPnts = getArrowHeadPoints(points);
  const [neckLeftPoint, neckRightPoint] = [arrowPnts[0], arrowPnts[4]];
  const baseLength = getBaseLength(points);
  // 尾部宽度系数由底边长度相对基准长度决定
  const tailWidthFactor = baseLength < 1e-10 ? 0 : dist(pnt1, pnt2) / baseLength / 2;
  const bodyPnts = getArrowBodyPoints(points, neckLeftPoint, neckRightPoint, tailWidthFactor);
  const n = bodyPnts.length;
  // 箭身轮廓点前半为左侧、后半为右侧
  let lPoints = bodyPnts.slice(0, n / 2);
  let rPoints = bodyPnts.slice(n / 2, n);

  // 左右两侧分别拼接颈部点与底边端点，并调整顺序，最终按 左侧→箭头→右侧 环绕输出
  lPoints.push(neckLeftPoint);
  rPoints.push(neckRightPoint);
  lPoints = lPoints.reverse();
  lPoints.push(pnt2);
  rPoints = rPoints.reverse();
  rPoints.push(pnt1);

  return lPoints.reverse().concat(arrowPnts, rPoints);
}

/**
 * 根据控制点生成双箭头 Polygon 坐标。
 */
export function buildDoubleArrow(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 3) {
    return createDegeneratePolygon(controlPoints[0] || [0, 0]);
  }

  const normalized = normalizeDoubleArrowControlPoints(controlPoints);
  const [pnt1, pnt2, pnt3, tempPoint4, connPoint] = normalized;

  // 关键点重合会导致无法构成有效箭头，返回退化图形
  if (dist(pnt1, pnt2) < 1e-10 || dist(connPoint, pnt3) < 1e-10 || dist(connPoint, tempPoint4) < 1e-10) {
    return createDegeneratePolygon(pnt1);
  }

  let leftArrowPnts: number[][];
  let rightArrowPnts: number[][];

  // 根据控制点的旋向选择左右两个箭头的端点组合，保证轮廓环绕方向一致
  if (isClockWise(pnt1, pnt2, pnt3)) {
    leftArrowPnts = getArrowPoints(pnt1, connPoint, tempPoint4, false);
    rightArrowPnts = getArrowPoints(connPoint, pnt2, pnt3, true);
  } else {
    leftArrowPnts = getArrowPoints(pnt2, connPoint, pnt3, false);
    rightArrowPnts = getArrowPoints(connPoint, pnt1, tempPoint4, true);
  }

  // 将每个箭头的轮廓拆分为：箭身左段(ll/rl)、箭头头部(lArrow/rArrow)、箭身右段(lr/rr)
  const m = leftArrowPnts.length;
  const t = (m - 5) / 2;
  const llBodyPnts = leftArrowPnts.slice(0, t);
  const lArrowPnts = leftArrowPnts.slice(t, t + 5);
  let lrBodyPnts = leftArrowPnts.slice(t + 5, m);
  let rlBodyPnts = rightArrowPnts.slice(0, t);
  const rArrowPnts = rightArrowPnts.slice(t, t + 5);
  const rrBodyPnts = rightArrowPnts.slice(t + 5, m);

  // 对箭身各段做贝塞尔平滑；中间段由两箭头相邻的内侧箭身拼接而成
  rlBodyPnts = getBezierPoints(rlBodyPnts);
  const bodyPnts = getBezierPoints(rrBodyPnts.concat(llBodyPnts.slice(1)));
  lrBodyPnts = getBezierPoints(lrBodyPnts);

  // 按环绕顺序拼接所有段并闭合，得到最终的双箭头多边形外环
  return [closeRing(rlBodyPnts.concat(rArrowPnts, bodyPnts, lArrowPnts, lrBodyPnts))];
}

/**
 * OL Draw 交互的 geometryFunction，用于实时预览双箭头。
 */
export function createDoubleArrowGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) {
      // 少于 2 点时返回退化的点，避免 Draw 报错
      geom.setCoordinates([[[...coordinates[0]], [...coordinates[0]], [...coordinates[0]]]]);
      return geom;
    }

    if (coordinates.length === 2) {
      // 2 点时显示直线预览
      geom.setCoordinates([[[...coordinates[0]], [...coordinates[1]], [...coordinates[0]]]]);
      return geom;
    }

    const controlPoints = normalizeDoubleArrowControlPoints(coordinates.slice(0, 5));
    geom.setCoordinates(buildDoubleArrow(controlPoints));
    geom.set('_controlPoints', controlPoints);

    return geom;
  };
}
