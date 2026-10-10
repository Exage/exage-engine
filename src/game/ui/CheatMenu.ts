import type { Input, Renderer } from '@/engine'
import type { Player } from '@/game/entities/Player'

const options = [
  { key: 'invulnerable', label: 'Invulnerability' },
  { key: 'hiddenFromEnemies', label: 'Invisible to enemies' },
] as const

/** Development-only modal controls drawn in screen coordinates. */
export class CheatMenu {
  private open = false
  private selected = 0
  private pointerX: number | undefined
  private pointerY: number | undefined

  constructor(
    private readonly input: Input,
    private readonly player: Player
  ) {
    input.bindShortcut('toggleCheats', 'KeyX', { metaKey: true })
  }

  private layout(width: number, height: number) {
    const panelWidth = Math.min(440, width - 24)
    return { x: (width - panelWidth) / 2, y: Math.max(12, (height - 284) / 2), width: panelWidth }
  }

  /** Consume the entire frame, including the closing frame, while handling the modal. */
  update(width: number, height: number): boolean {
    const wasOpen = this.open
    if (this.input.wasShortcutPressed('toggleCheats')) {
      this.open = !this.open
      this.pointerX = this.input.pointer?.x
      this.pointerY = this.input.pointer?.y
      return true
    }
    if (!wasOpen) {
      return false
    }
    if (this.input.wasPressed('Escape')) {
      this.open = false
      return true
    }

    const { x, y, width: panelWidth } = this.layout(width, height)
    const rowAt = (px: number, py: number): number => {
      if (px < x + 16 || px >= x + panelWidth - 16) {
        return -1
      }
      for (let index = 0; index < options.length; index++) {
        const top = y + 76 + index * 56
        if (py >= top && py < top + 48) {
          return index
        }
      }
      return -1
    }
    const pointer = this.input.pointer
    if (pointer && (pointer.x !== this.pointerX || pointer.y !== this.pointerY)) {
      const hovered = rowAt(pointer.x, pointer.y)
      if (hovered >= 0) {
        this.selected = hovered
      }
    }
    this.pointerX = pointer?.x
    this.pointerY = pointer?.y
    if (this.input.wasPressed('ArrowUp')) {
      this.selected = (this.selected + options.length - 1) % options.length
    }
    if (this.input.wasPressed('ArrowDown')) {
      this.selected = (this.selected + 1) % options.length
    }
    if (this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
      this.toggleSelected()
    }
    for (const click of this.input.clicks) {
      const row = rowAt(click.x, click.y)
      if (row >= 0) {
        this.selected = row
        this.toggleSelected()
      } else if (
        click.x >= x + panelWidth - 52 &&
        click.x < x + panelWidth - 12 &&
        click.y >= y + 12 &&
        click.y < y + 52
      ) {
        this.open = false
        break
      }
    }
    return true
  }

  private toggleSelected(): void {
    const { key } = options[this.selected]!
    this.player[key] = !this.player[key]
  }

  render(renderer: Renderer, width: number, height: number): void {
    if (!this.open) {
      return
    }
    const { x, y, width: panelWidth } = this.layout(width, height)
    renderer.drawRect(0, 0, width, height, 'rgba(0, 0, 0, 0.65)')
    renderer.drawRect(x, y, panelWidth, 284, '#101b2b')
    renderer.drawText('DEV / CHEATS', x + 20, y + 18, { fontSize: 20, color: '#66ccff' })
    renderer.drawText('Game paused', x + 20, y + 46, { fontSize: 13, color: '#9aaec4' })
    renderer.drawText('[X]', x + panelWidth - 20, y + 20, { align: 'right' })
    for (const [index, option] of options.entries()) {
      const top = y + 76 + index * 56
      const enabled = this.player[option.key]
      renderer.drawRect(
        x + 16,
        top,
        panelWidth - 32,
        48,
        index === this.selected ? '#294867' : '#192a3e'
      )
      renderer.drawText(option.label, x + 28, top + 16, { fontSize: 15 })
      renderer.drawText(enabled ? 'ON' : 'OFF', x + panelWidth - 28, top + 16, {
        fontSize: 15,
        align: 'right',
        color: enabled ? '#86efac' : '#9aaec4',
      })
    }
    renderer.drawText('Up/Down: select   Enter/Space: toggle', x + 20, y + 204, { fontSize: 12 })
    renderer.drawText('Click a row to toggle', x + 20, y + 228, { fontSize: 12 })
    renderer.drawText('Esc / Cmd+X: close', x + 20, y + 252, { fontSize: 12, color: '#9aaec4' })
  }
}
