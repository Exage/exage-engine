import type { Camera2D } from '@/engine/rendering/Camera2D'

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
    private viewportWidth: number,
    private viewportHeight: number
  ) {
    const width = viewportWidth
    const height = viewportHeight
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

  get width(): number {
    return this.viewportWidth
  }

  get height(): number {
    return this.viewportHeight
  }

  /** Update logical viewport dimensions without changing world state. */
  resize(width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError('Viewport dimensions must be positive integers')
    }
    this.viewportWidth = width
    this.viewportHeight = height
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

  /** Select world coordinates, or pass null to draw screen-space UI. */
  setCamera(camera: Camera2D | null): void {
    const scaleX = this.canvas.width / this.width
    const scaleY = this.canvas.height / this.height
    const x = camera?.position.x ?? 0
    const y = camera?.position.y ?? 0
    this.context.setTransform(scaleX, 0, 0, scaleY, -x * scaleX, -y * scaleY)
  }

  /** Draw a filled rectangle in logical pixels, with its origin at the top left. */
  drawRect(x: number, y: number, width: number, height: number, color = '#ffffff'): void {
    this.context.fillStyle = color
    this.context.fillRect(x, y, width, height)
  }

  /** Draw an axis-aligned outline using the current camera and DPI transforms. */
  drawRectOutline(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    lineWidth = 2
  ): void {
    this.context.save()
    try {
      this.context.strokeStyle = color
      this.context.lineWidth = lineWidth
      this.context.strokeRect(x, y, width, height)
    } finally {
      this.context.restore()
    }
  }

  /** Draw the exact outline of a box rotated around its center. */
  drawRotatedRectOutline(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    color: string,
    lineWidth = 2
  ): void {
    this.context.save()
    try {
      this.context.translate(x + width / 2, y + height / 2)
      this.context.rotate(rotation)
      this.drawRectOutline(-width / 2, -height / 2, width, height, color, lineWidth)
    } finally {
      this.context.restore()
    }
  }

  /** Draw a rectangle rotated around its center, preserving camera and DPI transforms. */
  drawRotatedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    color: string
  ): void {
    this.context.save()
    try {
      this.context.translate(x + width / 2, y + height / 2)
      this.context.rotate(rotation)
      this.drawRect(-width / 2, -height / 2, width, height, color)
    } finally {
      this.context.restore()
    }
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
