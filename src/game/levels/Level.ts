import type { EnemyOptions, EnemyType } from '@/game/entities/EnemyConfig'
import type { WeaponOptions } from '@/game/entities/Weapon'

export interface Level {
  name: string
  worldWidth: number
  worldHeight: number
  playerSpawn: { x: number; y: number }
  floors: readonly { x: number; y: number; width: number; height: number; color: string }[]
  walls: readonly { x: number; y: number; width: number; height: number }[]
  enemies: readonly { x: number; y: number; options?: EnemyOptions }[]
  weapons: readonly { x: number; y: number; options?: WeaponOptions }[]
  stations?: readonly {
    type: EnemyType
    x: number
    y: number
    entry: { x: number; y: number }
    description: string
  }[]
}
