# Enemy configuration and vision

`Enemy` is a shooter with directional sight that patrols a rectangle or guards its position until it sees a player. Both modes approach and shoot visible players. Each spawn accepts optional settings; omitted fields retain defaults, including inside `vision`, `movement`, `weapon`, and `hitbox`. Configuration is validated and copied into an immutable `enemy.config` snapshot.

Sources: [Enemy.ts](../../src/game/entities/Enemy.ts), [EnemyConfig.ts](../../src/game/entities/EnemyConfig.ts), [EnemyNavigation.ts](../../src/game/entities/EnemyNavigation.ts), and [demoLevel.ts](../../src/game/levels/demoLevel.ts).

## Enemy types

Set `EnemyOptions.type` to `idle`, `patrol`, `random`, `fat`, or `dog`. Existing spawns without a type retain their previous guard/patrol settings.

- `idle` stands until detecting a player, then approaches within 100 pixels. Its default sight covers 360 degrees; walls still block detection.
- `patrol` takes a `room` and defaults to `behavior: { mode: 'patrol', area: room, route: 'perimeter' }`. It repeatedly visits the rectangle's four corners in clockwise order, turning along each side. Pursuit interrupts the route; after searching it returns to the saved destination.
- `random` defaults to `behavior: { mode: 'random', speed: 100 }`. It walks on a randomly selected diagonal for 1.5–2.5 seconds, then rests for 0.5–2 seconds, with a 50% chance of looking around. Walls end the current walk. After pursuit and investigation it resumes wandering.
- `fat` has a 64 × 64 purple body, 150 px/s pursuit speed, and three health points. The first hit starts a 2.5-second bleeding timer while movement and attacks continue. Three hits cause immediate defeat; subsequent hits do not extend bleeding. Wounded bodies turn yellow.
- `dog` has a 44 × 28 brown body and charges at 650 px/s until contact. It kills through `Player.die()` and respects development invulnerability. A supplied room gives it a perimeter patrol; an explicit patrol behavior can define another route. Dogs cannot equip weapons.

All human enemies need a held [Weapon](Weapons.md) to fire. A starting weapon is a distinct entity, and `weapon: null` spawns an unarmed human. Defeat drops the held weapon, preserving its ammo and cooldown. `receiveHit()` applies damage; the existing `hit` property still directly sets defeat. `health` and `bleedRemaining` expose damage state. The [AI lab](Enemy%20AI%20Lab.md) exercises all five types and automatic enemy pickup.

## Defaults

| Setting                            | Default                           | Meaning                                                                                    |
| ---------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `width`, `height`                  | 48 × 48                           | Visual body dimensions in world pixels.                                                    |
| `facingAngleDegrees`               | 0                                 | Initial clockwise direction in degrees: 0 right, 90 down, 180 left, 270 (or -90) up.       |
| `facingAngle`                      | 0                                 | Initial direction in radians: 0 right, PI / 2 down, PI left, -PI / 2 up.                   |
| `hitbox.width`, `hitbox.height`    | Body dimensions                   | Damage region that follows body position and rotation.                                     |
| `hitbox.offsetX`, `hitbox.offsetY` | Centered in body                  | Local offsets from the body's top-left corner.                                             |
| `vision.range`                     | 600                               | Maximum distance between enemy and player centers.                                         |
| `vision.angleDegrees`              | 120                               | Full viewing angle in degrees; 360 enables all directions.                                 |
| `behavior.mode`                    | `guard`                           | `guard` waits in place; `patrol` walks around its configured area.                         |
| `behavior.area`                    | Required for patrol               | World-space rectangle `{ x, y, width, height }` containing the unrotated body footprint.   |
| `behavior.speed`                   | 100 for patrol                    | Patrol walking speed in world pixels per second; 0 disables walking.                       |
| `behavior.route`                   | `perimeter`                       | `perimeter` follows corners; `wall-to-wall` crosses between opposite sides and wall faces. |
| `room`                             | Wall-to-wall area, otherwise none | Rectangle constraining patrol, pursuit, investigation, relocation, and return.             |
| `movement.speed`                   | 240                               | Chase speed in world pixels per second; 0 disables pursuit movement.                       |
| `movement.stopDistance`            | 400                               | Stop approaching at this distance between enemy and player centers.                        |
| `weapon.shotInterval`              | 1.2                               | Seconds between shots; smaller values fire faster.                                         |
| `weapon.initialDelay`              | Shot interval                     | Delay after spawning before firing is allowed.                                             |
| `weapon.projectileSpeed`           | 450                               | Projectile speed in world pixels per second.                                               |

Dimensions, shot interval, and projectile speed must be finite and positive. Sight range, movement speed, stopping distance, and initial delay must be finite and non-negative and can be zero. The viewing angle must be between 0 and 360. A zero range or angle disables vision. Invalid settings throw `RangeError` at construction.

## Adding enemies

Add a spawn to `demoLevel.enemies`; `GameScene` forwards its `options` to the constructor and reapplies them on restart:

```ts
{
  x: 1280,
  y: 700,
  options: {
    width: 64,
    height: 64,
    facingAngleDegrees: 180,
    hitbox: { width: 48, height: 48 },
    vision: { range: 950, angleDegrees: 160 },
    weapon: { shotInterval: 0.6, initialDelay: 1.2, projectileSpeed: 550 },
  },
}
```

This larger enemy sees farther and wider, fires twice as often, and has a smaller, centered hitbox. A minimal spawn such as `{ x: 900, y: 480 }` uses all defaults. Reusable `EnemyOptions` objects can serve as presets for multiple spawns; each enemy receives its own configuration snapshot.

Set `options.facingAngleDegrees` on each spawn to choose its initial rotation. Any finite angle is accepted, including diagonal angles such as 45 and negative angles. The body, barrel, and viewing sector start in this direction; tracking can turn the enemy after it detects the player. Restarting restores the configured initial angle. The radians option `facingAngle` remains supported; `facingAngleDegrees` takes precedence when both are supplied. Internally, `enemy.config.facingAngle` and `enemy.transform.rotation` use radians.

Outside the demo level, use `new Enemy(x, y, options)`. Add it to both the scene and `GameScene.enemies` when spawning dynamically so it participates in hit queries, attacks, and the vision overlay. Set `enemy.transform.rotation` to change its current facing direction. Body dimensions and hitboxes are configured at construction, independently of `transform.scale`.

## Perception, pursuit, and attacks

Before aiming, the enemy checks whether the player's center is within range and within half the viewing angle on either side of its current direction. A sight ray must then reach an enabled player hitbox without hitting an attack-blocking collider. Other enemies do not obstruct sight; disabled colliders, triggers, and colliders with `blocksHits = false` are ignored.

Visible players are tracked immediately, even during weapon cooldown. When the player is farther than `movement.stopDistance`, the enemy approaches at `movement.speed`. It stays still when the player is already closer and does not retreat. After losing sight, it investigates the last observed player center without tracking hidden movement. Once that destination, or its constrained room boundary, is reached, it performs `search.after`. Unreachable investigation destinations also end the search instead of keeping the enemy walking into a wall. Neither mode shoots without sight. `canSee(player, world)` performs a fresh query, while `playerVisible` records the result of the most recent attack update. Defeating an enemy clears its visibility state and disables its hitboxes.

`GameScene` calls `attack(dt, player, world, entities)`. The entity list defaults to `world.entities` for standalone calls. Enemies have no physical collider, so characters cannot push or block them. Game-owned navigation blocks movement against enabled, non-trigger `Wall` colliders, including walls with `blocksHits = false`. Walls still block vision and projectiles according to their hit-query settings. Sight and firing clearance are checked again from the new position, and projectiles originate there. Defeated enemies and game over disable movement.

The body and held weapon rotate together with the viewing direction. Unarmed humans have no barrel. The barrel scales with the configured body dimensions and makes the facing direction visible without the debug overlay. The body turns orange while the player is visible, returns to red when sight is lost, and becomes gray after defeat. The damage hitbox follows the body position and rotation around the visual body center. Custom hitbox offsets rotate around the same center, keeping the region attached to the body.

Cooldown runs while the enemy is alive, including while no player is visible. After cooldown expires, a visible player can be fired at immediately. Firing also checks clearance for the full 8 × 8 projectile. At most one shot is emitted per update; there is no burst of accumulated shots after a slow frame. Game over stops attack updates.

## Patrol areas and guards

Define reusable rectangles in `demoLevel.ts` under `patrolAreas`, then assign one to each patrolling spawn:

```ts
const patrolAreas = {
  lowerRoom: { x: 760, y: 680, width: 540, height: 240 },
}

// Patrol the lower room and chase any visible player.
const patroller = new Enemy(760, 680, {
  behavior: { mode: 'patrol', area: patrolAreas.lowerRoom, speed: 100 },
  movement: { speed: 240, stopDistance: 400 },
})

// Wait while looking left; chase and shoot once a player enters sight.
const guard = new Enemy(900, 480, {
  behavior: { mode: 'guard' },
  facingAngleDegrees: 180,
})
```

The rectangle uses world pixels. Its width and height must each exceed the enemy's body dimensions, and all coordinates must be finite. The default `perimeter` route visits top-left, top-right, bottom-right, and bottom-left corners clockwise, beginning at the nearest corner. In rooms or next to outer walls, destinations include the full rotation envelope and a 0.01-pixel clearance so corners remain reachable. Wall geometry changes refresh these destinations without resetting the saved corner. Walking speed must be finite and non-negative and is independent of chase speed. Navigation detours can leave this patrol rectangle unless a `room` is configured.

Seeing a player interrupts patrol. The enemy preserves its next waypoint during pursuit and investigation, then resumes it when `search.after` is `return`. Configured rooms prevent pursuit through an open doorway into another room. Search patrol zones outside the home room are excluded. Unreachable patrol stops are skipped; if no stop is reachable, the enemy stays still. Restarting reconstructs the original route and spawn settings.

## Wall-to-wall patrol and rooms

```ts
const room = { x: 620, y: 620, width: 760, height: 360 }
const enemy = new Enemy(760, 680, {
  room,
  behavior: { mode: 'patrol', area: room, route: 'wall-to-wall', speed: 100 },
  search: { after: 'return' },
})
```

`straight` reverses between left/right wall faces on the original spawn line. `wall-to-wall` visits opposite left/right and top/bottom room sides, then available wall faces inside the patrol area. It starts at the closest stop. Interior obstacles are bypassed rather than changing the destination. If `room` is omitted for this route, `behavior.area` becomes the home room. Guards and perimeter patrols can also receive an explicit `room`.

Room rectangles describe the walkable interior, excluding outer wall thickness. Each dimension must exceed the body's diagonal, and the initial spawn must fit inside at every rotation. Patrol, pursuit, investigation, return, and wall relocation all respect the same room. A player outside the room can still be seen and shot, but the enemy stops at the interior boundary. Zero walking speed, zero time steps, and defeat freeze movement.

Navigation uses a visibility graph of expanded wall corners and Dijkstra's shortest-path search. The movement envelope is a square whose side equals the body's diagonal, so rotating the visual body cannot clip walls or room edges. Thin walls are checked continuously along each route segment. Rotated walls use their axis-aligned enclosures; this deliberately reserves extra clearance and can reject tight passages that the visual body might otherwise fit through. Characters are excluded from navigation.

Routes are retained between frames and rebuilt when the destination or wall geometry changes, a wall is enabled/disabled or becomes a trigger, or the enemy is teleported. Movement carries its remaining distance through route corners and patrol stops on slow frames. If the start is inside a newly added wall, the enemy holds rather than moving through it; authored spawns must be clear of walls.

The demo's lower room uses perimeter patrol and an interior divider with passages at both ends. The outside guard remains unrestricted because it has no home room.

## Search actions

`search.after` defaults to `return`, restoring a guard's original post or a patroller's saved route. `nearest-patrol` selects from `search.patrolAreas`, independently of sight, excluding areas outside the home room. If the nearest zone has `allowSearchPatrol = false`, it falls back to a wall. `nearest-wall` finds a reachable wall destination within `search.wallSearchRange` (default 1000), leaves `search.wallClearance` (default 8) beyond the rotation-safe envelope, turns away, and holds. If no eligible destination exists, the enemy holds its position. `search.speed` (default 100) controls return and relocation. All search speeds and distances must be finite and non-negative.

The demo level is authored in TypeScript; there is no interactive level editor. One rectangle can be shared by multiple enemy spawns; each receives an independent immutable copy and its own route progress.

## Debug view

Press **Command+C** to toggle vision sectors and blue patrol-area rectangles together with the existing collider and hitbox outlines. Patrol rectangles stay at their configured world positions during pursuit. Sectors follow the camera and use the same center, range, angle, and direction as perception. Yellow indicates idle sight; orange indicates a visible player. Defeated enemies and enemies with disabled sight have no sector.

The sector shows the configured geometric field of view and is not clipped by walls. Actual detection additionally checks wall occlusion. See [Debug Overlay](Debug%20Overlay.md).
