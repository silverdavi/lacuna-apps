// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Word list for the Wordle game. At least 100 five-letter words.
// CRANE is index 0, APPLE is index 1, for deterministic test selection.

export const WORDS: readonly string[] = [
  'CRANE', 'APPLE', 'BREAD', 'CHART', 'DREAM', 'EAGLE', 'FROST', 'GRAPE',
  'HOUSE', 'IVORY', 'JOLLY', 'KEBAB', 'LEMON', 'MANGO', 'NIGHT', 'OCEAN',
  'PIZZA', 'QUILT', 'ROCKY', 'SILKY', 'TUMOR', 'UNION', 'VIVID', 'WAGON',
  'YOUTH', 'ZEBRA', 'BRAVE', 'CLOUD', 'DUSKY', 'ELBOW', 'FLINT', 'GHOST',
  'HARSH', 'INDIE', 'JUMPY', 'KINDA', 'LATCH', 'MERCY', 'NOVEL', 'OPERA',
  'PRISM', 'QUAKE', 'REIGN', 'SORRY', 'TULIP', 'UMBRA', 'VENUE', 'WALTZ',
  'YIELD', 'ZESTY', 'ABOVE', 'BEACH', 'CHEER', 'DRIFT', 'EXACT', 'FORGE',
  'GLOWY', 'HONEY', 'INGOT', 'KNOCK', 'LUNCH', 'MIRTH', 'NOOSE', 'OPALE',
  'PARCH', 'QUEST', 'RIDGE', 'STORM', 'URBAN', 'VIRAL', 'WISPY', 'YACHT',
  'ZEALY', 'ACORN', 'BLOOM', 'CORAL', 'DELTA', 'EMBER', 'FABLE', 'GRACE',
  'HYPER', 'IRONY', 'JAZZY', 'KELLY', 'LIVID', 'MODAL', 'NIBBL', 'OVERT',
  'PLUME', 'RALLY', 'SPARK', 'TRUNK', 'UNITY', 'VAPOR', 'WREST', 'YOGAS',
  'ZOOMY', 'ABLES', 'BEAST', 'CRAFT', 'DROOP', 'EXERT', 'FIRTH', 'GUSTY',
  'HOBBY', 'INDEX', 'JOINT',
].map((w) => w.toUpperCase())
