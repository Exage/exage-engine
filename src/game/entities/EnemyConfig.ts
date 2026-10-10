import { resolveWeaponConfig } from '@/game/entities/Weapon'
import type { WeaponOptions } from '@/game/entities/Weapon'

export type EnemyType = 'idle' | 'patrol' | 'random' | 'fat' | 'dog'

/** World-space rectangle containing the enemy's entire patrol unrotated body footprint. */
export interface PatrolArea {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** False prevents adopting this zone after a search; explicit spawn patrols still work. */
  readonly allowSearchPatrol?: boolean
}

export type EnemyBehavior =
  | { readonly mode: 'guard' }
  | { readonly mode: 'random'; readonly speed?: number }
  | {
      readonly mode: 'patrol'
      readonly area: PatrolArea
      /** Walking speed in world pixels per second; defaults to 100. */
      readonly speed?: number
      /** Straight reverses on one horizontal line; other routes visit multiple room sides. */
      readonly route?: 'perimeter' | 'wall-to-wall' | 'straight'
    }

/** Per-spawn overrides; omitted nested fields retain their defaults. */
export interface EnemyOptions {
  type?: EnemyType
  width?: number
  height?: number
  /** Initial viewing direction in radians: 0 right, PI / 2 down, PI left. */
  facingAngle?: number
  /** Initial clockwise direction in degrees; takes precedence over facingAngle. */
  facingAngleDegrees?: number
  /** Behavior before detection; human enemies can shoot while carrying a weapon. */
  behavior?: EnemyBehavior
  /** Home room for every movement state; wall-to-wall patrol defaults to its area. */
  room?: PatrolArea
  search?: {
    /** Action after reaching the last observed player position without reacquiring sight. */
    after?: 'return' | 'nearest-wall' | 'nearest-patrol'
    /** Walking speed after investigating, including guard return and relocation. */
    speed?: number
    /** Explicit candidate zones; independent of vision and excludes all unlisted zones. */
    patrolAreas?: readonly PatrolArea[]
    /** Maximum distance to a wall surface; if none is found, hold the search position. */
    wallSearchRange?: number
    /** Gap between the rotation-safe navigation envelope and the selected wall. */
    wallClearance?: number
  }
  hitbox?: {
    width?: number
    height?: number
    /** Omitted offsets center the hitbox inside the visual body. */
    offsetX?: number
    offsetY?: number
  }
  vision?: {
    /** Maximum center-to-center distance in world pixels; 0 disables sight. */
    range?: number
    /** Full cone angle in degrees, from 0 (disabled) to 360. */
    angleDegrees?: number
  }
  movement?: {
    /** Chase speed in world pixels per second; 0 disables movement. */
    speed?: number
    /** Stop approaching at this center-to-center distance in world pixels. */
    stopDistance?: number
  }
  /** Null spawns an unarmed enemy; dogs cannot carry weapons. */
  weapon?: WeaponOptions | null
}

export interface EnemyConfig {
  readonly type: EnemyType
  readonly spawnArmed: boolean
  readonly width: number
  readonly height: number
  readonly facingAngle: number
  readonly room: PatrolArea | null
  readonly behavior:
    | { readonly mode: 'guard' }
    | { readonly mode: 'random'; readonly speed: number }
    | {
        readonly mode: 'patrol'
        readonly area: PatrolArea
        readonly speed: number
        readonly route: 'perimeter' | 'wall-to-wall' | 'straight'
      }
  readonly hitbox: Readonly<Required<NonNullable<EnemyOptions['hitbox']>>>
  readonly vision: Readonly<Required<NonNullable<EnemyOptions['vision']>>>
  readonly movement: Readonly<Required<NonNullable<EnemyOptions['movement']>>>
  readonly search: Readonly<Required<NonNullable<EnemyOptions['search']>>>
  readonly weapon: Readonly<Required<WeaponOptions>>
}

export const DEFAULT_ENEMY_CONFIG: EnemyConfig = Object.freeze({
  type: 'idle',
  spawnArmed: true,
  width: 48,
  height: 48,
  facingAngle: 0,
  room: null,
  behavior: Object.freeze({ mode: 'guard' }),
  hitbox: Object.freeze({ width: 48, height: 48, offsetX: 0, offsetY: 0 }),
  vision: Object.freeze({ range: 600, angleDegrees: 120 }),
  movement: Object.freeze({ speed: 240, stopDistance: 400 }),
  search: Object.freeze({
    after: 'return',
    speed: 100,
    patrolAreas: Object.freeze([]),
    wallSearchRange: 1000,
    wallClearance: 8,
  }),
  weapon: resolveWeaponConfig({ shotInterval: 1.2, initialDelay: 1.2, projectileSpeed: 450 }),
})

/** Resolve a separate immutable configuration and reject invalid spawn data early. */
export function resolveEnemyConfig(options: EnemyOptions): EnemyConfig {
  const type = options.type ?? 'idle'
  if (!['idle', 'patrol', 'random', 'fat', 'dog'].includes(type)) {
    throw new RangeError('Unknown enemy type')
  }
  const preset: EnemyOptions =
    type === 'fat'
      ? { width: 64, height: 64, movement: { speed: 150, stopDistance: 140 } }
      : type === 'dog'
        ? { width: 44, height: 28, movement: { speed: 650, stopDistance: 0 } }
        : options.type
          ? { movement: { stopDistance: 100 } }
          : {}
  const behavior =
    options.behavior ??
    (type === 'random'
      ? { mode: 'random' as const }
      : (type === 'patrol' || type === 'dog') && options.room
        ? {
            mode: 'patrol' as const,
            area: options.room,
            route: 'perimeter' as const,
          }
        : undefined)
  if (type === 'patrol' && !behavior) {
    throw new RangeError('Patrol enemies need a room or patrol behavior')
  }
  options = {
    ...preset,
    ...options,
    behavior,
    movement: { ...preset.movement, ...options.movement },
    vision: { ...(options.type === 'idle' ? { angleDegrees: 360 } : {}), ...options.vision },
  }
  const width = options.width ?? DEFAULT_ENEMY_CONFIG.width
  const height = options.height ?? DEFAULT_ENEMY_CONFIG.height
  const hitboxWidth = options.hitbox?.width ?? width
  const hitboxHeight = options.hitbox?.height ?? height
  const shotInterval = options.weapon?.shotInterval ?? DEFAULT_ENEMY_CONFIG.weapon.shotInterval
  const resolvedBehavior = resolveBehavior(options.behavior, width, height)
  const room =
    options.room ??
    (resolvedBehavior.mode === 'patrol' && resolvedBehavior.route !== 'perimeter'
      ? resolvedBehavior.area
      : null)
  const config: EnemyConfig = {
    type,
    spawnArmed: type !== 'dog' && options.weapon !== null,
    width,
    height,
    room: room ? resolveRoom(room, width, height) : null,
    behavior: resolvedBehavior,
    search: resolveSearch(options.search, width, height),
    facingAngle:
      options.facingAngleDegrees !== undefined
        ? options.facingAngleDegrees * (Math.PI / 180)
        : (options.facingAngle ?? DEFAULT_ENEMY_CONFIG.facingAngle),
    hitbox: Object.freeze({
      width: hitboxWidth,
      height: hitboxHeight,
      offsetX: options.hitbox?.offsetX ?? (width - hitboxWidth) / 2,
      offsetY: options.hitbox?.offsetY ?? (height - hitboxHeight) / 2,
    }),
    vision: Object.freeze({
      range: options.vision?.range ?? DEFAULT_ENEMY_CONFIG.vision.range,
      angleDegrees: options.vision?.angleDegrees ?? DEFAULT_ENEMY_CONFIG.vision.angleDegrees,
    }),
    movement: Object.freeze({
      speed: options.movement?.speed ?? DEFAULT_ENEMY_CONFIG.movement.speed,
      stopDistance: options.movement?.stopDistance ?? DEFAULT_ENEMY_CONFIG.movement.stopDistance,
    }),
    weapon: resolveWeaponConfig({
      ...options.weapon,
      shotInterval,
      initialDelay: options.weapon?.initialDelay ?? shotInterval,
      projectileSpeed:
        options.weapon?.projectileSpeed ?? DEFAULT_ENEMY_CONFIG.weapon.projectileSpeed,
    }),
  }
  for (const [name, value] of Object.entries({
    width,
    height,
    hitboxWidth,
    hitboxHeight,
    shotInterval,
    projectileSpeed: config.weapon.projectileSpeed,
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Enemy ${name} must be finite and positive`)
    }
  }
  for (const [name, value] of Object.entries({
    range: config.vision.range,
    angleDegrees: config.vision.angleDegrees,
    initialDelay: config.weapon.initialDelay,
    movementSpeed: config.movement.speed,
    stopDistance: config.movement.stopDistance,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Enemy ${name} must be finite and non-negative`)
    }
  }
  if (config.vision.angleDegrees > 360) {
    throw new RangeError('Enemy angleDegrees must not exceed 360')
  }
  for (const value of [config.facingAngle, config.hitbox.offsetX, config.hitbox.offsetY]) {
    if (!Number.isFinite(value)) {
      throw new RangeError('Enemy facing angle and hitbox offsets must be finite')
    }
  }
  return Object.freeze(config)
}

function resolveSearch(
  options: EnemyOptions['search'] = {},
  width: number,
  height: number
): EnemyConfig['search'] {
  const config = {
    after: options.after ?? DEFAULT_ENEMY_CONFIG.search.after,
    speed: options.speed ?? DEFAULT_ENEMY_CONFIG.search.speed,
    wallSearchRange: options.wallSearchRange ?? DEFAULT_ENEMY_CONFIG.search.wallSearchRange,
    wallClearance: options.wallClearance ?? DEFAULT_ENEMY_CONFIG.search.wallClearance,
    patrolAreas: Object.freeze(
      (options.patrolAreas ?? []).map((area) => {
        const behavior = resolveBehavior({ mode: 'patrol', area }, width, height)
        if (behavior.mode !== 'patrol') {
          throw new RangeError('Search area must be a patrol rectangle')
        }
        return behavior.area
      })
    ),
  }
  if (!['return', 'nearest-wall', 'nearest-patrol'].includes(config.after)) {
    throw new RangeError('Enemy search action must be return, nearest-wall, or nearest-patrol')
  }
  for (const value of [config.speed, config.wallSearchRange, config.wallClearance]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError('Enemy search distances and speed must be finite and non-negative')
    }
  }
  return Object.freeze(config)
}

function resolveBehavior(
  behavior: EnemyBehavior = DEFAULT_ENEMY_CONFIG.behavior,
  width: number,
  height: number
): EnemyConfig['behavior'] {
  if (behavior.mode === 'guard') {
    return Object.freeze({ mode: 'guard' })
  }
  if (behavior.mode === 'random') {
    const speed = behavior.speed ?? 100
    if (!Number.isFinite(speed) || speed < 0) {
      throw new RangeError('Random walking speed must be finite and non-negative')
    }
    return Object.freeze({ mode: 'random', speed })
  }
  if (behavior.mode !== 'patrol') {
    throw new RangeError('Enemy behavior mode must be guard, patrol, or random')
  }
  const area = { ...behavior.area }
  if (area.allowSearchPatrol !== undefined && typeof area.allowSearchPatrol !== 'boolean') {
    throw new RangeError('Enemy patrol area allowSearchPatrol must be boolean')
  }
  const speed = behavior.speed ?? 100
  const route = behavior.route ?? 'perimeter'
  if (route !== 'perimeter' && route !== 'wall-to-wall' && route !== 'straight') {
    throw new RangeError('Enemy patrol route must be perimeter, wall-to-wall, or straight')
  }
  if (
    ![area.x, area.y, area.width, area.height, area.x + area.width, area.y + area.height].every(
      Number.isFinite
    ) ||
    area.width <= width ||
    area.height <= height
  ) {
    throw new RangeError(
      'Enemy patrol area must be finite and larger than the unrotated body footprint'
    )
  }
  if (!Number.isFinite(speed) || speed < 0) {
    throw new RangeError('Enemy patrol speed must be finite and non-negative')
  }
  return Object.freeze({ mode: 'patrol', area: Object.freeze(area), speed, route })
}

function resolveRoom(area: PatrolArea, width: number, height: number): PatrolArea {
  const diameter = Math.hypot(width, height)
  if (
    ![area.x, area.y, area.width, area.height, area.x + area.width, area.y + area.height].every(
      Number.isFinite
    ) ||
    area.width <= diameter ||
    area.height <= diameter
  ) {
    throw new RangeError('Enemy room must be finite and contain the body at every rotation')
  }
  return Object.freeze({ ...area })
}
