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

function collectArg(path, t, out) {
  const arg = path.node.argument;
  if (arg.type === 'SpreadElement') {
    out.push(arg.argument);
    return;
  }
  out.push(t.callExpression(
    t.memberExpression(t.identifier('String'), t.identifier('fromCodePoint')),
    [t.binaryExpression('+', t.numericLiteral(0), arg)]
  ));
}

module.exports = function () {
  const t = require('@babel/types');
  const shimSpecifier = process.env.PW_SHIM_PATH || '';

  return {
    name: 'shim-keyboard-press-sequentially',
    visitor: {
      Program: {
        enter(programPath) {
          if (shimSpecifier !== '') {
            programPath.node.body.unshift(
              t.importDeclaration([], t.stringLiteral(shimSpecifier))
            );
          }
        },
      },
      CallExpression(path) {
        const callee = path.node.callee;
        if (!callee || callee.type !== 'MemberExpression' || callee.computed) return;
        if (!callee.property || callee.property.type !== 'Identifier' || callee.property.name !== 'pressSequentially') return;

        const obj = callee.object;
        if (!obj || obj.type !== 'MemberExpression' || obj.computed) return;
        if (!obj.property || obj.property.type !== 'Identifier' || obj.property.name !== 'keyboard') return;

        const args = [];
        for (let i = 0; i < callee.arguments.length; i += 1) {
          const a = callee.arguments[i];
          if (a === null || a === undefined) continue;
          collectArg(path, t, args);
        }
        path.node.callee = t.callExpression(
          t.memberExpression(
            t.identifier('__msShim'),
            t.identifier('pressSequentially')
          ),
          args
        );
      },
    },
  };
};
