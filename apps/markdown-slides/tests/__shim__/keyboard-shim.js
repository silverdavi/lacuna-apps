// Runtime shim for `page.keyboard.pressSequentially` (removed from the
// Keyboard API in Playwright 1.65). The Babel plugin
// (press-sequentially.cjs) rewrites calls to `page.keyboard.pressSequentially`
// into `__msShim.pressSequentially(page.keyboard, ...)` and injects an
// import of this module.
//
// Uses keyboard.insertText() which reliably inserts text into the
// focused element.

export const __msShim = {
  async pressSequentially(keyboard, text) {
    await keyboard.insertText(String(text))
  },
}
