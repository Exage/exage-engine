# Colliders and collision queries

The engine supports rectangular colliders with optional rotation through `BoxCollider` and a scene-owned `CollisionWorld`. Import them from `@/engine`. Each entity can have one optional collider; entities without one do not participate.

## Adding an obstacle

```ts
import { BoxCollider, Entity, Scene } from '@/engine'
import type { Renderer } from '@/engine'

class Wall extends Entity {
  override readonly collider: BoxCollider = new BoxCollider(this, 200, 20)

  override render(renderer: Renderer): void {
    const { x, y, width, height } = this.collider.bounds
    renderer.drawRect(x, y, width, height, '#697789')
  }
}

const scene = new Scene()
const wall = new Wall()
wall.transform.position.set(300, 200)
scene.add(wall)
```

Add a wall to the active `GameScene` to block both the player and projectiles. A room can be assembled from wall segments with gaps for entrances.

## BoxCollider

`new BoxCollider(entity, width, height, offsetX = 0, offsetY = 0)` uses positive finite dimensions and finite offsets, measured in logical pixels. Its getters read the owner's current transform on every query. Scale does not affect collision geometry.

- `followRotation = false` is the default: the collider stays aligned with the world axes.
- `followRotation = true` uses `entity.transform.rotation`, in radians, around the collider's own center. Offsets still locate the unrotated box relative to the entity position; the center does not orbit the entity origin.
- `shape` returns the exact unrotated top-left position, dimensions, and rotation.
- `bounds` returns the enclosing axis-aligned rectangle, useful for world boundaries. It is not the exact shape of a rotated collider.

```ts
obstacle.collider.followRotation = true
wall.collider.followRotation = false
```

The engine setting can change at runtime, and each collider has its own value. The demo player's collider stays axis-aligned, while its visual body and hitbox rotate. There is no gameplay toggle for collider rotation. Press **Command+C** to see the green collider outline. Directly changing the engine property does not validate placement.

- `enabled = false` excludes the collider from queries and blocking.
- `isTrigger = true` keeps overlap detection but disables blocking.
- `blocksHits = false` excludes the collider from attack blocking without changing physical movement. It defaults to true; characters using separate [hitboxes](Hitboxes.md) generally set it to false.
- `overlaps(other)` reports strict overlap with another enabled collider. Touching edges and self-comparisons do not count.

Assign the collider to `entity.collider` and add the entity to the scene. The collision world reads the scene's live entity array, so additions, removals, collider replacements, and flag changes take effect on the next query.

## Movement and queries

`scene.collisions.move(collider, dx, dy)` changes the owning entity's position. It sweeps along the displacement, stops at the first solid contact, and slides along the contact surface, including inclined walls. Thin walls cannot be skipped by moving past them in one frame. Simple initial overlaps are separated using the shortest translation, with at most eight recovery iterations; impossible or crowded spawn layouts require game-side placement validation.

```ts
scene.collisions.move(player.collider, velocityX * dt, velocityY * dt)
const overlapping = scene.collisions.overlaps(player.collider)
const contact = scene.collisions.cast(player.collider, 100, 0)

if (contact) {
  // contact.time is a fraction of the requested movement, from zero to one.
  console.log(contact.collider.entity, contact.time, contact.normalX, contact.normalY)
}
```

`overlaps()` includes triggers. `cast()` returns the nearest enabled solid collider and does not move anything. Disabled colliders and trigger colliders move freely and return no blocking cast result. Both queries exclude the supplied collider itself.

The exported `overlaps(a, b)` and `sweepAABB(a, b, dx, dy)` functions operate on plain `{ x, y, width, height }` bounds. A sweep returns a contact fraction and surface normal, or `null`. Initial overlaps return time zero and a zero normal. Tangential motion along a touching edge and paths that only graze a corner do not block.

For rotated shapes, `boxPenetration(a, b)` returns the minimum separating translation or `null`, and `sweepBox(a, b, dx, dy)` returns the first contact. Both use `OrientedBox` values with a `rotation` field and test the actual oriented rectangles on their separating axes. CollisionWorld and projectiles use these functions for both rotation modes. Overlap comparisons tolerate numerical errors up to 1e-8 logical pixels.

## Integration and limits

The demo player has a fixed 40 × 40 collider with `blocksHits = false` and receives its scene's collision world. Enemies have no physical colliders, so the player can pass through them. Both player and enemies expose separate body hitboxes. Projectiles use an 8 × 8 query shape centered on their position and sweep from their previous position through `Scene.hitboxes`. They stop at the nearest hitbox or attack-blocking collider. Active enemies turn gray and disable their hitboxes when hit. The firing player is excluded from projectile hit checks.

Collision handling is explicit: changing `transform.position` directly bypasses blocking. Scene updates do not automatically resolve arbitrary entities. Sweeps hold each shape's orientation fixed for that translation, and other colliders are treated as stationary. Rotation changes do not sweep through intermediate angles. This is a kinematic system, not a rigid-body solver. Trigger events, circles, restitution, mass, collision layers, and spatial indexing are not implemented. Trigger overlap queries describe the current position, not all triggers crossed during fast movement.
