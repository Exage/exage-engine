import type { EnemyType, PatrolArea } from '@/game/entities/EnemyConfig'
import type { Level } from '@/game/levels/Level'

const types: readonly EnemyType[] = ['idle', 'patrol', 'random', 'fat', 'dog']
const descriptions = [
  'Waits, detects, then pursues. Break sight behind cover.',
  'Loops around a rectangle. Picks up a gun on its route.',
  'Diagonal wandering, random pauses and optional looking.',
  'Three hits, or one hit followed by 2.5 seconds of bleeding.',
  'Patrols, charges on sight, kills on contact. No gun.',
]

const rooms = types.map((_, index): PatrolArea => ({
  x: 100 + index * 720,
  y: 240,
  width: 620,
  height: 640,
}))

/** Five isolated rooms with a safe connecting corridor and weapon racks. */
export const enemyTestLevel: Level = {
  name: 'Enemy AI lab',
  worldWidth: 3800,
  worldHeight: 1400,
  playerSpawn: { x: 390, y: 1000 },
  floors: [
    { x: 60, y: 910, width: 3680, height: 360, color: '#23394a' },
    ...rooms.map((room, index) => ({ ...room, color: index === 3 ? '#372a40' : '#273440' })),
  ],
  walls: rooms.flatMap((room) => [
    { x: room.x - 20, y: room.y - 20, width: room.width + 40, height: 20 },
    { x: room.x - 20, y: room.y, width: 20, height: room.height + 20 },
    { x: room.x + room.width, y: room.y, width: 20, height: room.height + 20 },
    { x: room.x, y: room.y + room.height, width: 220, height: 20 },
    { x: room.x + 400, y: room.y + room.height, width: 220, height: 20 },
    // Cover blocks sight; leave generous passages for every body size.
    { x: room.x + 110, y: room.y + 360, width: 110, height: 30 },
  ]),
  enemies: rooms.map((room, index) => ({
    x: room.x + 290,
    y: room.y + 160,
    options: {
      type: types[index]!,
      room,
      facingAngleDegrees: 90,
      vision: { range: 460, angleDegrees: types[index] === 'idle' ? 360 : 120 },
      weapon:
        types[index] === 'patrol' || types[index] === 'dog'
          ? null
          : { ammo: 18, shotInterval: 0.9, projectileSpeed: 450 },
    },
  })),
  weapons: rooms.flatMap((room, index) => [
    { x: room.x + 310, y: 1050, options: { kind: 'pistol' as const, ammo: 12, initialDelay: 0 } },
    { x: room.x + 450, y: 1050, options: { kind: 'rifle' as const, ammo: 30, initialDelay: 0 } },
    ...(index === 1
      ? [
          {
            x: room.x + room.width / 2,
            y: room.y + 34,
            options: { ammo: 8, shotInterval: 0.8, projectileSpeed: 450, initialDelay: 0 },
          },
        ]
      : []),
  ]),
  stations: rooms.map((room, index) => ({
    type: types[index]!,
    x: room.x + 20,
    y: room.y + 30,
    entry: { x: room.x + 290, y: 990 },
    description: descriptions[index]!,
  })),
}
