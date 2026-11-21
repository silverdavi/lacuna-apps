export const COLS = 16
export const ROWS = 16
export const FOOD_COLUMN = 14

export type Vec = [number, number]

export interface Game {
  snake: Vec[]
  dir: Vec
  queued: Vec | null
  food: Vec
  score: number
}

export function createGame(): Game {
  const cx = Math.floor(COLS / 2)
  const cy = Math.floor(ROWS / 2)
  return {
    snake: [[cx, cy]],
    dir: [0, 0],
    queued: null,
    food: [cx + 1, cy],
    score: 0,
  }
}

export function isOpposite(a: Vec, b: Vec): boolean {
  return a[0] === -b[0] && a[1] === -b[1]
}

export function queueDirection(game: Game, dir: Vec): Game {
  const moving = game.dir[0] !== 0 || game.dir[1] !== 0
  if (!moving && isOpposite(dir, game.dir)) return game
  return { ...game, queued: dir }
}

export function isOutOfBounds(x: number, y: number): boolean {
  return x < 0 || x >= COLS || y < 0 || y >= ROWS
}

export function pickFood(occupied: Vec[], random: number): Vec {
  const taken = new Set(occupied.map(([x, y]) => y * COLS + x))
  const free: Vec[] = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(y * COLS + x)) free.push([x, y])
    }
  }
  const inColumn = free.filter(([x]) => x === FOOD_COLUMN)
  const pool = inColumn.length ? inColumn : free
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random * pool.length)))
  return pool[index] ?? [0, 0]
}

export function stepGame(game: Game, random: number): { game: Game; dead: boolean } {
  const dir = game.queued && !(game.dir[0] === 0 && game.dir[1] === 0) && isOpposite(game.queued, game.dir)
    ? game.dir
    : game.queued ?? game.dir
  if (dir[0] === 0 && dir[1] === 0) return { game, dead: false }
  const head = game.snake[0]
  const x = head[0] + dir[0]
  const y = head[1] + dir[1]
  const hitWall = isOutOfBounds(x, y)
  const ate = !hitWall && x === game.food[0] && y === game.food[1]
  const body = (ate ? game.snake : game.snake.slice(0, -1)) as Vec[]
  const newHead: Vec = [x, y]
  const snake = hitWall ? game.snake : ([newHead, ...body] as Vec[])
  const hitSelf = !hitWall && !ate && body.some(([bx, by]) => bx === x && by === y)
  const dead = hitWall || hitSelf
  const food = ate ? pickFood(snake, random) : game.food
  return {
    game: { snake, dir, queued: null, food, score: game.score + (ate ? 1 : 0) },
    dead,
  }
}
