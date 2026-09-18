# Camera2D

Camera2D describes a viewport in logical pixels. Its `position` is the top-left corner in world coordinates. Import it from `@/engine`.

```ts
const camera = new Camera2D(1280, 720)
camera.follow(playerCenterX, playerCenterY, 6000, 2000)
```

Call `follow` after movement and collision resolution. It centers the target and clamps the viewport to the world bounds. Worlds smaller than the viewport are anchored at the origin. Following is immediate on both axes, without smoothing.

Select the camera when drawing the world, then restore screen coordinates for UI:

```ts
renderer.setCamera(camera)
try {
  super.render(renderer)
} finally {
  renderer.setCamera(null)
}
renderer.drawText('Score: 0', 16, 16)
```

Renderer preserves display-density scaling when applying the camera. `clear()` restores screen coordinates before clearing each frame. Camera selection affects rectangles and text equally; it never changes entity positions or collision coordinates.

The demo uses a 6000 × 2000 world with a coordinate grid and WASD movement. GameScene clamps the player to the world and updates its camera after entities move. Only grid lines and labels around the viewport are generated; general entity culling is not implemented.

`resize(width, height)` updates the logical viewport. Engine forwards viewport changes through `Scene.resize`; GameScene resizes and recenters its camera while preserving gameplay state. The application listens for browser window resize events and removes the listener during hot-reload cleanup.
