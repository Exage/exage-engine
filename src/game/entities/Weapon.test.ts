import { describe, expect, it } from 'vitest'
import { HitboxWorld, Input } from '@/engine'
import { Enemy } from '@/game/entities/Enemy'
import { Player } from '@/game/entities/Player'
import { Wall } from '@/game/entities/Wall'
import { Weapon } from '@/game/entities/Weapon'

describe('Weapon ownership and ammunition', () => {
  it('keeps ammo and cooldown on the same weapon when transferring between actors', () => {
    const player = new Player(new Input())
    const enemy = new Enemy(100, 100, { weapon: null })
    const weapon = new Weapon(0, 0, { ammo: 2, initialDelay: 0, shotInterval: 0.5 })
    expect(weapon.equip(player)).toBe(true)
    const shot = weapon.fire()!
    expect(shot.owner).toBe(player)
    expect(weapon.ammo).toBe(1)
    expect(weapon.fire()).toBeNull()
    expect(weapon.equip(enemy)).toBe(false)
    weapon.drop()
    expect(player.weapon).toBeNull()
    expect(weapon.owner).toBeNull()
    expect(weapon.equip(enemy)).toBe(false)
    weapon.update(0.4)
    expect(weapon.equip(enemy)).toBe(true)
    expect(enemy.weapon).toBe(weapon)
    expect(weapon.ammo).toBe(1)
    expect(weapon.fire()).toBeNull()
    weapon.advance(0.1)
    expect(weapon.fire()?.owner).toBe(enemy)
    expect(weapon.ammo).toBe(0)
    weapon.advance(5)
    expect(weapon.fire()).toBeNull()
  })

  it('counts rounds separately across dropped and exchanged weapons', () => {
    const player = new Player(new Input())
    const pistol = new Weapon(0, 0, { ammo: 3, initialDelay: 0 })
    const rifle = new Weapon(0, 0, { kind: 'rifle', ammo: 9, initialDelay: 0 })
    pistol.equip(player)
    pistol.fire()
    pistol.drop()
    rifle.equip(player)
    rifle.fire()
    expect(pistol.ammo).toBe(2)
    expect(rifle.ammo).toBe(8)
    rifle.drop()
    pistol.update(0.5)
    pistol.equip(player)
    expect(player.weapon?.ammo).toBe(2)
  })

  it('requires proximity and a clear path for pickup and excludes dogs and dead actors', () => {
    const player = new Player(new Input())
    const weapon = new Weapon(70, 20)
    const wall = new Wall(45, -100, 4, 200)
    const world = new HitboxWorld([player, wall, weapon])
    expect(weapon.canPickup(player, world)).toBe(false)
    wall.collider.enabled = false
    expect(weapon.canPickup(player, world)).toBe(true)
    weapon.transform.position.x = 90
    expect(weapon.canPickup(player, world)).toBe(false)
    const dog = new Enemy(0, 0, { type: 'dog' })
    expect(weapon.equip(dog)).toBe(false)
    player.die()
    expect(weapon.equip(player)).toBe(false)
  })

  it('uses the picked weapon projectile speed, interval, and current owner', () => {
    const enemy = new Enemy(0, 0, { weapon: null, movement: { speed: 0 } })
    const player = new Player(new Input())
    player.transform.position.set(300, 4)
    const world = new HitboxWorld([enemy, player])
    expect(enemy.attack(1, player, world)).toBeNull()
    const weapon = new Weapon(0, 0, {
      projectileSpeed: 900,
      shotInterval: 0.2,
      initialDelay: 0,
      ammo: 2,
    })
    weapon.equip(enemy)
    const shot = enemy.attack(0, player, world)!
    expect(shot.owner).toBe(enemy)
    shot.update(0.1)
    expect(shot.transform.position.x).toBeCloseTo(114)
    expect(enemy.attack(0.1, player, world)).toBeNull()
    expect(enemy.attack(0.1, player, world)).not.toBeNull()
    expect(enemy.attack(10, player, world)).toBeNull()
  })
})
