/** Frame timing based on requestAnimationFrame timestamps in milliseconds. */
export class Time {
  private previousTimestamp: number | null = null
  private delta = 0
  private framesPerSecond = 0

  /** Simulation step in seconds, limited to 0.1 seconds. */
  get deltaTime(): number {
    return this.delta
  }

  /** Instantaneous FPS from the unclamped frame interval, or zero without an interval. */
  get fps(): number {
    return this.framesPerSecond
  }

  update(timestamp: number): void {
    if (this.previousTimestamp === null) {
      this.previousTimestamp = timestamp
      return
    }

    const interval = Math.max(0, (timestamp - this.previousTimestamp) / 1000)
    this.previousTimestamp = timestamp
    this.delta = Math.min(interval, 0.1)
    this.framesPerSecond = interval > 0 ? 1 / interval : 0
  }

  /** Discard inactive time; the next update establishes a new reference. */
  reset(): void {
    this.previousTimestamp = null
    this.delta = 0
    this.framesPerSecond = 0
  }
}
