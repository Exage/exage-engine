import { Entity } from '@/engine'
import type { HitboxWorld, Renderer } from '@/engine'
import { Projectile } from '@/game/entities/Projectile'

export type WeaponKind = 'pistol' | 'rifle'

export interface WeaponOptions {
  kind?: WeaponKind
  ammo?: number
  shotInterval?: number
  initialDelay?: number
  projectileSpeed?: number
}

export interface WeaponCarrier extends Entity {
  readonly width: number
  readonly height: number
  readonly canEquipWeapon: boolean
  weapon: Weapon | null
}

export function resolveWeaponConfig(
  options: WeaponOptions = {}
): Readonly<Required<WeaponOptions>> {
  const kind = options.kind ?? 'pistol'
  const shotInterval = options.shotInterval ?? (kind === 'rifle' ? 0.12 : 0.25)
  const config = {
    kind,
    ammo: options.ammo ?? (kind === 'rifle' ? 30 : 12),
    shotInterval,
    initialDelay: options.initialDelay ?? shotInterval,
    projectileSpeed: options.projectileSpeed ?? (kind === 'rifle' ? 1200 : 1000),
  }
  if (!['pistol', 'rifle'].includes(kind)) {
    throw new RangeError('Unknown weapon kind')
  }
  if (!Number.isInteger(config.ammo) || config.ammo < 0) {
    throw new RangeError('Weapon ammo must be a non-negative integer')
  }
  for (const value of [config.shotInterval, config.projectileSpeed]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('Weapon firing interval and projectile speed must be positive')
    }
  }
  if (!Number.isFinite(config.initialDelay) || config.initialDelay < 0) {
    throw new RangeError('Weapon initial delay must be non-negative')
  }
  return Object.freeze(config)
}

/** A transferable weapon; ammunition and firing cooldown belong to this instance. */
export class Weapon extends Entity {
  readonly config: Readonly<Required<WeaponOptions>>
  private holder: WeaponCarrier | null = null
  private rounds: number
  private cooldown: number
  private pickupCooldown = 0

  constructor(x: number, y: number, options: WeaponOptions = {}) {
    super()
    this.config = resolveWeaponConfig(options)
    this.rounds = this.config.ammo
    this.cooldown = this.config.initialDelay
    this.transform.position.set(x, y)
    this.zIndex = 1
  }

  get owner(): WeaponCarrier | null {
    return this.holder
  }

  get ammo(): number {
    return this.rounds
  }

  get available(): boolean {
    return !this.holder && this.pickupCooldown <= 0
  }

  distanceTo(carrier: WeaponCarrier): number {
    return Math.hypot(
      this.transform.position.x - carrier.transform.position.x - carrier.width / 2,
      this.transform.position.y - carrier.transform.position.y - carrier.height / 2
    )
  }

  canPickup(carrier: WeaponCarrier, world: HitboxWorld, range = 64): boolean {
    if (!this.available || !carrier.canEquipWeapon || this.distanceTo(carrier) > range) {
      return false
    }
    const x = carrier.transform.position.x + carrier.width / 2
    const y = carrier.transform.position.y + carrier.height / 2
    const obstruction = world.cast(
      { x, y, width: 0, height: 0, rotation: 0 },
      this.transform.position.x - x,
      this.transform.position.y - y,
      {
        ignore: carrier,
        filter: (entity) => entity.collider?.blocksHits === true,
      }
    )
    return obstruction === null
  }

  equip(carrier: WeaponCarrier): boolean {
    if (!this.available || carrier.weapon || !carrier.canEquipWeapon) {
      return false
    }
    this.holder = carrier
    carrier.weapon = this
    return true
  }

  drop(): void {
    if (!this.holder) {
      return
    }
    const carrier = this.holder
    this.transform.position.set(
      carrier.transform.position.x + carrier.width / 2,
      carrier.transform.position.y + carrier.height / 2
    )
    this.transform.rotation = carrier.transform.rotation
    carrier.weapon = null
    this.holder = null
    // A deliberate drop must remain on the ground for at least one frame.
    this.pickupCooldown = 0.4
  }

  advance(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt)
  }

  fire(color = '#ffe38a'): Projectile | null {
    const carrier = this.holder
    if (!carrier || !carrier.canEquipWeapon || this.rounds === 0 || this.cooldown > 0) {
      return null
    }
    this.rounds--
    this.cooldown = this.config.shotInterval
    return new Projectile(
      carrier.transform.position.x + carrier.width / 2,
      carrier.transform.position.y + carrier.height / 2,
      carrier.transform.rotation,
      { owner: carrier, speed: this.config.projectileSpeed, color }
    )
  }

  override update(dt: number): void {
    this.pickupCooldown = Math.max(0, this.pickupCooldown - dt)
    if (!this.holder) {
      this.advance(dt)
    }
  }

  renderHeld(renderer: Renderer, color: string): void {
    const carrier = this.holder
    if (!carrier) {
      return
    }
    const angle = carrier.transform.rotation
    const length = carrier.width * (this.config.kind === 'rifle' ? 0.9 : 0.6)
    const width = carrier.height * 0.2
    renderer.drawRotatedRect(
      carrier.transform.position.x +
        carrier.width / 2 +
        (Math.cos(angle) * carrier.width) / 2 -
        length / 2,
      carrier.transform.position.y +
        carrier.height / 2 +
        (Math.sin(angle) * carrier.width) / 2 -
        width / 2,
      length,
      width,
      angle,
      color
    )
  }

  override render(renderer: Renderer): void {
    if (this.holder) {
      return
    }
    const { x, y } = this.transform.position
    const length = this.config.kind === 'rifle' ? 38 : 26
    renderer.drawRotatedRect(
      x - length / 2,
      y - 5,
      length,
      10,
      this.transform.rotation,
      this.rounds > 0 ? '#f9df8d' : '#64748b'
    )
    renderer.drawText(`${this.config.kind} / ${this.rounds}`, x, y + 15, {
      align: 'center',
      fontSize: 12,
      color: '#f9df8d',
    })
  }
}
