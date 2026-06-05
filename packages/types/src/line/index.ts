export type Coordinate = [number, number];

export interface LineStyle {
  color: string;
  width: number;
  dashPattern?: number[];
}

export interface LineConfig extends LineStyle {
  id?: string;
  name?: string;
  visible?: boolean;
  selectable?: boolean;
}

export interface InteractionState {
  active: boolean;
  selected: boolean;
  editing: boolean;
}

export interface Line {
  id: string;
  type: string;
  coordinates: Coordinate[];
  config: LineConfig;
  state: InteractionState;
}
