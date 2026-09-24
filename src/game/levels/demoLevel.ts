import type { EnemyOptions } from '@/game/entities/EnemyConfig'

interface EnemySpawn {
  x: number
  y: number
  options?: EnemyOptions
}

/** World-space layout with per-enemy configuration examples. */
export const demoLevel = {
  playerSpawn: {
    x: 1180,
    y: 30,
  },
  floors: [
    { x: 1000, y: 200, width: 400, height: 400, color: '#263442' },
    { x: 600, y: 600, width: 800, height: 400, color: '#263442' },
  ],
  walls: [
    { x: 1000, y: 200, width: 150, height: 20 },
    { x: 1250, y: 200, width: 150, height: 20 },
    // { x: 1000, y: 200, width: 400, height: 20 },
    { x: 1000, y: 200, width: 20, height: 420 },
    { x: 1380, y: 200, width: 20, height: 800 },
    { x: 600, y: 600, width: 420, height: 20 },
    { x: 600, y: 980, width: 800, height: 20 },
    { x: 600, y: 600, width: 20, height: 400 },
  ],
  enemies: [
    // Facing degrees: 0 right, 90 down, 180 left, 270 (or -90) up.
    { x: 900, y: 480, options: { facingAngleDegrees: 180 } },
    {
      x: 800,
      y: 700,
      options: {
        width: 64,
        height: 64,
        facingAngleDegrees: 0,
        hitbox: { width: 48, height: 48 },
        vision: { range: 950, angleDegrees: 160 },
        weapon: { shotInterval: 0.6, initialDelay: 1.2, projectileSpeed: 550 },
      },
    },
  ] as readonly EnemySpawn[],
} as const
