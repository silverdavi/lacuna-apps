<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components ColorPicker at 8aeeaa8. -->

> `@lacuna/color-picker` `0.1.0`. To use it in an app: add `"@lacuna/color-picker": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/color-picker": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/color-picker'`.

# ColorPicker

A color selection widget for drawing, design, and palette apps. It shows a hue/saturation 2D area that is keyboard and pointer driven, numeric hex, RGB, and HSL input fields that validate on commit, a read-out of the current color, and an eyedropper button that calls `onEyedrop` as a hook point for the host app's pixel sampling.

## Props

- `value`: the current `ColorValue` (hex, r, g, b, h, s, l).
- `onChange`: called with the next `ColorValue` whenever a control commits a change.
- `onEyedrop`: optional hook called when the eyedropper button is activated.
- `disabled`: disables every control and removes the slider from the tab order.
- `label`: the accessible name of the widget; drawn as the card title.
- `className`, `style`: extra class and style for the card.
- `children`: extra content rendered at the bottom of the panel.

## Usage

```tsx
import { useState } from 'react';
import { ColorPicker } from '@lacuna/color-picker';
import type { ColorValue } from '@lacuna/color-picker';

const red: ColorValue = {
  hex: `${'#'}ff0000`,
  r: 255,
  g: 0,
  b: 0,
  h: 0,
  s: 100,
  l: 50,
};

export function PaletteTool() {
  const [color, setColor] = useState<ColorValue>(red);
  return <ColorPicker value={color} onChange={setColor} label="Pick" onEyedrop={() => console.log('eyedrop')} />;
}
```
