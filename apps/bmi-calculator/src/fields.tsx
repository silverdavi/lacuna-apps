import { Select, TextInput } from '@lacuna/ui'

export function MeasureField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string | null
}) {
  return (
    <TextInput
      label={label}
      value={value}
      onChange={onChange}
      inputMode="decimal"
      hint={hint}
      error={error}
    />
  )
}

export function MeasureSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}
