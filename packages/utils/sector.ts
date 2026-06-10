import Polygon from 'ol/geom/Polygon';

const SEGMENTS = 64;

/**
 * 根据三个控制点生成扇形 Polygon 坐标。
 *
 * 控制点定义：
 *  - controlPoints[0]: 圆心
 *  - controlPoints[1]: 半径端点（决定半径大小和起始角度）
 *  - controlPoints[2]: 角度端点（与圆心连线确定终止角度，半径不变）
 *
 * @returns Polygon 坐标格式 number[][][]（单环）
 */
export function buildSector(controlPoints: number[][]): number[][][] {
  if (controlPoints.length < 3) return [[]];

  const [center, radiusPoint, anglePoint] = controlPoints;
  const radius = Math.sqrt(
    (radiusPoint[0] - center[0]) ** 2 + (radiusPoint[1] - center[1]) ** 2,
  );

  if (radius === 0) return [[[...center], [...center], [...center]]];

  const startAngle = Math.atan2(radiusPoint[1] - center[1], radiusPoint[0] - center[0]);
  const endAngle = Math.atan2(anglePoint[1] - center[1], anglePoint[0] - center[0]);

  let sweep = endAngle - startAngle;
  if (sweep <= 0) sweep += Math.PI * 2;

  const ring: number[][] = [[...center]];
  for (let i = 0; i <= SEGMENTS; i++) {
    const angle = startAngle + (sweep * i) / SEGMENTS;
    ring.push([center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)]);
  }
  ring.push([...center]);

  return [ring];
}

/**
 * 从扇形 Polygon 反推三个控制点 [center, radiusPoint, anglePoint]。
 */
export function getSectorControlPoints(polygon: Polygon): number[][] {
  const ring = polygon.getCoordinates()[0];
  if (!ring || ring.length < 4) return [];

  const center = ring[0];
  const radiusPoint = ring[1];
  const anglePoint = ring[ring.length - 2];

  return [center, radiusPoint, anglePoint];
}

/**
 * OL Draw 交互的 geometryFunction，用于实时预览扇形。
 *
 * Draw 交互以 Circle 模式启动（type: 'Circle'），
 * coordinates 在绘制过程中为 [center, currentPointer]，
 * 但扇形需要三个点，因此：
 *  - 第一次点击确定圆心
 *  - 第二次点击确定半径端点（此时生成预览弧线）
 *  - 移动鼠标确定角度端点
 *
 * 这里使用 LineString 模式（maxPoints: 3）来获取三个坐标。
 */
export function createSectorGeometryFunction() {
  return (coordinates: number[][], geometry?: Polygon): Polygon => {
    const geom = geometry || new Polygon([]);
    if (coordinates.length < 2) return geom;

    if (coordinates.length === 2) {
      const [center, radiusPoint] = coordinates;
      geom.setCoordinates(buildSector([center, radiusPoint, radiusPoint]));
    } else {
      geom.setCoordinates(buildSector(coordinates.slice(0, 3)));
    }
    return geom;
  };
}
