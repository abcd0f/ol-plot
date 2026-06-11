import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';

/**
 * 根据两个控制点（对角点）生成矩形 Polygon 坐标。
 *
 * @param controlPoints - [startPoint, endPoint]，矩形的两个对角顶点
 * @returns Polygon 坐标格式 number[][][]（单环）
 */
export function buildRectangle(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 2) return [[]];

  const [p1, p2] = controlPoints;
  const x1 = Math.min(p1[0], p2[0]);
  const x2 = Math.max(p1[0], p2[0]);
  const y1 = Math.min(p1[1], p2[1]);
  const y2 = Math.max(p1[1], p2[1]);

  // 处理退化矩形（面积为0的情况）
  if (x1 === x2 || y1 === y2) {
    // 返回一个最小的合法矩形
    const minSize = 1e-6;
    const rx1 = x1 === x2 ? x1 - minSize / 2 : x1;
    const rx2 = x1 === x2 ? x2 + minSize / 2 : x2;
    const ry1 = y1 === y2 ? y1 - minSize / 2 : y1;
    const ry2 = y1 === y2 ? y2 + minSize / 2 : y2;

    return [
      [
        [rx1, ry1],
        [rx1, ry2],
        [rx2, ry2],
        [rx2, ry1],
        [rx1, ry1],
      ],
    ];
  }

  // 标准矩形：左下、左上、右上、右下、闭合
  const ring: number[][] = [
    [x1, y1], // 左下
    [x1, y2], // 左上
    [x2, y2], // 右上
    [x2, y1], // 右下
    [x1, y1], // 闭合
  ];

  return [ring];
}

/**
 * 从矩形 Polygon 反推两个控制点（对角点）。
 *
 * @param polygon - 矩形 Polygon
 * @returns 控制点数组 [startPoint, endPoint]
 */
export function getRectangleControlPoints(polygon: Polygon): number[][] {
  const ring = polygon.getCoordinates()[0];
  if (!ring || ring.length < 5) return [];

  // 取第一个点（左下）和第三个点（右上）作为对角控制点
  // 注意：buildRectangle 生成的顺序是 [左下, 左上, 右上, 右下, 左下]
  const p1 = ring[0]; // 左下
  const p2 = ring[2]; // 右上

  return [p1, p2];
}

/**
 * 计算矩形中心点。
 *
 * @param controlPoints - 控制点数组 [startPoint, endPoint]
 * @returns 中心点坐标
 */
export function getRectangleCenter(controlPoints: number[][]): Coordinate {
  const [p1, p2] = controlPoints;
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

/**
 * 计算矩形宽度。
 *
 * @param controlPoints - 控制点数组 [startPoint, endPoint]
 * @returns 宽度
 */
export function getRectangleWidth(controlPoints: number[][]): number {
  const [p1, p2] = controlPoints;
  return Math.abs(p2[0] - p1[0]);
}

/**
 * 计算矩形高度。
 *
 * @param controlPoints - 控制点数组 [startPoint, endPoint]
 * @returns 高度
 */
export function getRectangleHeight(controlPoints: number[][]): number {
  const [p1, p2] = controlPoints;
  return Math.abs(p2[1] - p1[1]);
}

/**
 * OL Draw 交互的 geometryFunction，用于实时预览矩形。
 */
export function createRectangleGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;
    geom.setCoordinates(buildRectangle(coordinates));
    return geom;
  };
}
