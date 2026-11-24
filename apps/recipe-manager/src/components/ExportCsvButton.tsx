import type { CSSProperties } from 'react'
import { saveBlob } from '@lacuna/file-save-open'
import type { RecipeData } from '../host'

const buttonStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
  background: 'transparent',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(6px * var(--sf)) calc(10px * var(--sf))',
  cursor: 'pointer',
}

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function recipeToCsv(recipes: RecipeData[]): string {
  const header = ['Name', 'Servings']
  const lines = [header.join(',')]
  for (const r of recipes) {
    lines.push([csvField(r.name), csvField(String(r.servings))].join(','))
  }
  return lines.join('\n') + '\n'
}

export interface ExportCsvButtonProps {
  recipes: RecipeData[]
}

export function ExportCsvButton({ recipes }: ExportCsvButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={() => {
        saveBlob(
          new Blob([recipeToCsv(recipes)], { type: 'text/csv;charset=utf-8' }),
          { filename: 'recipes.csv', mimeType: 'text/csv' },
        )
      }}
    >
      Export CSV
    </button>
  )
}
