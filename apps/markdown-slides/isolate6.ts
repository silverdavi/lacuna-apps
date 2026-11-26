export default (async () => {
  const root = await import('../../playwright.config.ts')
  return { ...(typeof root.default === 'object' && root.default !== null ? root.default : {}) }
})()
