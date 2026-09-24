/** Per-spawn overrides; omitted nested fields retain their defaults. */
export interface EnemyOptions {
  width?: number
  height?: number
  /** Initial viewing direction in radians: 0 right, PI / 2 down, PI left. */
  facingAngle?: number
  /** Initial clockwise direction in degrees; takes precedence over facingAngle. */
  facingAngleDegrees?: number
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
  weapon?: {
    /** Seconds between shots. */
    shotInterval?: number
    /** Seconds after spawning before the first shot; defaults to shotInterval. */
    initialDelay?: number
    projectileSpeed?: number
  }
}

export interface EnemyConfig {
  readonly width: number
  readonly height: number
  readonly facingAngle: number
  readonly hitbox: Readonly<Required<NonNullable<EnemyOptions['hitbox']>>>
  readonly vision: Readonly<Required<NonNullable<EnemyOptions['vision']>>>
  readonly movement: Readonly<Required<NonNullable<EnemyOptions['movement']>>>
  readonly weapon: Readonly<Required<NonNullable<EnemyOptions['weapon']>>>
}

export const DEFAULT_ENEMY_CONFIG: EnemyConfig = Object.freeze({
  width: 48,
  height: 48,
  facingAngle: 0,
  hitbox: Object.freeze({ width: 48, height: 48, offsetX: 0, offsetY: 0 }),
  vision: Object.freeze({ range: 600, angleDegrees: 120 }),
  movement: Object.freeze({ speed: 240, stopDistance: 400 }),
  weapon: Object.freeze({ shotInterval: 1.2, initialDelay: 1.2, projectileSpeed: 450 }),
})

/** Resolve a separate immutable configuration and reject invalid spawn data early. */
export function resolveEnemyConfig(options: EnemyOptions): EnemyConfig {
  const width = options.width ?? DEFAULT_ENEMY_CONFIG.width
  const height = options.height ?? DEFAULT_ENEMY_CONFIG.height
  const hitboxWidth = options.hitbox?.width ?? width
  const hitboxHeight = options.hitbox?.height ?? height
  const shotInterval = options.weapon?.shotInterval ?? DEFAULT_ENEMY_CONFIG.weapon.shotInterval
  const config: EnemyConfig = {
    width,
    height,
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
    weapon: Object.freeze({
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
