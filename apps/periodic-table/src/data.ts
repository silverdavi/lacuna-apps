export type Category = 'Metal' | 'Nonmetal' | 'Noble gas'

export type Element = {
  symbol: string
  name: string
  category: Category
  atomicNumber: number
  atomicMass: string
}

export const ELEMENTS: Element[] = [
  { symbol: 'H', name: 'Hydrogen', category: 'Nonmetal', atomicNumber: 1, atomicMass: '1.008' },
  { symbol: 'He', name: 'Helium', category: 'Noble gas', atomicNumber: 2, atomicMass: '4.0026' },
  { symbol: 'C', name: 'Carbon', category: 'Nonmetal', atomicNumber: 6, atomicMass: '12.011' },
  { symbol: 'Fe', name: 'Iron', category: 'Metal', atomicNumber: 26, atomicMass: '55.845' },
  { symbol: 'Zn', name: 'Zinc', category: 'Metal', atomicNumber: 30, atomicMass: '65.38' },
]
