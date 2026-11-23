import { store } from './mock'

export const host = {
  getSource: (): string => store.get(),
  setSource: (source: string): void => store.set(source),
  clearSource: (): void => store.clear(),
}
