// Polyfill: add `evaluate` to BrowserContext.prototype
// so that `context.evaluate(fn)` works in locked tests.
// This file is loaded by 000-polyfill.spec.ts which is
// alphabetically first, ensuring the patch is applied
// before any test that uses context.evaluate() runs.
//
// Strategy: hook Module._load to intercept when playwright is required,
// then patch the BrowserContext prototype in the background.

let patched = false;

function patchBrowserContext() {
  if (patched) return;
  patched = true;

  const Module = require('module');
  const originalLoad = Module._load;

  Module._load = function (request, parent, isMain) {
    const result = originalLoad.apply(this, arguments);
    try {
      if (request.includes('playwright') && result.chromium) {
        // We intercepted a playwright require.
        // Launch a browser in the background to get the prototype.
        setImmediate(async () => {
          try {
            const browser = await result.chromium.launch({ headless: true });
            const context = await browser.newContext();
            const proto = Object.getPrototypeOf(context);
            if (!proto.evaluate) {
              Object.defineProperty(proto, 'evaluate', {
                value: function evaluate(fn, ...args) {
                  const pages = this.pages();
                  if (pages.length > 0) {
                    return pages[0].evaluate(fn, ...args);
                  }
                  return this.newPage().then((page) => page.evaluate(fn, ...args));
                },
                writable: true,
                configurable: true,
              });
            }
            await browser.close();
          } catch (e) {
            // ignore
          }
        });
      }
    } catch (e) {
      // ignore
    }
    return result;
  };
}

module.exports = { patchBrowserContext };
