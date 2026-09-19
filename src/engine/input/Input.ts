import { Vector2 } from '@/engine/math/Vector2'

export type ShortcutModifiers = Partial<
  Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
>

/** Keyboard state indexed by physical KeyboardEvent.code values. */
export class Input {
  private readonly held = new Set<string>()
  private readonly pressed = new Set<string>()
  private readonly released = new Set<string>()
  private readonly shortcuts = new Map<string, { code: string; modifiers: ShortcutModifiers }>()
  private readonly pressedShortcuts = new Set<string>()
  private listening = false
  pointer: Vector2 | null = null
  readonly clicks: Vector2[] = []

  constructor(private readonly canvas?: HTMLCanvasElement) {}

  private pointerPosition(event: MouseEvent): Vector2 | null {
    if (!this.canvas) {
      return null
    }
    const bounds = this.canvas.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null
    }
    const width = Number.parseFloat(this.canvas.style.width)
    const height = (width * bounds.height) / bounds.width
    return new Vector2(
      ((event.clientX - bounds.left) * width) / bounds.width,
      ((event.clientY - bounds.top) * height) / bounds.height
    )
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.pointer = this.pointerPosition(event)
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    this.onMouseMove(event)
    if (event.button === 0 && this.pointer) {
      this.clicks.push(this.pointer.clone())
    }
  }

  start(): void {
    if (this.listening) {
      return
    }

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.reset)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.canvas?.addEventListener('mousemove', this.onMouseMove)
    this.canvas?.addEventListener('mousedown', this.onMouseDown)
    this.listening = true
  }

  stop(): void {
    if (this.listening) {
      window.removeEventListener('keydown', this.onKeyDown)
      window.removeEventListener('keyup', this.onKeyUp)
      window.removeEventListener('blur', this.reset)
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
      this.canvas?.removeEventListener('mousemove', this.onMouseMove)
      this.canvas?.removeEventListener('mousedown', this.onMouseDown)
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

  /** Capture a shortcut and suppress its browser default while Input is listening. */
  bindShortcut(action: string, code: string, modifiers: ShortcutModifiers = {}): void {
    this.shortcuts.set(action, { code, modifiers: { ...modifiers } })
  }

  wasShortcutPressed(action: string): boolean {
    return this.pressedShortcuts.has(action)
  }

  /** Clear frame transitions after update and rendering, preserving held keys. */
  endFrame(): void {
    this.clicks.length = 0
    this.pressed.clear()
    this.released.clear()
    this.pressedShortcuts.clear()
  }

  private readonly reset = (): void => {
    this.pointer = null
    this.held.clear()
    this.endFrame()
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.reset()
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    for (const [action, shortcut] of this.shortcuts) {
      const matches = (['metaKey', 'ctrlKey', 'altKey', 'shiftKey'] as const).every(
        (modifier) => Boolean(event[modifier]) === Boolean(shortcut.modifiers[modifier])
      )
      if (event.code === shortcut.code && matches) {
        event.preventDefault()
        // macOS may omit keyup for a key released while Command is held.
        if (!event.repeat) {
          this.pressedShortcuts.add(action)
        }
      }
    }
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
