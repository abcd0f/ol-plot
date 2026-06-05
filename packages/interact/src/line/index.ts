import type { Line, InteractionState } from '@/packages/types';

export class LineInteraction {
  private line: Line;

  constructor(line: Line) {
    this.line = line;
  }

  activate(): void {
    this.line.state.active = true;
  }

  deactivate(): void {
    this.line.state.active = false;
    this.line.state.selected = false;
    this.line.state.editing = false;
  }

  select(): void {
    this.line.state.selected = true;
  }

  deselect(): void {
    this.line.state.selected = false;
  }

  startEdit(): void {
    this.line.state.editing = true;
  }

  stopEdit(): void {
    this.line.state.editing = false;
  }

  delete(): void {
    this.deactivate();
  }

  getState(): InteractionState {
    return { ...this.line.state };
  }
}
