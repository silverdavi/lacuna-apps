// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/color-picker 0.1.0: snapshot of lacuna-components ColorPicker at 8aeeaa8 by sync-toolbox-components.py; a change gets a new version.
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from '@lacuna/color-math';
import { Actions, Button, Card, Divider, FormGrid, Kpi, KpiRow, SectionLabel, Stack } from '@lacuna/ui';
import type { ColorPickerProps, ColorValue } from './index';

const sliderDisabledStyle: CSSProperties = {
  opacity: 0.55,
};

export function ColorPicker({
  value,
  onChange,
  onEyedrop,
  disabled = false,
  label,
  className,
  style,
  children,
}: ColorPickerProps): ReactNode {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [hexDraft, setHexDraft] = useState(value.hex);
  const [hexError, setHexError] = useState<string | null>(null);

  useEffect(() => {
    setHexDraft(value.hex);
    setHexError(null);
  }, [value.hex]);

  function push(next: ColorValue): void {
    setHexDraft(next.hex);
    setHexError(null);
    onChange(next);
  }

  function setHueSat(h: number, s: number): void {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.min(100, Math.max(0, s));
    const rgb = hslToRgb({ h: hue / 360, s: sat / 100, l: value.l / 100 });
    push({ ...value, h: hue, s: sat, r: rgb.r, g: rgb.g, b: rgb.b, hex: rgbToHex(rgb) });
  }

  function commitHex(): void {
    let draft = hexDraft.trim();
    if (draft.length > 0 && draft[0] !== '#') draft = `#${draft}`;
    if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(draft)) {
      setHexError('Enter a valid 6-digit hex color');
      setHexDraft(value.hex);
      return;
    }
    const rgb = hexToRgb(draft);
    const hsl = rgbToHsl(rgb);
    const next: ColorValue = {
      hex: rgbToHex(rgb),
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      h: Math.round(hsl.h * 360),
      s: Math.round(hsl.s * 100),
      l: Math.round(hsl.l * 100),
    };
    setHexError(null);
    setHexDraft(next.hex);
    if (next.hex !== value.hex) onChange(next);
  }

  function onSliderKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (disabled) return;
    let handled = true;
    switch (event.key) {
      case 'ArrowRight':
        setHueSat(value.h + 1, value.s);
        break;
      case 'ArrowLeft':
        setHueSat(value.h - 1, value.s);
        break;
      case 'ArrowUp':
        setHueSat(value.h, value.s + 1);
        break;
      case 'ArrowDown':
        setHueSat(value.h, value.s - 1);
        break;
      case 'Home':
        setHueSat(0, value.s);
        break;
      case 'End':
        setHueSat(359, value.s);
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  }

  function onSliderPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    const el = sliderRef.current;
    if (el === null) return;
    const target = el;

    function move(ev: globalThis.PointerEvent): void {
      const rect = target.getBoundingClientRect();
      const s = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      const h = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 360;
      setHueSat(h, s);
    }

    function up(): void {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function onHexChange(draft: string): void {
    setHexDraft(draft);
    setHexError(null);
  }

  function commitWhenEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') commitHex();
  }

  const swatch = `rgb(${value.r}, ${value.g}, ${value.b})`;
  const ariaNow = Math.round(value.h / 3.6);

  return (
    <Card
      className={className}
      style={style}
      mono={label ? 'Color' : undefined}
      title={label}
      actions={
        <Button kind="ghost" ariaLabel="Eyedropper" disabled={disabled} onClick={onEyedrop}>
          Eyedropper
        </Button>
      }
    >
      <div role="group" aria-label={label}>
        <Stack>
          <h2 className="lc-mono lk-section lc-accent" style={{ color: 'var(--ink)' }}>Hue and saturation</h2>
          <div
            ref={sliderRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label="Hue and saturation"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ariaNow}
            aria-disabled={disabled || undefined}
            onKeyDown={onSliderKeyDown}
            onPointerDown={onSliderPointerDown}
            style={{
              position: 'relative',
              width: '100%',
              height: 'calc(160px * var(--sf))',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(2px * var(--sf))',
              background: `hsl(${value.h}, 100%, 50%)`,
              cursor: disabled ? 'not-allowed' : 'crosshair',
              outline: 'none',
              ...(disabled ? sliderDisabledStyle : {}),
            }}
          >
            <div aria-hidden="true" style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, rgba(255, 255, 255, 0.44), rgba(0, 0, 0, 0.74))',
              }}
            />
            <div aria-hidden="true" style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.74), rgba(255, 255, 255, 0.44))',
              }}
            />
            <div aria-hidden="true">
              <div
                style={{
                  position: 'absolute',
                  left: `${value.s}%`,
                  top: `${100 - value.h / 3.6}%`,
                  width: 'calc(10px * var(--sf))',
                  height: 'calc(10px * var(--sf))',
                  margin: '0',
                  border: 'calc(1px * var(--sf)) solid var(--paper)',
                  borderRadius: '50%',
                  background: swatch,
                }}
              />
            </div>
          </div>
          <KpiRow>
            <Kpi value={value.hex} label="Hex" />
            <Kpi value={`rgb(${value.r}, ${value.g}, ${value.b})`} label="RGB" />
            <Kpi value={`hsl(${value.h}, ${value.s}%, ${value.l}%)`} label="HSL" />
          </KpiRow>
          <Divider />
          <FormGrid>
            {disabled ? (
              <Kpi value={value.hex} label="Hex" />
            ) : (
              <label className="lc-field" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="lc-field-label">Hex</span>
                <input
                  className="lc-input"
                  type="text"
                  value={hexDraft}
                  aria-invalid={hexError ? true : undefined}
                  onChange={(event) => onHexChange(event.target.value)}
                  onKeyDown={commitWhenEnter}
                />
                {hexError ? <span className="lk-field-error" role="alert">{hexError}</span> : <span className="lk-field-hint" aria-hidden="true" style={{ color: 'var(--ink-80)' }}>Press Enter to apply</span>}
              </label>
            )}
            <KpiRow>
              <Kpi value={String(value.r)} label="Red" />
              <Kpi value={String(value.g)} label="Green" />
              <Kpi value={String(value.b)} label="Blue" />
            </KpiRow>
          </FormGrid>
          <Actions>
            <Button kind="secondary" disabled={disabled} onClick={() => sliderRef.current?.focus()}>
              Focus slider
            </Button>
          </Actions>
          {children}
        </Stack>
      </div>
    </Card>
  );
}
