import { Camera2D, Scene } from '@/engine'
import type { Input, Renderer, Time } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import { Projectile } from '@/game/entities/Projectile'
import { Player } from '@/game/entities/Player'

/** A large world with a bounded following camera and screen-space diagnostics. */
export class GameScene extends Scene {
  readonly enemies: Enemy[] = []
  readonly projectiles: Projectile[] = []
  readonly player: Player
  readonly camera: Camera2D
  readonly worldWidth = 6000
  readonly worldHeight = 2000

  constructor(
    private readonly input: Input,
    private readonly time: Readonly<Pick<Time, 'fps' | 'deltaTime'>>,
    width: number,
    height: number
  ) {
    super()
    this.camera = new Camera2D(width, height)
    this.player = new Player(input)
    this.player.transform.position.set(
      (width - this.player.width) / 2,
      (height - this.player.height) / 2
    )
    for (let x = 300; x < this.worldWidth; x += 600) {
      for (let y = 220; y < this.worldHeight; y += 450) {
        const enemy = new Enemy(x, y)
        this.enemies.push(enemy)
        this.add(enemy)
      }
    }
    this.add(this.player)
    this.updateCamera()
  }

  override resize(width: number, height: number): void {
    this.camera.resize(width, height)
    this.updateCamera()
  }

  override update(dt: number): void {
    super.update(dt)
    const position = this.player.transform.position
    position.x = Math.max(0, Math.min(position.x, this.worldWidth - this.player.width))
    position.y = Math.max(0, Math.min(position.y, this.worldHeight - this.player.height))
    this.updateCamera()
    const pointer = this.input.pointer
    if (pointer) {
      this.player.aimAt(pointer.x + this.camera.position.x, pointer.y + this.camera.position.y)
    }
    for (const click of this.input.clicks) {
      this.player.aimAt(click.x + this.camera.position.x, click.y + this.camera.position.y)
      const angle = this.player.transform.rotation
      this.projectiles.push(
        new Projectile(
          position.x + this.player.width / 2,
          position.y + this.player.height / 2,
          angle
        )
      )
    }
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const projectile = this.projectiles[index]!
      projectile.update(dt)
      let closest: Enemy | null = null
      let distance = Infinity
      for (const enemy of this.enemies) {
        if (enemy.hit) {
          continue
        }
        const contact = projectile.contact(enemy)
        if (contact !== null && contact < distance) {
          closest = enemy
          distance = contact
        }
      }
      if (closest) {
        closest.hit = true
      }
      const point = projectile.transform.position
      if (
        closest ||
        projectile.expired ||
        point.x < 0 ||
        point.y < 0 ||
        point.x > this.worldWidth ||
        point.y > this.worldHeight
      ) {
        this.projectiles.splice(index, 1)
      }
    }
  }

  private updateCamera(): void {
    const { x, y } = this.player.transform.position
    this.camera.follow(
      x + this.player.width / 2,
      y + this.player.height / 2,
      this.worldWidth,
      this.worldHeight
    )
  }

  override render(renderer: Renderer): void {
    renderer.setCamera(this.camera)
    try {
      renderer.drawRect(0, 0, this.worldWidth, this.worldHeight, '#182330')
      const spacing = 200
      const startX = Math.floor(this.camera.position.x / spacing) * spacing
      const startY = Math.floor(this.camera.position.y / spacing) * spacing
      const endX = Math.min(this.worldWidth, this.camera.position.x + this.camera.width)
      const endY = Math.min(this.worldHeight, this.camera.position.y + this.camera.height)
      for (let x = startX; x <= endX; x += spacing) {
        renderer.drawRect(x, startY, 1, endY - startY, '#304357')
        for (let y = startY; y <= endY; y += spacing) {
          renderer.drawText(`${x}, ${y}`, x + 8, y + 8, { color: '#71869c', fontSize: 12 })
        }
      }
      for (let y = startY; y <= endY; y += spacing) {
        renderer.drawRect(startX, y, endX - startX, 1, '#304357')
      }
      super.render(renderer)
      for (const projectile of this.projectiles) {
        projectile.render(renderer)
      }
    } finally {
      renderer.setCamera(null)
    }

    const { x, y } = this.player.transform.position
    renderer.drawRect(8, 8, 280, 104, '#101218')
    renderer.drawText(`FPS: ${this.time.fps.toFixed(0)}`, 16, 16)
    renderer.drawText(`Delta: ${this.time.deltaTime.toFixed(3)} s`, 16, 40)
    renderer.drawText(`Entities: ${this.entities.length + this.projectiles.length}`, 16, 64)
    renderer.drawText(`Player: ${x.toFixed(1)}, ${y.toFixed(1)}`, 16, 88)
  }
}
