# Hitboxes

`Hitbox` is a named rectangular target region owned by an Entity. A hitbox uses the engine's existing oriented-box geometry but never blocks movement. `Scene.hitboxes` is a `HitboxWorld` that queries the scene's live entities. Damage, health, armor, teams, and reactions remain game-owned.

## Define a target

```ts
import { BoxCollider, Entity, Hitbox, Scene } from '@/engine'

const scene = new Scene()
const actor = new Entity()
actor.transform.position.set(300, 200)
actor.collider = new BoxCollider(actor, 30, 30, 5, 5)
actor.collider.blocksHits = false
actor.hitboxes.push(
  new Hitbox(actor, {
    id: 'body',
    width: 40,
    height: 40,
    followRotation: true,
  })
)
scene.add(actor)
```

`blocksHits = false` keeps the physical collider solid for movement while letting attacks use the hitboxes. Ordinary walls keep the default `blocksHits = true` and stop attacks. This distinction is explicit: adding a hitbox does not change a collider's settings. An entity can have hitboxes without any physical collider.

## Hitbox settings

`new Hitbox(entity, options)` accepts:

| Option               | Meaning                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `id`                 | Required nonempty region name, such as `body` or `head`.          |
| `width`, `height`    | Required positive finite dimensions in logical pixels.            |
| `offsetX`, `offsetY` | Unrotated top-left offset from the entity position; default zero. |
| `followRotation`     | Follow the owner's rotation in radians; default true.             |
| `pivotX`, `pivotY`   | Local rotation pivot; defaults to this hitbox's center.           |

Attach each hitbox to its owner's `hitboxes` array. Multiple hitboxes are supported; choose distinct names when game rules distinguish regions. For a head and torso that rotate together, give both the same local pivot, such as `(20, 20)` for a 40 × 40 character. Offsets then rotate around that shared pivot. Transform scale is not applied.

`enabled` and `followRotation` can change at runtime. The `shape` getter returns the exact oriented rectangle at the current owner transform. `bounds` returns its enclosing axis-aligned rectangle. Disabling a physical collider does not disable hitboxes, and disabling a hitbox does not affect movement.

## Sweep an attack

```ts
const projectileShape = { x: 0, y: 210, width: 8, height: 8, rotation: 0 }
const result = scene.hitboxes.cast(projectileShape, 500, 0)

if (result?.kind === 'hitbox') {
  // Game code can use this region name to select damage rules.
  console.log(result.entity, result.hitbox.id)
} else if (result?.kind === 'blocker') {
  // The attack reaches this obstacle before reaching a target.
  console.log(result.entity, result.collider)
}
```

`cast(shape, dx, dy, options?)` sweeps the supplied oriented rectangle along a displacement and returns the nearest enabled hitbox or solid collider with `blocksHits = true`. Trigger colliders and disabled colliders do not block attacks. Thin targets crossed between frames are detected. The method only queries; it does not move, damage, or remove anything.

Every result contains `entity`, `time`, `normalX`, `normalY`, and `position`. `time` is the fraction of the displacement at impact. `position` is the **center of the moving query shape at impact**, not an exact point on the target surface. The discriminated `kind` selects either `hitbox` or `collider`. No contact returns `null`; initial overlap returns time zero and a zero normal.

At exactly equal contact times, a blocker takes priority over another entity's hitbox. A hitbox takes priority over its own collider, allowing a damageable wall to use matching geometry. Ties between hitboxes use scene/array order.

The optional query settings are:

- `ignore: entity` excludes the attack owner and its collider, preventing self-hits.
- `filter: (entity) => boolean` supplies game-owned eligibility rules. Returning false excludes both the entity's hitboxes and its collider from that query.

## Overlap queries

`scene.hitboxes.overlaps(shape, options?)` returns all enabled regions currently overlapping a shape. It supports the same owner exclusion and filter. Touching edges do not count. This is a snapshot query: it does not sweep movement or account for walls between the attacker and target. Game code must select or deduplicate regions as appropriate for melee and area attacks.

Both queries observe additions, removals, and enable/disable changes on the next call. Registering a Hitbox does not register a physical collider. Queries treat targets as stationary at their current transforms and keep orientations fixed during each sweep. Continuous angular collision and moving-target relative sweeps are not implemented.

## Demo integration

The player and enemies each have one `body` hitbox. The player's body follows its visual rotation while its physical collider stays axis-aligned. Enemies have no physical colliders; their hitboxes stay aligned with their unrotated rendering. Projectiles query `Scene.hitboxes`, ignore their firing player, and stop at the first target or wall. The game's existing reaction turns a hit enemy gray and disables its hitboxes. Setting the enemy's `hit` flag back to false re-enables its regions. There is no health system in the engine.

Press **Command+C** to toggle debug outlines: physical colliders are green and hitboxes are purple (`#c084fc`). Hitbox outlines use a thinner line so matching collider edges remain visible. Disabled hitboxes are omitted.
