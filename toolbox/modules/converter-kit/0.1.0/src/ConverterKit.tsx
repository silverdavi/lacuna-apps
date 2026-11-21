// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/converter-kit 0.1.0: snapshot of lacuna-components ConverterKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Combobox } from '@lacuna/combobox';
import { useClipboard } from '@lacuna/use-clipboard';
import { useLocalRecord } from '@lacuna/use-local-record';
import type { ConverterKitProps, ConverterPreset } from './index';

interface HistoryEntry {
  input: string;
  output: string;
  presetId: string;
}

interface RecordValue {
  input: string;
  presetId: string;
  history: HistoryEntry[];
}

function findPreset(presets: ConverterPreset[], presetId: string): ConverterPreset {
  const fallback = presets[0];
  for (const preset of presets) {
    if (preset.id === presetId) return preset;
  }
  if (fallback !== undefined) return fallback;
  return { id: 'none', label: 'None', convert: (s) => s };
}

const sp = (n: number): string => `calc(${n}px * var(--sf))`;
const ty = (n: number): string => `calc(${n}px * var(--tf))`;

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: sp(16),
    maxWidth: 'calc(380px * var(--sf))',
    fontFamily: 'var(--sans)',
    color: 'var(--ink)',
  } as CSSProperties,
  heading: {
    fontFamily: 'var(--sans)',
    fontSize: ty(18),
    margin: 0,
    color: 'var(--ink)',
  } as CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: sp(12),
  } as CSSProperties,
  pane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: sp(8),
    minWidth: 0,
  } as CSSProperties,
  label: {
    fontFamily: 'var(--mono)',
    fontSize: ty(10),
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink)',
  } as CSSProperties,
  input: {
    fontFamily: 'var(--mono)',
    fontSize: ty(14),
    color: 'var(--ink)',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: sp(8),
    padding: sp(8),
    minHeight: sp(40),
    boxSizing: 'border-box',
    width: '100%',
  } as CSSProperties,
  outputBox: {
    fontFamily: 'var(--mono)',
    fontSize: ty(14),
    color: 'var(--ink)',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: sp(8),
    padding: sp(8),
    minHeight: sp(40),
    boxSizing: 'border-box',
    wordBreak: 'break-word',
    cursor: 'default',
  } as CSSProperties,
  placeholder: {
    color: 'var(--ink-60)',
  } as CSSProperties,
  button: {
    fontFamily: 'var(--sans)',
    fontSize: ty(14),
    color: 'var(--ink)',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: sp(8),
    padding: sp(8),
    cursor: 'pointer',
  } as CSSProperties,
  presetGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: sp(8),
  } as CSSProperties,
  history: {
    display: 'flex',
    flexDirection: 'column',
    gap: sp(6),
  } as CSSProperties,
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: sp(8),
    fontFamily: 'var(--mono)',
    fontSize: ty(13),
    color: 'var(--ink)',
  } as CSSProperties,
  historyArrow: {
    color: 'var(--ink-60)',
  } as CSSProperties,
} as const;

export function ConverterKit(props: ConverterKitProps) {
  const { recordKey, presets, maxHistory = 20 } = props;
  const inputLabel = props.inputLabel ?? 'Input';
  const outputLabel = props.outputLabel ?? 'Output';
  const historyLabel = props.historyLabel ?? 'History';

  const uid = useId();
  const inputId = `convkit-input-${uid}`;
  const outputId = `convkit-output-${uid}`;

  const first = presets[0];
  const defaultValue: RecordValue = {
    input: '',
    presetId: first ? first.id : '',
    history: [],
  };
  const { value: record, set: setRecord } = useLocalRecord<RecordValue>({
    key: recordKey,
    version: 1,
    defaultValue,
  });

  const active = findPreset(presets, record.presetId);
  const output = active ? active.convert(record.input) : '';

  const { copied, copy } = useClipboard({ timeoutMs: 2000 });

  const suppressHistory = useRef(false);

  function push(prev: RecordValue, presetId: string, input: string): RecordValue {
    const preset = findPreset(presets, presetId);
    const entry: HistoryEntry = {
      input,
      output: preset.convert(input),
      presetId,
    };
    const history = [...prev.history, entry];
    while (history.length > maxHistory) history.shift();
    return { ...prev, presetId, input, history };
  }

  function setInput(value: string): void {
    if (suppressHistory.current) {
      setRecord((prev) => ({ ...prev, input: value }));
      return;
    }
    setRecord((prev) => push(prev, prev.presetId, value));
  }

  function changePreset(presetId: string | null): void {
    if (presetId === null) return;
    setRecord((prev) => {
      // Switching presets on an empty input is not a conversion; record nothing.
      if (!prev.input) return { ...prev, presetId };
      return push(prev, presetId, prev.input);
    });
  }

  function swap(): void {
    setRecord((prev) => {
      if (!prev.input) return prev;
      const preset = findPreset(presets, prev.presetId);
      const newInput = preset.convert(prev.input);
      suppressHistory.current = true;
      return push(prev, prev.presetId, newInput);
    });
  }

  async function handleCopy(): Promise<void> {
    await copy(output);
  }

  return (
    <div style={S.page}>
      <h1 style={S.heading}>Converter</h1>

      <div style={S.row}>
        <div style={S.pane}>
          <label htmlFor={inputId} style={S.label}>
            {inputLabel}
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="text"
            autoFocus
            value={record.input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputLabel}
            style={S.input}
          />
        </div>
        <div style={S.pane}>
          <span style={S.label} id={outputId + '-label'}>
            {outputLabel}
          </span>
          <input
            id={outputId}
            type="text"
            readOnly
            tabIndex={0}
            aria-labelledby={outputId + '-label'}
            value={output}
            placeholder={outputLabel}
            style={S.outputBox}
          />
        </div>
      </div>

      <div style={S.row}>
        <button type="button" onClick={swap} aria-label="Swap" style={S.button}>
          Swap
        </button>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy'}
          style={S.button}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <div style={S.presetGroup}>
          <Combobox
            id={`convkit-preset-${uid}`}
            label="Preset"
            options={presets.map((p) => ({ value: p.id, label: p.label }))}
            value={record.presetId}
            onChange={changePreset}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: sp(8) }}>
        <span style={S.label} id={outputId + '-history-label'}>
          {historyLabel}
        </span>
        <div style={S.history} aria-labelledby={outputId + '-history-label'}>
          {record.history.length === 0 ? (
            <span style={S.placeholder}>No conversions yet</span>
          ) : (
            record.history.map((entry, index) => (
              <div
                key={`${entry.presetId}-${index}-${entry.input}`}
                style={S.historyItem}
              >
                <span>{entry.input}</span>
                <span style={S.historyArrow} aria-hidden="true">
                  →
                </span>
                <span>{entry.output}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
