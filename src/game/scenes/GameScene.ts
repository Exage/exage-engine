import { Scene } from '@/engine'
import type { Input, Renderer, Time } from '@/engine'
import { Player } from '@/game/entities/Player'

/** First Motion demo with one player centered in the logical viewport. */
export class GameScene extends Scene {
  readonly player: Player

  constructor(
    input: Input,
    private readonly time: Readonly<Pick<Time, 'fps' | 'deltaTime'>>,
    width: number,
    height: number
  ) {
    super()
    this.player = new Player(input)
    this.player.transform.position.set(
      (width - this.player.width) / 2,
      (height - this.player.height) / 2
    )
    this.add(this.player)
  }

  override render(renderer: Renderer): void {
    super.render(renderer)

    const { x, y } = this.player.transform.position
    renderer.drawRect(8, 8, 280, 104, '#101218')
    renderer.drawText(`FPS: ${this.time.fps.toFixed(0)}`, 16, 16)
    renderer.drawText(`Delta: ${this.time.deltaTime.toFixed(3)} s`, 16, 40)
    renderer.drawText(`Entities: ${this.entities.length}`, 16, 64)
    renderer.drawText(`Player: ${x.toFixed(1)}, ${y.toFixed(1)}`, 16, 88)
  }
}
