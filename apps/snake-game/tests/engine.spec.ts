import { test, expect } from '@playwright/test'
import {
  COLS,
  ROWS,
  FOOD_COLUMN,
  createGame,
  isOpposite,
  queueDirection,
  isOutOfBounds,
  pickFood,
  stepGame,
  type Game,
  type Vec,
} from '../src/engine'

const moving = (g: Game, dir: Vec): Game => ({ ...g, dir, queued: null })

test('createGame centres the snake, parks the food on the food column, and scores zero', () => {
  expect(COLS).toBe(16)
  expect(ROWS).toBe(16)
  expect(FOOD_COLUMN).toBe(14)

  const g = createGame()
  expect(g.snake).toEqual([[8, 8]])
  expect(g.dir).toEqual([0, 0])
  expect(g.queued).toBeNull()
  expect(g.score).toBe(0)
  // food sits just right of centre, inside the board
  expect(g.food).toEqual([9, 8])
  expect(g.food[0]).toBeGreaterThanOrEqual(0)
  expect(g.food[0]).toBeLessThan(COLS)
  expect(g.food[1]).toBe(8)
})

test('isOpposite pairs only exact 180-degree reversals', () => {
  expect(isOpposite([0, -1], [0, 1])).toBe(true)
  expect(isOpposite([1, 0], [-1, 0])).toBe(true)
  expect(isOpposite([-1, 0], [1, 0])).toBe(true)
  expect(isOpposite([0, 1], [0, -1])).toBe(true)
  expect(isOpposite([0, -1], [1, 0])).toBe(false)
  expect(isOpposite([0, -1], [0, -1])).toBe(false)
  expect(isOpposite([0, 0], [0, 0])).toBe(true) // zero is its own opposite
})

test('queueDirection records a press and keeps the prior dir until the step', () => {
  const g = createGame()

  // stationary: any press queues a direction; the dir is not touched until the step
  const up = queueDirection(g, [0, -1])
  expect(up.queued).toEqual([0, -1])
  expect(up.dir).toEqual([0, 0])

  // moving up: left and right presses both queue a turn
  const movingUp = moving(g, [0, -1])
  expect(queueDirection(movingUp, [-1, 0]).queued).toEqual([-1, 0])
  expect(queueDirection(movingUp, [1, 0]).queued).toEqual([1, 0])

  // a queued turn is replaced by the latest press, not stacked
  const queued = queueDirection(queueDirection(g, [0, -1]), [1, 0])
  expect(queued.queued).toEqual([1, 0])
})

test('isOutOfBounds rejects every edge outside the 16x16 board', () => {
  expect(isOutOfBounds(0, 0)).toBe(false)
  expect(isOutOfBounds(COLS - 1, ROWS - 1)).toBe(false)
  expect(isOutOfBounds(-1, 0)).toBe(true)
  expect(isOutOfBounds(COLS, 0)).toBe(true)
  expect(isOutOfBounds(0, -1)).toBe(true)
  expect(isOutOfBounds(0, ROWS)).toBe(true)
})

test('pickFood always lands on a free cell, preferring the food column', () => {
  const occupied: Vec[] = []
  for (const r of [0.0, 0.5, 0.999, 1]) {
    const f = pickFood(occupied, r)
    expect(f[0]).toBe(FOOD_COLUMN) // the column is free at the start
    expect(f[1]).toBeGreaterThanOrEqual(0)
    expect(f[1]).toBeLessThan(ROWS)
  }

  // cover every cell of the food column except one; the survivor must be chosen
  const column: Vec[] = []
  for (let y = 0; y < ROWS; y++) if (y !== 3) column.push([FOOD_COLUMN, y])
  expect(pickFood(column, 0)).toEqual([FOOD_COLUMN, 3])
  expect(pickFood(column, 0.5)).toEqual([FOOD_COLUMN, 3])

  // fill the whole board but one cell; that cell is the only free one
  const allBut: Vec[] = []
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (!(x === 0 && y === 0)) allBut.push([x, y])
  expect(pickFood(allBut, 0.999)).toEqual([0, 0])
})

test('stepGame waits for movement, moves the head, and drops the tail', () => {
  const g = createGame()
  const still = stepGame(g, 0.5)
  expect(still.dead).toBe(false)
  expect(still.game).toBe(g) // no movement, same reference

  const up = moving(g, [0, -1])
  const one = stepGame(up, 0.5)
  expect(one.dead).toBe(false)
  expect(one.game.snake[0]).toEqual([8, 7]) // head moved up
  expect(one.game.snake).toHaveLength(1) // length 1, tail dropped with no growth
  expect(one.game.dir).toEqual([0, -1])
  expect(one.game.queued).toBeNull() // consumed
  expect(one.game.score).toBe(0)
})

test('a queued turn is applied at the step, and a queued reversal is refused', () => {
  const up = moving(createGame(), [0, -1])
  const turned = queueDirection(up, [-1, 0])
  expect(turned.queued).toEqual([-1, 0])

  // the queued turn is applied at the step: the head moves left, the dir becomes left
  const stepped = stepGame(turned, 0.5)
  expect(stepped.game.snake[0]).toEqual([7, 8])
  expect(stepped.game.dir).toEqual([-1, 0])

  // a 180 reversal (down while moving up) is refused at the step, so the snake keeps going up
  const reversed = { ...up, queued: [0, 1] as Vec }
  const kept = stepGame(reversed, 0.5)
  expect(kept.dead).toBe(false)
  expect(kept.game.snake[0]).toEqual([8, 7]) // still up
  expect(kept.game.dir).toEqual([0, -1])
})

test('eating food scores one, grows the snake, and re-places the food', () => {
  const g: Game = { snake: [[8, 8]], dir: [1, 0], queued: null, food: [9, 8], score: 0 }
  const { game, dead } = stepGame(g, 0.25)
  expect(dead).toBe(false)
  expect(game.score).toBe(1)
  expect(game.snake).toEqual([[9, 8], [8, 8]]) // grew to length 2
  expect(game.food[0]).toBe(FOOD_COLUMN) // new food, on the column
  // the new food must not sit on the snake
  const onSnake = game.snake.some(([x, y]) => x === game.food[0] && y === game.food[1])
  expect(onSnake).toBe(false)
})

test('hitting a wall is fatal and the snake is left untouched', () => {
  const g: Game = { snake: [[15, 8]], dir: [1, 0], queued: null, food: [0, 0], score: 3 }
  const { game, dead } = stepGame(g, 0.5)
  expect(dead).toBe(true)
  expect(game.snake).toEqual([[15, 8]]) // head did not pass the wall
  expect(game.score).toBe(3)
})

test('running into a long body is fatal, but chasing your own tail is not', () => {
  // a length-5 snake folding back on itself; the head moves down into its own body
  const g: Game = {
    snake: [[5, 5], [4, 5], [4, 6], [5, 6], [6, 6]],
    dir: [0, 1],
    queued: null,
    food: [0, 0],
    score: 0,
  }
  const { dead } = stepGame(g, 0.5)
  expect(dead).toBe(true)

  // the tail cell is vacated in the same step, so a snake can never hit its own tail
  const chase: Game = { snake: [[5, 8], [6, 8], [7, 8]], dir: [-1, 0], queued: null, food: [0, 0], score: 0 }
  const { dead: chaseDead } = stepGame(chase, 0.5)
  expect(chaseDead).toBe(false)

  // a length-1 snake can never hit itself
  const solo = moving(createGame(), [1, 0])
  expect(stepGame(solo, 0.5).dead).toBe(false)
})

test('stepGame returns a new object and never mutates its input', () => {
  const up = moving(createGame(), [0, -1])
  const snapshot = JSON.stringify(up)
  const { game } = stepGame(up, 0.5)
  expect(game).not.toBe(up)
  expect(JSON.stringify(up)).toBe(snapshot) // input untouched
  expect(up.snake).toEqual([[8, 8]])
  expect(up.queued).toBeNull()
})
