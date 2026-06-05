import type { Line, LineConfig, Coordinate } from '@/packages/types';
import { DEFAULT_LINE_COLOR, DEFAULT_LINE_WIDTH } from '@/packages/constants';

export function createLine(type: string, coordinates: Coordinate[], config?: Partial<LineConfig>): Line {
  const id = config?.id || `${type}-${Date.now()}`;

  return {
    id,
    type,
    coordinates,
    config: {
      color: config?.color || DEFAULT_LINE_COLOR,
      width: config?.width || DEFAULT_LINE_WIDTH,
      dashPattern: config?.dashPattern,
      id,
      name: config?.name || type,
      visible: config?.visible ?? true,
      selectable: config?.selectable ?? true,
    },
    state: {
      active: false,
      selected: false,
      editing: false,
    },
  };
}

export function updateLineConfig(line: Line, config: Partial<LineConfig>): Line {
  return {
    ...line,
    config: { ...line.config, ...config },
  };
}
