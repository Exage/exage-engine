/** Keyboard state indexed by physical KeyboardEvent.code values. */
export class Input {
  private readonly held = new Set<string>()
  private readonly pressed = new Set<string>()
  private readonly released = new Set<string>()
  private listening = false

  start(): void {
    if (this.listening) {
      return
    }

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.reset)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.listening = true
  }

  stop(): void {
    if (this.listening) {
      window.removeEventListener('keydown', this.onKeyDown)
      window.removeEventListener('keyup', this.onKeyUp)
      window.removeEventListener('blur', this.reset)
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
      this.listening = false
    }

    this.reset()
  }

  isDown(code: string): boolean {
    return this.held.has(code)
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code)
  }

  wasReleased(code: string): boolean {
    return this.released.has(code)
  }

  /** Clear frame transitions after update and rendering, preserving held keys. */
  endFrame(): void {
    this.pressed.clear()
    this.released.clear()
  }

  private readonly reset = (): void => {
    this.held.clear()
    this.endFrame()
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.reset()
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || this.held.has(event.code)) {
      return
    }

    this.held.add(event.code)
    this.pressed.add(event.code)
  }

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.held.delete(event.code)) {
      this.released.add(event.code)
    }
  }
}
