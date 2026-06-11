import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import GeometryCollection from 'ol/geom/GeometryCollection';
import { dist, computeDirectionAndNormal, createDegeneratePolygon } from '../../utils';

/** 箭头头部长度占箭头总长度的比例 */
const HEAD_LENGTH_FACTOR = 0.12;

/** 箭头头部宽度（半边）占箭头总长度的比例 */
const HEAD_WIDTH_FACTOR = 0.06;

/** 箭翼展开程度 */
const WING_SCALE = 0.9;

/** 箭翼向后收缩比例 */
const HEAD_BACK_FACTOR = 0.04;

/**
 * 根据两个控制点生成 LineArrow 的子几何数组。
 *
 * 返回：
 *  - LineString: 箭身（箭尾 -> 箭头底边中心）
 *  - Polygon: 实心箭头头部
 *
 * @param controlPoints [P0, P1]
 */
export function buildLineArrowGeometries(controlPoints: number[][]): [LineString, Polygon] {
  const [p0, p1] = controlPoints;

  const length = dist(p0, p1);

  if (length < 1e-10) {
    const lineString = new LineString([p0.slice(), p1.slice()]);
    const degenerate = createDegeneratePolygon(p0);

    return [lineString, new Polygon(degenerate)];
  }

  const { dx, dy, nx, ny } = computeDirectionAndNormal(p0, p1, length);

  const headLength = length * HEAD_LENGTH_FACTOR;
  const headWidth = length * HEAD_WIDTH_FACTOR;

  /**
   * 箭头尖端
   */
  const tip: number[] = [p1[0], p1[1]];

  /**
   * 箭头底边中心
   */
  const baseCenter: number[] = [p1[0] - dx * headLength, p1[1] - dy * headLength];

  const wingBack = length * HEAD_BACK_FACTOR;

  /**
   * 箭头底边左右点
   */
  const headLeft: number[] = [
    baseCenter[0] + nx * headWidth * WING_SCALE - dx * wingBack,
    baseCenter[1] + ny * headWidth * WING_SCALE - dy * wingBack,
  ];
  const headRight: number[] = [
    baseCenter[0] - nx * headWidth * WING_SCALE - dx * wingBack,
    baseCenter[1] - ny * headWidth * WING_SCALE - dy * wingBack,
  ];
  /**
   * 箭身终点 = 箭头底边中心
   */
  const lineString = new LineString([p0.slice(), baseCenter]);

  /**
   * 实心箭头
   */
  const arrowHead = new Polygon([[headLeft, tip, headRight, baseCenter, headLeft]]);

  return [lineString, arrowHead];
}

/**
 * Draw geometryFunction
 */
export function createLineArrowGeometryFunction() {
  return (coordinates: number[][], geometry?: GeometryCollection): GeometryCollection => {
    const geom = geometry || new GeometryCollection([]);

    if (coordinates.length < 2) {
      return geom;
    }

    const controlPoints = coordinates.slice(0, 2);

    const [lineString, arrowHead] = buildLineArrowGeometries(controlPoints);

    geom.setGeometries([lineString, arrowHead]);

    geom.set('_controlPoints', controlPoints);

    return geom;
  };
}
