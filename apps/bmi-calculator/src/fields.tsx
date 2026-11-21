import { Select, TextInput } from '@lacuna/ui'

export const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric (cm, kg)' },
  { value: 'imperial', label: 'Imperial (ft, lbs)' },
] as const

export function MeasureField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string | null
  placeholder?: string
}) {
  return (
    <TextInput
      label={label}
      value={value}
      onChange={onChange}
      inputMode="decimal"
      placeholder={placeholder}
      hint={hint}
      error={error}
    />
  )
}

export function MeasureSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) {
  return <Select label="Units" value={value} onChange={onChange} options={[...options]} />
}
