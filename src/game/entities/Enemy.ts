import { boxPenetration, Entity, Hitbox } from '@/engine'
import type { HitboxWorld, Renderer } from '@/engine'
import { resolveEnemyConfig } from '@/game/entities/EnemyConfig'
import type { EnemyConfig, EnemyOptions, PatrolArea } from '@/game/entities/EnemyConfig'
import { nearestPatrolArea, nearestWallDestination } from '@/game/entities/EnemySearch'
import { EnemyNavigation } from '@/game/entities/EnemyNavigation'
import type { Player } from '@/game/entities/Player'
import type { Projectile } from '@/game/entities/Projectile'
import { Weapon } from '@/game/entities/Weapon'

/** Perception and navigation shared by human enemies and charging dogs. */
export class Enemy extends Entity {
  readonly config: EnemyConfig
  private wasHit = false
  weapon: Weapon | null = null
  private healthPoints: number
  private bleedingTimer: number | null = null
  private randomTimer = 0
  private randomWalking = false
  private randomHeading = 0
  private randomLooking = false
  private seesPlayer = false
  private lastSeenPlayer: { x: number; y: number } | null = null
  private readonly spawnPosition: { x: number; y: number }
  private returningHome = false
  private patrolPoints: readonly { x: number; y: number }[] = []
  private patrolArea: PatrolArea | null = null
  private patrolSpeed = 0
  private patrolRoute: 'perimeter' | 'wall-to-wall' | 'straight' = 'perimeter'
  private readonly navigation: EnemyNavigation
  private movementBlocked = false
  private holdingPosition = false
  private relocation: { x: number; y: number; facingAngle: number } | null = null
  // Preserve the next waypoint while pursuit temporarily interrupts patrol.
  private patrolIndex = 0

  get width(): number {
    return this.config.width
  }

  get height(): number {
    return this.config.height
  }

  get playerVisible(): boolean {
    return this.seesPlayer
  }

  get canEquipWeapon(): boolean {
    return !this.hit && this.config.type !== 'dog'
  }

  get health(): number {
    return this.healthPoints
  }

  get bleedRemaining(): number | null {
    return this.bleedingTimer
  }

  get activity():
    | 'defeated'
    | 'chase'
    | 'investigate'
    | 'relocate'
    | 'return'
    | 'hold'
    | 'patrol'
    | 'guard'
    | 'wander'
    | 'look'
    | 'rest' {
    if (this.hit) {
      return 'defeated'
    }
    if (this.seesPlayer) {
      return 'chase'
    }
    if (this.lastSeenPlayer) {
      return 'investigate'
    }
    if (this.relocation) {
      return 'relocate'
    }
    if (this.returningHome) {
      return 'return'
    }
    if (this.holdingPosition) {
      return 'hold'
    }
    if (this.config.behavior.mode === 'random') {
      return this.randomWalking ? 'wander' : this.randomLooking ? 'look' : 'rest'
    }
    return this.patrolArea ? 'patrol' : 'guard'
  }

  get activePatrolArea(): PatrolArea | null {
    return this.holdingPosition ? null : this.patrolArea
  }

  /** A snapshot of the player's last observed center, never its hidden current position. */
  get lastSeenPosition(): Readonly<{ x: number; y: number }> | null {
    return this.lastSeenPlayer ? { ...this.lastSeenPlayer } : null
  }

  get hit(): boolean {
    return this.wasHit
  }

  set hit(value: boolean) {
    this.wasHit = value
    if (value) {
      this.seesPlayer = false
      this.lastSeenPlayer = null
      this.healthPoints = 0
      this.bleedingTimer = null
      this.weapon?.drop()
    } else {
      this.healthPoints = this.config.type === 'fat' ? 3 : 1
      this.bleedingTimer = null
    }
    for (const hitbox of this.hitboxes) {
      hitbox.enabled = !value
    }
  }

  constructor(x: number, y: number, options: EnemyOptions = {}) {
    super()
    this.config = resolveEnemyConfig(options)
    this.navigation = new EnemyNavigation(this.width, this.height, this.config.room)
    if (!this.navigation.isFree({ x, y })) {
      throw new RangeError('Enemy spawn must fit inside its room at every rotation')
    }
    this.spawnPosition = { x, y }
    this.healthPoints = this.config.type === 'fat' ? 3 : 1
    this.transform.position.set(x, y)
    this.transform.rotation = this.config.facingAngle
    if (this.config.spawnArmed) {
      new Weapon(x, y, this.config.weapon).equip(this)
    }
    const behavior = this.config.behavior
    if (behavior.mode === 'patrol') {
      this.patrolRoute = behavior.route
      this.setPatrolArea(behavior.area, behavior.speed)
    }
    this.hitboxes.push(
      new Hitbox(this, {
        id: 'body',
        ...this.config.hitbox,
        followRotation: true,
        pivotX: this.width / 2,
        pivotY: this.height / 2,
      })
    )
  }

  receiveHit(): void {
    if (this.hit) {
      return
    }
    this.healthPoints--
    if (this.healthPoints <= 0) {
      this.hit = true
    } else if (this.bleedingTimer === null) {
      this.bleedingTimer = 2.5
    }
  }

  override update(dt: number): void {
    if (this.bleedingTimer !== null && !this.hit) {
      this.bleedingTimer = Math.max(0, this.bleedingTimer - dt)
      if (this.bleedingTimer === 0) {
        this.hit = true
      }
    }
  }

  /** Test the player's center against the current cone and attack-blocking obstacles. */
  canSee(player: Player, world: HitboxWorld): boolean {
    if (import.meta.env.VITE_ENVIRONMENT === 'development' && player.hiddenFromEnemies) {
      return false
    }
    const { range, angleDegrees } = this.config.vision
    if (this.hit || range === 0 || angleDegrees === 0) {
      return false
    }
    const x = this.transform.position.x + this.width / 2
    const y = this.transform.position.y + this.height / 2
    const dx = player.transform.position.x + player.width / 2 - x
    const dy = player.transform.position.y + player.height / 2 - y
    const distance = Math.hypot(dx, dy)
    if (distance > range) {
      return false
    }
    const difference = Math.atan2(dy, dx) - this.transform.rotation
    const angle = Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference)))
    if (distance > 0 && angle > (angleDegrees * Math.PI) / 360 + 1e-10) {
      return false
    }
    const target = world.cast({ x, y, width: 0, height: 0, rotation: 0 }, dx, dy, {
      ignore: this,
      filter: (entity) => !(entity instanceof Enemy),
    })
    return target?.kind === 'hitbox' && target.entity === player
  }

  attack(
    dt: number,
    player: Player,
    world: HitboxWorld,
    obstacles: readonly Entity[] = world.entities
  ): Projectile | null {
    this.seesPlayer = this.canSee(player, world)
    if (this.hit) {
      return null
    }
    if (this.navigation.update(obstacles) && this.patrolArea) {
      if (this.patrolRoute === 'perimeter') {
        // Refresh wall clearance while preserving the next corner after pursuit.
        this.patrolPoints = this.createPatrolPoints(this.patrolArea)
      } else {
        this.setPatrolArea(this.patrolArea, this.patrolSpeed)
      }
    }
    let investigationFinished = false
    this.weapon?.advance(dt)
    if (!this.seesPlayer) {
      if (this.lastSeenPlayer) {
        investigationFinished = this.moveToward(
          this.lastSeenPlayer.x - this.width / 2,
          this.lastSeenPlayer.y - this.height / 2,
          this.config.movement.speed * dt
        )
        if (this.movementBlocked && dt > 0 && this.config.movement.speed > 0) {
          investigationFinished = true
        }
      } else if (this.relocation) {
        if (
          this.moveToward(this.relocation.x, this.relocation.y, this.config.search.speed * dt) ||
          (this.movementBlocked && dt > 0 && this.config.search.speed > 0)
        ) {
          this.transform.rotation = this.relocation.facingAngle
          this.relocation = null
        }
      } else if (this.returningHome && this.config.behavior.mode === 'guard') {
        if (
          this.moveToward(this.spawnPosition.x, this.spawnPosition.y, this.config.search.speed * dt)
        ) {
          this.returningHome = false
          this.holdingPosition = false
          this.transform.rotation = this.config.facingAngle
        } else if (this.movementBlocked && dt > 0 && this.config.search.speed > 0) {
          this.returningHome = false
          this.holdingPosition = true
        }
      } else {
        if (this.config.behavior.mode === 'random') {
          this.wander(dt)
        } else {
          this.patrol(dt)
        }
      }
      this.seesPlayer = this.canSee(player, world)
    } else {
      this.rememberPlayer(player)
      this.approach(dt, player)
      this.seesPlayer = this.canSee(player, world)
    }
    if (this.config.type === 'dog') {
      if (boxPenetration(this.hitboxes[0]!.shape, player.hitboxes[0]!.shape)) {
        player.die()
      }
    }
    if (!this.seesPlayer) {
      if (this.lastSeenPlayer && investigationFinished) {
        this.lastSeenPlayer = null
        this.finishSearch(obstacles)
      }
      return null
    }
    this.rememberPlayer(player)
    const x = this.transform.position.x + this.width / 2
    const y = this.transform.position.y + this.height / 2
    const dx = player.transform.position.x + player.width / 2 - x
    const dy = player.transform.position.y + player.height / 2 - y
    if (dx !== 0 || dy !== 0) {
      this.transform.rotation = Math.atan2(dy, dx)
    }
    if (this.config.type === 'dog' || !this.weapon) {
      return null
    }
    // Sight is a ray; firing additionally requires clearance for the whole projectile.
    const target = world.cast({ x: x - 4, y: y - 4, width: 8, height: 8, rotation: 0 }, dx, dy, {
      ignore: this,
      filter: (entity) => !(entity instanceof Enemy),
    })
    if (target?.kind !== 'hitbox' || target.entity !== player) {
      return null
    }
    return this.weapon.fire('#ff785a')
  }

  private wander(dt: number): void {
    const behavior = this.config.behavior
    if (behavior.mode !== 'random' || dt <= 0 || behavior.speed === 0) {
      return
    }
    let remaining = dt
    while (remaining > 0) {
      if (this.randomTimer <= 1e-8) {
        this.randomWalking = !this.randomWalking
        if (this.randomWalking) {
          this.randomHeading = Math.PI / 4 + (Math.floor(Math.random() * 4) * Math.PI) / 2
          this.transform.rotation = this.randomHeading
          this.randomTimer = 1.5 + Math.random()
        } else {
          this.randomLooking = Math.random() < 0.5
          this.randomTimer = 0.5 + Math.random() * 1.5
        }
      }
      const step = Math.min(remaining, this.randomTimer)
      if (this.randomWalking) {
        const blocked = this.navigation.walkStraight(
          this.transform.position,
          this.randomHeading,
          behavior.speed * step
        )
        this.transform.rotation = this.randomHeading
        if (blocked) {
          this.randomTimer = step
        }
      } else if (this.randomLooking) {
        this.transform.rotation += (step * Math.PI) / 2
      }
      this.randomTimer -= step
      remaining -= step
    }
  }

  private rememberPlayer(player: Player): void {
    this.lastSeenPlayer = {
      x: player.transform.position.x + player.width / 2,
      y: player.transform.position.y + player.height / 2,
    }
    this.returningHome = false
    this.relocation = null
  }

  private finishSearch(obstacles: readonly Entity[]): void {
    const search = this.config.search
    if (search.after === 'return') {
      this.returningHome = this.config.behavior.mode !== 'random'
      return
    }
    if (search.after === 'nearest-patrol') {
      const area = nearestPatrolArea(
        this.transform.position,
        this.width,
        this.height,
        search.patrolAreas.filter((area) => {
          const room = this.config.room
          return (
            !room ||
            (area.x >= room.x &&
              area.y >= room.y &&
              area.x + area.width <= room.x + room.width &&
              area.y + area.height <= room.y + room.height)
          )
        })
      )
      if (
        area &&
        this.createPatrolPoints(area).some(
          (point) => this.navigation.plan(this.transform.position, point) !== null
        )
      ) {
        // Preserve progress when the selected zone is already the active route.
        if (
          !this.patrolArea ||
          area.x !== this.patrolArea.x ||
          area.y !== this.patrolArea.y ||
          area.width !== this.patrolArea.width ||
          area.height !== this.patrolArea.height
        ) {
          this.setPatrolArea(area, search.speed)
        }
        this.holdingPosition = false
        return
      }
    }
    this.relocation = nearestWallDestination(
      this.transform.position,
      this.width,
      this.height,
      obstacles,
      search.wallSearchRange,
      search.wallClearance,
      (point) =>
        this.navigation.isFree(point) &&
        this.navigation.plan(this.transform.position, point) !== null
    )
    this.holdingPosition = true
  }

  private setPatrolArea(area: PatrolArea, speed: number): void {
    this.patrolArea = area
    this.patrolSpeed = speed
    this.patrolPoints = this.createPatrolPoints(area)
    this.selectInitialPatrolPoint()
  }

  private createPatrolPoints(area: PatrolArea): readonly { x: number; y: number }[] {
    const { x, y, width, height } = area
    const right = x + width - this.width
    const bottom = y + height - this.height
    if (this.patrolRoute === 'straight') {
      return this.navigation.straightPatrolDestinations(area, this.spawnPosition)
    }
    return this.patrolRoute !== 'perimeter'
      ? this.navigation.patrolDestinations(area)
      : [
          { x, y },
          { x: right, y },
          { x: right, y: bottom },
          { x, y: bottom },
        ].map((point) => {
          const target = this.navigation.constrain(point)
          if (this.config.room || !this.navigation.isFree(target)) {
            // Leave a gap for rotation and avoid sweep contacts at outer wall endpoints.
            return this.navigation.constrain(
              this.navigation.constrain(point, area, 0.01),
              this.config.room,
              0.01
            )
          }
          return target
        })
  }

  private moveToward(x: number, y: number, budget: number): boolean {
    const result = this.navigation.travel(this.transform.position, { x, y }, budget)
    this.movementBlocked = result.blocked
    if (budget > 0 && result.heading !== null) {
      this.transform.rotation = result.heading
    }
    return result.reached
  }

  private selectInitialPatrolPoint(): void {
    const position = this.transform.position
    this.patrolIndex = 0
    let nearest = Infinity
    for (const [index, point] of this.patrolPoints.entries()) {
      const distance = Math.hypot(point.x - position.x, point.y - position.y)
      if (distance < nearest) {
        nearest = distance
        this.patrolIndex = index
      }
    }
    if (nearest <= 1e-6 && this.patrolPoints.length > 0) {
      // A spawn corner is already reached, even if pursuit starts on the first frame.
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length
    }
  }

  private patrol(dt: number): void {
    const area = this.patrolArea
    if (
      !area ||
      this.holdingPosition ||
      dt <= 0 ||
      this.patrolSpeed === 0 ||
      this.patrolPoints.length === 0
    ) {
      return
    }
    const position = this.transform.position
    let remaining = this.patrolSpeed * dt
    let reached = 0
    let skipped = 0
    let lapDistance = 0
    while (remaining > 0) {
      const target = this.patrolPoints[this.patrolIndex]!
      const result = this.navigation.travel(position, target, remaining)
      if (result.heading !== null) {
        this.transform.rotation = result.heading
      }
      remaining -= result.used
      if (reached > 0) {
        lapDistance += result.used
      }
      if (result.blocked) {
        skipped++
        if (skipped >= this.patrolPoints.length) {
          return
        }
      } else if (!result.reached) {
        return
      } else if (result.used > 0) {
        skipped = 0
      }
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length
      this.returningHome = false
      reached++
      if (reached === this.patrolPoints.length + 1) {
        // Skip identical extra laps after completing the initial approach and a lap.
        if (lapDistance <= 1e-6) {
          return
        }
        remaining %= lapDistance
      }
      const next = this.patrolPoints[this.patrolIndex]!
      const path = this.navigation.plan(position, next)
      const waypoint = path?.[0]
      if (waypoint) {
        this.transform.rotation = Math.atan2(waypoint.y - position.y, waypoint.x - position.x)
      }
    }
  }

  private approach(dt: number, player: Player): void {
    const position = this.transform.position
    const dx = player.transform.position.x + player.width / 2 - position.x - this.width / 2
    const dy = player.transform.position.y + player.height / 2 - position.y - this.height / 2
    const distance = Math.hypot(dx, dy)
    const { speed, stopDistance } = this.config.movement
    if (distance <= stopDistance || speed === 0 || dt <= 0) {
      return
    }
    const step = Math.min(speed * dt, distance - stopDistance)
    this.moveToward(
      position.x + (dx / distance) * (distance - stopDistance),
      position.y + (dy / distance) * (distance - stopDistance),
      step
    )
  }

  renderPatrolArea(renderer: Renderer): void {
    const area = this.activePatrolArea
    if (!area) {
      return
    }
    const { x, y, width, height } = area
    renderer.drawRectOutline(x, y, width, height, '#38bdf8', 1)
  }

  renderVision(renderer: Renderer): void {
    const { range, angleDegrees } = this.config.vision
    if (this.hit || range === 0 || angleDegrees === 0) {
      return
    }
    renderer.drawSector(
      this.transform.position.x + this.width / 2,
      this.transform.position.y + this.height / 2,
      range,
      this.transform.rotation,
      (angleDegrees * Math.PI) / 180,
      this.seesPlayer ? 'rgba(255, 120, 90, 0.16)' : 'rgba(250, 204, 21, 0.10)',
      this.seesPlayer ? '#ff785a' : '#facc15'
    )
  }

  override render(renderer: Renderer): void {
    const { x, y } = this.transform.position
    const angle = this.transform.rotation
    renderer.drawRotatedRect(
      x,
      y,
      this.width,
      this.height,
      angle,
      this.hit
        ? '#777f89'
        : this.bleedingTimer !== null
          ? '#eab308'
          : this.seesPlayer
            ? '#ff785a'
            : this.config.type === 'fat'
              ? '#a855b6'
              : this.config.type === 'dog'
                ? '#c69a65'
                : '#ef4444'
    )
    this.weapon?.renderHeld(renderer, this.seesPlayer ? '#fff0bd' : '#ffc9b9')
    if (this.config.type === 'dog' && !this.hit) {
      renderer.drawRotatedRect(
        x + this.width / 2 + (Math.cos(angle) * this.width) / 2 - 7,
        y + this.height / 2 + (Math.sin(angle) * this.width) / 2 - 7,
        14,
        14,
        angle,
        '#f2d1a1'
      )
    }
  }
}
