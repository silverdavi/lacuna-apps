// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/text-transforms 0.1.0: snapshot of lacuna-components textTransforms at 6e67435 by sync-toolbox-components.py; a change gets a new version.
export function toUpper(text: string): string {
  return text.toUpperCase();
}

export function toLower(text: string): string {
  return text.toLowerCase();
}

export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word === '' ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

function splitWords(text: string): string[] {
  const words = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word !== '');
  return words;
}

export function toSnakeCase(text: string): string {
  return splitWords(text).map((word) => word.toLowerCase()).join('_');
}

export function toKebabCase(text: string): string {
  return splitWords(text).map((word) => word.toLowerCase()).join('-');
}

export function toCamelCase(text: string): string {
  const words = splitWords(text);
  const first = words[0];
  const rest = words.slice(1);
  if (first === undefined) return '';
  const capitalized = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  return (
    first.toLowerCase() +
    rest.map(capitalized).join('')
  );
}

export function toPascalCase(text: string): string {
  const words = splitWords(text);
  const capitalized = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  return words.map(capitalized).join('');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function trimLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
}

export function dedupeLines(text: string): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of text.split('\n')) {
    if (!seen.has(line)) {
      seen.add(line);
      kept.push(line);
    }
  }
  return kept.join('\n');
}

export function sortLines(text: string, reverse?: boolean): string {
  const lines = text.split('\n');
  lines.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (reverse) lines.reverse();
  return lines.join('\n');
}

const LOREM_WORDS: string[] = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation',
  'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat',
];

export function loremIpsum(paragraphs: number, wordsPerParagraph = 48): string {
  const count = Math.max(0, Math.floor(paragraphs));
  const words = Math.max(0, Math.floor(wordsPerParagraph));
  const paragraphsOut: string[] = [];
  for (let p = 0; p < count; p++) {
    if (words === 0) continue;
    const wordsOut: string[] = [];
    for (let w = 0; w < words; w++) {
      const word = LOREM_WORDS[(p * 7 + w * 13) % LOREM_WORDS.length] as string;
      wordsOut.push(w === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word);
    }
    paragraphsOut.push(wordsOut.join(' ') + '.');
  }
  return paragraphsOut.join('\n\n');
}
