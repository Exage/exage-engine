import type { EnemyOptions, PatrolArea } from '@/game/entities/EnemyConfig'

/** Interior room bounds also constrain pursuit and investigation through open doors. */
const rooms = {
  lowerRoom: { x: 620, y: 620, width: 760, height: 360 },
  upperRoom: { x: 1020, y: 220, width: 360, height: 380 },
} as const satisfies Record<string, PatrolArea>

/** Reusable world-space patrol rectangles. */
const patrolAreas = {
  lowerRoom: rooms.lowerRoom,
  // Zone B can be assigned at spawn, but enemies must not adopt it after a search.
  upperRoom: { x: 1040, y: 260, width: 300, height: 280, allowSearchPatrol: false },
} as const satisfies Record<string, PatrolArea>

interface EnemySpawn {
  x: number
  y: number
  options?: EnemyOptions
}

/** World-space layout with per-enemy configuration examples. */
export const demoLevel = {
  name: 'Demo',
  worldWidth: 6000,
  worldHeight: 2000,
  weapons: [],
  patrolAreas,
  rooms,
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
    // Interior divider leaves passages at both ends for enemy navigation.
    { x: 1040, y: 720, width: 20, height: 160 },
  ],
  enemies: [
    // Facing degrees: 0 right, 90 down, 180 left, 270 (or -90) up.
    {
      x: 900,
      y: 480,
      options: {
        facingAngleDegrees: 180,
        behavior: { mode: 'guard' },
        search: { after: 'return' },
        vision: { range: 1000, angleDegrees: 190 },
      },
    },
    {
      x: 760,
      y: 680,
      options: {
        facingAngleDegrees: 0,
        room: rooms.lowerRoom,
        behavior: {
          mode: 'patrol',
          area: patrolAreas.lowerRoom,
          speed: 100,
          route: 'perimeter',
        },
        search: {
          after: 'nearest-patrol',
          patrolAreas: [patrolAreas.lowerRoom, patrolAreas.upperRoom],
        },
        vision: { range: 1000, angleDegrees: 210 },
        weapon: { shotInterval: 0.6, initialDelay: 1.2, projectileSpeed: 550 },
      },
    },
  ] as readonly EnemySpawn[],
} as const
