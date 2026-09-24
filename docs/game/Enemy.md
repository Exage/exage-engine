# Enemy configuration and vision

`Enemy` is a shooter with directional sight that approaches visible players. Each spawn accepts optional settings; omitted fields retain defaults, including inside `vision`, `movement`, `weapon`, and `hitbox`. Configuration is validated and copied into an immutable `enemy.config` snapshot.

Sources: [Enemy.ts](../../src/game/entities/Enemy.ts), [EnemyConfig.ts](../../src/game/entities/EnemyConfig.ts), and [demoLevel.ts](../../src/game/levels/demoLevel.ts).

## Defaults

| Setting                            | Default          | Meaning                                                                              |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `width`, `height`                  | 48 × 48          | Visual body dimensions in world pixels.                                              |
| `facingAngleDegrees`               | 0                | Initial clockwise direction in degrees: 0 right, 90 down, 180 left, 270 (or -90) up. |
| `facingAngle`                      | 0                | Initial direction in radians: 0 right, PI / 2 down, PI left, -PI / 2 up.             |
| `hitbox.width`, `hitbox.height`    | Body dimensions  | Independent damage region, axis-aligned.                                             |
| `hitbox.offsetX`, `hitbox.offsetY` | Centered in body | Local offsets from the body's top-left corner.                                       |
| `vision.range`                     | 600              | Maximum distance between enemy and player centers.                                   |
| `vision.angleDegrees`              | 120              | Full viewing angle in degrees; 360 enables all directions.                           |
| `movement.speed`                   | 240              | Chase speed in world pixels per second; 0 disables movement.                         |
| `movement.stopDistance`            | 400              | Stop approaching at this distance between enemy and player centers.                  |
| `weapon.shotInterval`              | 1.2              | Seconds between shots; smaller values fire faster.                                   |
| `weapon.initialDelay`              | Shot interval    | Delay after spawning before firing is allowed.                                       |
| `weapon.projectileSpeed`           | 450              | Projectile speed in world pixels per second.                                         |

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

Visible players are tracked immediately, even during weapon cooldown. When the player is farther than `movement.stopDistance`, the enemy approaches at `movement.speed`, stopping at the configured distance without overshooting on a slow frame. It resumes approaching if the visible player moves farther away, and stays still if the player is already closer; it does not retreat. Hidden players do not change the enemy's direction; it retains its last heading and stops moving and shooting. There is no patrol, search, or memory of the player's position yet. `canSee(player, world)` performs a fresh query, while `playerVisible` records the result of the most recent attack update. Defeating an enemy clears its visibility state and disables its hitboxes.

`GameScene` supplies its collision world to `attack(dt, player, world, collisions)`. Pursuit uses a private, axis-aligned box sized to the visual body to stop and slide against solid obstacles, including thin walls. Enemies remain passable to other characters. There is no pathfinding around obstacles. Sight and firing clearance are checked again from the new position, and projectiles originate there. Defeated enemies and game over disable pursuit.

The body and barrel rotate together with the viewing direction. The barrel scales with the configured body dimensions and makes the facing direction visible without the debug overlay. The body turns orange while the player is visible, returns to red when sight is lost, and becomes gray after defeat. The damage hitbox remains axis-aligned and independent of this visual rotation.

Cooldown runs while the enemy is alive, including while no player is visible. After cooldown expires, a visible player can be fired at immediately. Firing also checks clearance for the full 8 × 8 projectile. At most one shot is emitted per update; there is no burst of accumulated shots after a slow frame. Game over stops attack updates.

## Debug view

Press **Command+C** to toggle vision sectors together with the existing collider and hitbox outlines. Sectors follow the camera and use the same center, range, angle, and direction as perception. Yellow indicates idle sight; orange indicates a visible player. Defeated enemies and enemies with disabled sight have no sector.

The sector shows the configured geometric field of view and is not clipped by walls. Actual detection additionally checks wall occlusion. See [Debug Overlay](Debug%20Overlay.md).
