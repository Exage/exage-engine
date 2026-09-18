export class Renderer {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D rendering is not supported')
    }

    this.canvas = canvas
    this.context = context
    this.canvas.width = width
    this.canvas.height = height
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
