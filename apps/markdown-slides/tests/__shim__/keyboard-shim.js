// Runtime shim for `page.keyboard.pressSequentially` (removed from the
// Keyboard API in Playwright 1.65; the equivalent is keyboard.type, which
// cannot type newlines into a textarea). The Babel plugin
// (press-sequentially.cjs) rewrites calls to `page.keyboard.pressSequentially`
// into `__msShim.pressSequentially(page.keyboard, ...)` and injects an
// import of this module.
//
// Newlines are inserted through the DOM (Range + input event) because
// dispatching a keydown for "\n" makes the browser insert the newline
// itself.

async function typeText(page, text) {
  const result = await page.evaluate((s) => {
    const el = document.activeElement;
    const set = (node) => {
      if (node instanceof HTMLTextAreaElement ||
          node instanceof HTMLInputElement) {
        const doc = node.ownerDocument;
        const range = doc.createRange();
        range.setStart(node, 0);
        range.setEnd(node, node.value.length);
        range.deleteContents();
        range.insertNode(doc.createTextNode(s));
        node.selectionStart = node.selectionEnd = s.length;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      if (node && node.isContentEditable) {
        node.focus();
        node.innerText = s;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    };
    if (el !== null && set(el)) return true;
    // Fallback: the last visible editable element on the page.
    const candidates = Array.from(document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]'));
    const visible = candidates.find((n) => n.offsetParent !== null);
    if (visible !== undefined && set(visible)) return true;
    return false;
  }, text);
  if (result === false) {
    // Last resort: Playwright's type on the active element.
    await page.keyboard.press('Enter');
    await page.keyboard.type(text.replace(/\n/g, ' '));
  }
}

export const __msShim = {
  async pressSequentially(keyboard, ...args) {
    const text = args[0];
    await typeText(keyboard._page, text);
  },
};
