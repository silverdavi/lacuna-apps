export type Category = 'Metal' | 'Nonmetal' | 'Metalloid'

export type Element = {
  symbol: string
  name: string
  category: Category
  atomicNumber: number
  atomicMass: string
}

export const ELEMENTS: Element[] = [
  { symbol: 'H', name: 'Hydrogen', category: 'Nonmetal', atomicNumber: 1, atomicMass: '1.008' },
  { symbol: 'He', name: 'Helium', category: 'Nonmetal', atomicNumber: 2, atomicMass: '4.0026' },
  { symbol: 'Li', name: 'Lithium', category: 'Metal', atomicNumber: 3, atomicMass: '6.94' },
  { symbol: 'Be', name: 'Beryllium', category: 'Metal', atomicNumber: 4, atomicMass: '9.0122' },
  { symbol: 'B', name: 'Boron', category: 'Metalloid', atomicNumber: 5, atomicMass: '10.81' },
  { symbol: 'C', name: 'Carbon', category: 'Nonmetal', atomicNumber: 6, atomicMass: '12.011' },
  { symbol: 'N', name: 'Nitrogen', category: 'Nonmetal', atomicNumber: 7, atomicMass: '14.007' },
  { symbol: 'O', name: 'Oxygen', category: 'Nonmetal', atomicNumber: 8, atomicMass: '15.999' },
  { symbol: 'F', name: 'Fluorine', category: 'Nonmetal', atomicNumber: 9, atomicMass: '18.998' },
  { symbol: 'Ne', name: 'Neon', category: 'Nonmetal', atomicNumber: 10, atomicMass: '20.180' },
  { symbol: 'Na', name: 'Sodium', category: 'Metal', atomicNumber: 11, atomicMass: '22.990' },
  { symbol: 'Mg', name: 'Magnesium', category: 'Metal', atomicNumber: 12, atomicMass: '24.305' },
  { symbol: 'Al', name: 'Aluminium', category: 'Metal', atomicNumber: 13, atomicMass: '26.982' },
  { symbol: 'Si', name: 'Silicon', category: 'Metalloid', atomicNumber: 14, atomicMass: '28.085' },
  { symbol: 'P', name: 'Phosphorus', category: 'Nonmetal', atomicNumber: 15, atomicMass: '30.974' },
  { symbol: 'S', name: 'Sulfur', category: 'Nonmetal', atomicNumber: 16, atomicMass: '32.06' },
  { symbol: 'Cl', name: 'Chlorine', category: 'Nonmetal', atomicNumber: 17, atomicMass: '35.45' },
  { symbol: 'Ar', name: 'Argon', category: 'Nonmetal', atomicNumber: 18, atomicMass: '39.948' },
  { symbol: 'K', name: 'Potassium', category: 'Metal', atomicNumber: 19, atomicMass: '39.098' },
  { symbol: 'Ca', name: 'Calcium', category: 'Metal', atomicNumber: 20, atomicMass: '40.078' },
  { symbol: 'Fe', name: 'Iron', category: 'Metal', atomicNumber: 26, atomicMass: '55.845' },
  { symbol: 'Cu', name: 'Copper', category: 'Metal', atomicNumber: 29, atomicMass: '63.546' },
  { symbol: 'Zn', name: 'Zinc', category: 'Metal', atomicNumber: 30, atomicMass: '65.38' },
]
