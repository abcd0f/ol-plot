export class PlotAnimator {
  private frame: number | null = null;
  private lastFrameTime = 0;

  /** 启动帧动画。 */
  start(shouldContinue: () => boolean, onFrame: (delta: number, time: number) => void): void {
    if (this.frame !== null) return;
    const tick = (time: number) => {
      if (!shouldContinue()) {
        this.stop();
        return;
      }
      const delta = this.lastFrameTime === 0 ? 0 : Math.min(time - this.lastFrameTime, 100);
      this.lastFrameTime = time;
      onFrame(delta, time);
      this.frame = requestAnimationFrame(tick);
    };
    this.lastFrameTime = 0;
    this.frame = requestAnimationFrame(tick);
  }

  /** 停止帧动画。 */
  stop(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastFrameTime = 0;
  }
}
