import { Camera2D, Scene } from '@/engine'
import type { Input, Renderer, Time } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import { Floor } from '@/game/entities/Floor'
import { Projectile } from '@/game/entities/Projectile'
import { Player } from '@/game/entities/Player'
import { Wall } from '@/game/entities/Wall'
import { demoLevel } from '@/game/levels/demoLevel'
import { Weapon } from '@/game/entities/Weapon'
import { enemyTestLevel } from '@/game/levels/enemyTestLevel'
import type { Level } from '@/game/levels/Level'
import { CheatMenu } from '@/game/ui/CheatMenu'

/** Playable demo and enemy test rooms with transferable weapons and diagnostics. */
export class GameScene extends Scene {
  readonly enemies: Enemy[] = []
  readonly projectiles: Projectile[] = []
  readonly weapons: Weapon[] = []
  private level: Level = demoLevel
  readonly player: Player
  readonly camera: Camera2D
  get worldWidth(): number {
    return this.level.worldWidth
  }

  get worldHeight(): number {
    return this.level.worldHeight
  }

  get isTestingEnemies(): boolean {
    return this.level === enemyTestLevel
  }
  private showColliders = false
  private gameOver = false
  private paused = false
  private readonly cheatMenu: CheatMenu | null

  get isGameOver(): boolean {
    return this.gameOver
  }

  constructor(
    private readonly input: Input,
    private readonly time: Readonly<Pick<Time, 'fps' | 'deltaTime'>>,
    width: number,
    height: number
  ) {
    super()
    this.input.bindShortcut('toggleColliders', 'KeyC', { metaKey: true })
    this.camera = new Camera2D(width, height)
    this.player = new Player(input, this.collisions)
    this.cheatMenu =
      import.meta.env.VITE_ENVIRONMENT === 'development' ? new CheatMenu(input, this.player) : null
    this.restart()
  }

  private restart(): void {
    this.gameOver = false
    this.player.controlsEnabled = true
    this.player.weapon?.drop()
    this.weapons.length = 0
    this.projectiles.length = 0
    this.enemies.length = 0
    this.entities.length = 0
    this.player.transform.rotation = 0
    this.player.transform.position.set(this.level.playerSpawn.x, this.level.playerSpawn.y)
    for (const { x, y, width, height, color } of this.level.floors) {
      this.add(new Floor(x, y, width, height, color))
    }
    for (const { x, y, width: wallWidth, height: wallHeight } of this.level.walls) {
      this.add(new Wall(x, y, wallWidth, wallHeight))
    }
    for (const { x, y, options } of this.level.enemies) {
      const enemy = new Enemy(x, y, options)
      this.enemies.push(enemy)
      this.add(enemy)
      if (enemy.weapon) {
        this.addWeapon(enemy.weapon)
      }
    }
    for (const { x, y, options } of this.level.weapons) {
      this.addWeapon(new Weapon(x, y, options))
    }
    const starter = new Weapon(0, 0, { ammo: 24, initialDelay: 0 })
    starter.equip(this.player)
    this.addWeapon(starter)
    this.add(this.player)
    this.updateCamera()
  }

  private addWeapon(weapon: Weapon): void {
    this.weapons.push(weapon)
    this.add(weapon)
  }

  override resize(width: number, height: number): void {
    this.camera.resize(width, height)
    this.updateCamera()
  }

  override update(dt: number): void {
    if (this.cheatMenu?.update(this.camera.width, this.camera.height)) {
      return
    }
    if (this.input.wasPressed('Escape')) {
      this.paused = !this.paused
      return
    }
    if (this.paused) {
      return
    }
    if (this.input.wasShortcutPressed('toggleColliders')) {
      this.showColliders = !this.showColliders
    }
    if (this.input.wasPressed('F2')) {
      this.level = this.isTestingEnemies ? demoLevel : enemyTestLevel
      this.showColliders = this.isTestingEnemies
      this.restart()
      return
    }
    if ((this.gameOver || this.isTestingEnemies) && this.input.wasPressed('KeyR')) {
      this.restart()
      return
    }
    if (this.isTestingEnemies && !this.gameOver) {
      for (const [index, station] of (this.level.stations ?? []).entries()) {
        if (this.input.wasPressed(`Digit${index + 1}`)) {
          this.player.transform.position.set(station.entry.x, station.entry.y)
          this.projectiles.length = 0
          this.updateCamera()
          return
        }
      }
    }
    super.update(dt)
    const position = this.player.transform.position
    const bounds = this.player.collider.bounds
    position.x += Math.max(0, Math.min(bounds.x, this.worldWidth - bounds.width)) - bounds.x
    position.y += Math.max(0, Math.min(bounds.y, this.worldHeight - bounds.height)) - bounds.y
    this.updateCamera()
    const pointer = this.input.pointer
    if (pointer) {
      this.player.aimAt(pointer.x + this.camera.position.x, pointer.y + this.camera.position.y)
    }
    if (!this.gameOver) {
      this.player.weapon?.advance(dt)
      if (this.input.rightClicks.length > 0) {
        this.player.weapon?.drop()
      }
      if (this.input.wasPressed('KeyE')) {
        const nearby = this.weapons
          .filter((weapon) => weapon.canPickup(this.player, this.hitboxes))
          .sort((a, b) => a.distanceTo(this.player) - b.distanceTo(this.player))[0]
        if (nearby) {
          this.player.weapon?.drop()
          nearby.equip(this.player)
        }
      }
      for (const click of this.input.clicks) {
        this.player.aimAt(click.x + this.camera.position.x, click.y + this.camera.position.y)
        const projectile = this.player.weapon?.fire()
        if (projectile) {
          this.projectiles.push(projectile)
        }
      }
    }
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const projectile = this.projectiles[index]!
      projectile.update(dt)
      const enemyShot = projectile.owner instanceof Enemy
      const closest = projectile.cast(this.hitboxes, {
        ignore: projectile.owner ?? this.player,
        filter: (entity) => !enemyShot || !(entity instanceof Enemy),
      })
      if (
        closest?.kind === 'hitbox' &&
        enemyShot &&
        closest.entity === this.player &&
        !this.gameOver
      ) {
        this.player.die()
        this.gameOver = !this.player.controlsEnabled
      }
      if (closest?.kind === 'hitbox' && !enemyShot && closest.entity instanceof Enemy) {
        closest.entity.receiveHit()
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
    if (!this.gameOver) {
      for (const enemy of this.enemies) {
        this.pickupEnemyWeapon(enemy)
        const projectile = enemy.attack(dt, this.player, this.hitboxes, this.entities)
        this.pickupEnemyWeapon(enemy)
        if (projectile) {
          this.projectiles.push(projectile)
        }
        if (!this.player.controlsEnabled) {
          this.gameOver = true
          break
        }
      }
    }
  }

  private pickupEnemyWeapon(enemy: Enemy): void {
    if (!enemy.canEquipWeapon || enemy.weapon) {
      return
    }
    const nearby = this.weapons
      .filter((weapon) => weapon.ammo > 0 && weapon.canPickup(enemy, this.hitboxes, 48))
      .sort((a, b) => a.distanceTo(enemy) - b.distanceTo(enemy))[0]
    nearby?.equip(enemy)
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
      for (const [index, station] of (this.level.stations ?? []).entries()) {
        renderer.drawText(`${index + 1}. ${station.type.toUpperCase()}`, station.x, station.y, {
          fontSize: 24,
          color: '#d6e7f5',
        })
        renderer.drawText(station.description, station.x, station.y + 36, {
          fontSize: 12,
          color: '#a9bdd1',
        })
        renderer.drawText('Enter here / weapon rack below', station.entry.x + 20, 930, {
          align: 'center',
          fontSize: 14,
          color: '#a9bdd1',
        })
      }
      if (this.isTestingEnemies) {
        for (const enemy of this.enemies) {
          const weapon = enemy.weapon
          const bleeding = enemy.bleedRemaining
          const status = bleeding !== null ? `bleeding ${bleeding.toFixed(1)}s` : enemy.activity
          renderer.drawText(
            `${enemy.config.type} / ${status} / HP ${enemy.health} / ${weapon ? `${weapon.ammo} rounds` : 'unarmed'}`,
            enemy.transform.position.x + enemy.width / 2,
            enemy.transform.position.y - 24,
            { align: 'center', fontSize: 12, color: '#e3eaf2' }
          )
        }
      }
      for (const projectile of this.projectiles) {
        projectile.render(renderer)
      }
      if (this.showColliders) {
        for (const enemy of this.enemies) {
          enemy.renderPatrolArea(renderer)
          enemy.renderVision(renderer)
        }
        for (const entity of [...this.entities, ...this.projectiles]) {
          const collider = entity.collider
          if (collider?.enabled) {
            const { x, y, width, height, rotation } = collider.shape
            if (rotation === 0) {
              renderer.drawRectOutline(x, y, width, height, '#00ff00')
            } else {
              renderer.drawRotatedRectOutline(x, y, width, height, rotation, '#00ff00')
            }
          }
          for (const hitbox of entity.hitboxes) {
            if (!hitbox.enabled) {
              continue
            }
            const { x, y, width, height, rotation } = hitbox.shape
            if (rotation === 0) {
              renderer.drawRectOutline(x, y, width, height, '#c084fc', 1)
            } else {
              renderer.drawRotatedRectOutline(x, y, width, height, rotation, '#c084fc', 1)
            }
          }
        }
      }
    } finally {
      renderer.setCamera(null)
    }

    const weapon = this.player.weapon
    const station = this.level.stations?.find(
      (station) =>
        this.player.transform.position.x >= station.x - 20 &&
        this.player.transform.position.x <= station.x + 600
    )
    renderer.drawRect(
      8,
      this.camera.height - 108,
      Math.min(660, this.camera.width - 16),
      100,
      '#101218'
    )
    renderer.drawText(
      `${this.level.name}${station ? ` / ${station.type.toUpperCase()}` : ''} | ${weapon ? `${weapon.config.kind}: ${weapon.ammo} rounds` : 'Unarmed'}`,
      16,
      this.camera.height - 100,
      {
        color: '#f9df8d',
        fontSize: 16,
      }
    )
    renderer.drawText(
      'WASD: move | LMB: fire | E: pick up / swap | RMB: drop',
      16,
      this.camera.height - 74,
      { fontSize: 14 }
    )
    renderer.drawText(
      this.isTestingEnemies
        ? '1-5: test room | R: reset lab | F2: demo | Esc: pause'
        : 'F2: enemy AI lab | Esc: pause | Cmd+C: vision / hitboxes',
      16,
      this.camera.height - 50,
      { color: '#9aaec4', fontSize: 14 }
    )

    if (this.cheatMenu) {
      renderer.drawText('Cmd+X: cheats', this.camera.width - 16, this.camera.height - 24, {
        align: 'right',
        color: '#9aaec4',
        fontSize: 13,
      })
    }
    const { x, y } = this.player.transform.position
    renderer.drawRect(8, 8, 280, 104, '#101218')
    renderer.drawText(`FPS: ${this.time.fps.toFixed(0)}`, 16, 16)
    renderer.drawText(`Delta: ${this.time.deltaTime.toFixed(3)} s`, 16, 40)
    renderer.drawText(`Entities: ${this.entities.length + this.projectiles.length}`, 16, 64)
    renderer.drawText(`Player: ${x.toFixed(1)}, ${y.toFixed(1)}`, 16, 88)
    if (this.showColliders) {
      renderer.drawRect(8, 116, 400, 80, '#101218')
      renderer.drawText('Green: collider | Purple: hitbox', 16, 124)
      renderer.drawText('Vision: yellow idle | orange sees player', 16, 148)
      renderer.drawText('Blue: patrol area', 16, 172)
    }
    if (this.gameOver) {
      renderer.drawRect(0, this.camera.height - 80, this.camera.width, 80, '#101218')
      renderer.drawText('Press [R] to restart', this.camera.width / 2, this.camera.height - 54, {
        fontSize: 24,
        align: 'center',
      })
    }
    if (this.paused) {
      renderer.drawRect(0, 0, this.camera.width, this.camera.height, 'rgba(0, 0, 0, 0.65)')
      renderer.drawText('Paused', this.camera.width / 2, this.camera.height / 2 - 32, {
        fontSize: 32,
        align: 'center',
      })
      renderer.drawText(
        'Press [Esc] to resume',
        this.camera.width / 2,
        this.camera.height / 2 + 16,
        {
          fontSize: 16,
          align: 'center',
          color: '#9aaec4',
        }
      )
    }
    this.cheatMenu?.render(renderer, this.camera.width, this.camera.height)
  }
}
