'use strict';
// Babel plugin (loaded by Playwright's PW_TEST_SOURCE_TRANSFORM hook).
// Rewrites every `page.keyboard.pressSequentially(text, ...)` call in the
// test files into `__msShim.pressSequentially(page.keyboard, text, ...)`
// and injects an import of the companion runtime shim at the top of the file.
//
// `page.keyboard.type()` (the replacement for pressSequentially in
// Playwright 1.65+) cannot type `\n` in a textarea because it dispatches
// keydown events that trigger the browser's native newline insertion, so
// the shim inserts characters one by one with locator.type() and falls back
// to `insertText` for control characters.

function collectArg(arg, t, out) {
  if (!arg) return;
  if (arg.type === 'SpreadElement') {
    out.push(arg.argument);
    return;
  }
  out.push(arg);
}

module.exports = function (api) {
  const t = api.types;

  return {
    name: 'shim-keyboard-press-sequentially',
    visitor: {
      Program: {
        enter(programPath, state) {
          const hubFile = (programPath.hub && programPath.hub.file && programPath.hub.file.opts && programPath.hub.file.opts.filename) || '';
          const file = state?.filename || hubFile || '';
          if (file.includes('__shim__')) return;
          programPath.node.body.unshift(
            t.importDeclaration(
              [t.importSpecifier(t.identifier('__msShim'), t.identifier('__msShim'))],
              t.stringLiteral('./__shim__/keyboard-shim.js')
            )
          );
        },
      },
      CallExpression(path) {
        const callee = path.node.callee;
        if (!callee || callee.type !== 'MemberExpression' || callee.computed) return;
        if (!callee.property || callee.property.type !== 'Identifier' || callee.property.name !== 'pressSequentially') return;

        const obj = callee.object;
        if (!obj || obj.type !== 'MemberExpression' || obj.computed) return;
        if (!obj.property || obj.property.type !== 'Identifier' || obj.property.name !== 'keyboard') return;

        const args = [obj];
        for (let i = 0; i < path.node.arguments.length; i += 1) {
          if (i === 0) {
            collectArg(path.node.arguments[i], t, args);
          } else {
            args.push(path.node.arguments[i]);
          }
        }
        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.identifier('__msShim'),
              t.identifier('pressSequentially')
            ),
            args
          )
        );
      },
    },
  };
};
