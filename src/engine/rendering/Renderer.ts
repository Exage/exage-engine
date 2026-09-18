export interface TextOptions {
  color?: string
  /** Font size in logical pixels. */
  fontSize?: number
  fontFamily?: string
}

export class Renderer {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D

  constructor(
    canvas: HTMLCanvasElement,
    readonly width: number,
    readonly height: number
  ) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError('Renderer dimensions must be positive integers')
    }

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D rendering is not supported')
    }

    this.canvas = canvas
    this.context = context
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = 'auto'
    this.canvas.style.aspectRatio = `${width} / ${height}`
    this.canvas.style.setProperty('--canvas-aspect-ratio', `${width} / ${height}`)
    this.updateResolution()
  }

  /** Begin a frame, refreshing display density before clearing the logical viewport. */
  clear(): void {
    this.updateResolution()
    this.context.clearRect(0, 0, this.width, this.height)
  }

  /** Draw a filled rectangle in logical pixels, with its origin at the top left. */
  drawRect(x: number, y: number, width: number, height: number, color = '#ffffff'): void {
    this.context.fillStyle = color
    this.context.fillRect(x, y, width, height)
  }

  /** Draw text in logical pixels, anchored at the top left. */
  drawText(text: string, x: number, y: number, options: TextOptions = {}): void {
    const { color = '#ffffff', fontSize = 16, fontFamily = 'monospace' } = options
    this.context.fillStyle = color
    this.context.font = `${fontSize}px ${fontFamily}`
    this.context.textAlign = 'left'
    this.context.textBaseline = 'top'
    this.context.fillText(text, x, y)
  }

  private updateResolution(): void {
    const ratio = window.devicePixelRatio
    const pixelRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1
    const bufferWidth = Math.max(1, Math.round(this.width * pixelRatio))
    const bufferHeight = Math.max(1, Math.round(this.height * pixelRatio))

    if (this.canvas.width !== bufferWidth || this.canvas.height !== bufferHeight) {
      this.canvas.width = bufferWidth
      this.canvas.height = bufferHeight
    }

    // Use actual buffer dimensions so fractional density rounding preserves the viewport.
    this.context.setTransform(bufferWidth / this.width, 0, 0, bufferHeight / this.height, 0, 0)
  }
}
