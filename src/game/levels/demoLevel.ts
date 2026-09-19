/** World-space layout with a west-facing entrance and two targets on each side. */
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
    // { x: 1000, y: 200, width: 150, height: 20 },
    // { x: 1250, y: 200, width: 150, height: 20 },
    { x: 1000, y: 200, width: 400, height: 20 },
    { x: 1000, y: 200, width: 20, height: 420 },
    { x: 1380, y: 200, width: 20, height: 800 },
    { x: 600, y: 600, width: 420, height: 20 },
    { x: 600, y: 980, width: 800, height: 20 },
    { x: 600, y: 600, width: 20, height: 400 },
  ],
  enemies: [
    // { x: 900, y: 480 },
    // { x: 1070, y: 320 },
    // { x: 1280, y: 700 },
    // { x: 800, y: 700 },
    // { x: 800, y: 900 },
  ],
} as const
