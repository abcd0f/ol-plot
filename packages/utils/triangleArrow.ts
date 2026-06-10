import Polygon from 'ol/geom/Polygon';

/**
 * 根据三个控制点生成三角箭头 Polygon 坐标。
 *
 * 控制点定义：
 *  - controlPoints[0]: 第一个顶点
 *  - controlPoints[1]: 第二个顶点
 *  - controlPoints[2]: 第三个顶点
 *
 * @returns Polygon 坐标格式 number[][][]（单环，含闭合点）
 */
export function buildTriangleArrow(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 3) return [[]];

  const [p0, p1, p2] = controlPoints;

  return [[
    [...p0],
    [...p1],
    [...p2],
    [...p0],
  ]];
}

/**
 * 从三角箭头 Polygon 反推三个控制点。
 */
export function getTriangleArrowControlPoints(polygon: Polygon): number[][] {
  const ring = polygon.getCoordinates()[0];
  if (!ring || ring.length < 4) return [];

  return [ring[0], ring[1], ring[2]];
}

/**
 * OL Draw 交互的 geometryFunction，用于实时预览三角箭头。
 *
 * 使用 LineString 模式（maxPoints: 3）获取三个坐标：
 *  - 第一次点击确定第一个顶点
 *  - 第二次点击确定第二个顶点（此时根据两点生成预览三角形）
 *  - 第三次点击确定第三个顶点，绘制完成
 */
export function createTriangleArrowGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);

    if (coordinates.length < 2) return geom;

    if (coordinates.length === 2) {
      const [p0, p1] = coordinates;
      // 预览三角形：取 p0→p1 中点向垂直方向偏移，形成三角形预览
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      // 垂直偏移量取线段长度的一半，方向为左旋垂直方向
      const offset = len / 2;
      const p2 = len > 0
        ? [mx - (dy / len) * offset, my + (dx / len) * offset]
        : [mx, my + offset];
      geom.setCoordinates(buildTriangleArrow([p0, p1, p2]));
    } else {
      geom.setCoordinates(buildTriangleArrow(coordinates.slice(0, 3)));
    }

    return geom;
  };
}