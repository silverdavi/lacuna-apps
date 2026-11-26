import { useState } from 'react'
import { Actions, AppShell, Button, Card, Checkbox, EmptyState, FormGrid, List, PrimaryButton, Row, Select, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { useForms, type FormField } from './host'

type View = { kind: 'list' } | { kind: 'designer'; formId: string } | { kind: 'fill'; formId: string }

const FIELD_TYPES = [
  { value: 'text', label: 'Single line' },
  { value: 'email', label: 'E-mail' },
  { value: 'number', label: 'Numeric' },
  { value: 'textarea', label: 'Multi-line' },
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

let fieldSeq = 0
function newFieldId(): string {
  fieldSeq += 1
  return `field-${Date.now()}-${fieldSeq}`
}

export function App() {
  const { forms, createForm, updateForm } = useForms()
  const [view, setView] = useState<View>({ kind: 'list' })
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [fieldRequired, setFieldRequired] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fillValues, setFillValues] = useState<Record<string, string>>({})
  const [lastExport, setLastExport] = useState('')
  const { copy } = useClipboard({ timeoutMs: 2000 })

  function activeForm() {
    if (view.kind === 'list') return undefined
    return forms.find((f) => f.id === view.formId)
  }

  function resetDesigner() {
    setFieldLabel('')
    setFieldType('text')
    setFieldRequired(false)
    setFieldError(null)
  }

  function resetFill() {
    setSubmitted(false)
    setValidationErrors([])
    setFillValues({})
  }

  function createNewForm() {
    const name = nameInput.trim()
    if (!name) {
      setNameError('Type a name first')
      return
    }
    if (forms.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setNameError('A form with that name already exists')
      return
    }
    const created = createForm(name)
    setNameInput('')
    setNameError(null)
    resetDesigner()
  }

  function addField() {
    if (view.kind !== 'designer') return
    const form = activeForm()
    if (!form) return
    const label = fieldLabel.trim()
    if (!label) {
      setFieldError('Type a label first')
      return
    }
    const field: FormField = {
      id: newFieldId(),
      label,
      type: fieldType,
      required: fieldRequired,
    }
    updateForm(view.formId, { fields: [...form.fields, field] })
    setFieldLabel('')
    setFieldType('text')
    setFieldRequired(false)
    setFieldError(null)
  }

  function deleteField(fieldId: string) {
    if (view.kind !== 'designer') return
    const form = activeForm()
    if (!form) return
    updateForm(view.formId, {
      fields: form.fields.filter((f) => f.id !== fieldId),
    })
  }

  function openPreview() {
    if (view.kind === 'designer') {
      setView({ kind: 'fill', formId: view.formId })
      resetFill()
    }
  }

  function backToDesigner() {
    if (view.kind === 'fill') {
      setView({ kind: 'designer', formId: view.formId })
    }
  }

  function submit() {
    if (view.kind !== 'fill') return
    const form = activeForm()
    if (!form) return
    const errors: string[] = []
    const values: Record<string, string> = {}
    for (const field of form.fields) {
      const key = slugify(field.label)
      const raw = (fillValues[field.id] ?? '').trim()
      if (field.required && !raw) {
        errors.push(`${field.label} is required`)
      }
      values[key] = raw
    }
    if (errors.length > 0) {
      setValidationErrors(errors)
      setSubmitted(false)
      return
    }
    setValidationErrors([])
    setSubmitted(true)
    setLastExport(JSON.stringify(values, null, 2))
  }

  function exportJson() {
    if (lastExport) void copy(lastExport)
  }

  const form = activeForm()

  return (
    <AppShell
      name="Dynamic Form Builder"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={
        view.kind === 'list'
          ? `${forms.length} ${forms.length === 1 ? 'form' : 'forms'}`
          : form
            ? `${form.fields.length} ${form.fields.length === 1 ? 'field' : 'fields'}`
            : ''
      }
    >
      {view.kind === 'list' ? (
        <>
          <Card mono="New" title="Create a form">
            <FormGrid>
              <TextInput
                label="Form name"
                value={nameInput}
                onChange={(v) => {
                  setNameInput(v)
                  if (nameError) setNameError(null)
                }}
                error={nameError}
              />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={createNewForm}>Create form</PrimaryButton>
            </Actions>
          </Card>
          <Card mono={`${forms.length} saved`} title="Forms">
            {forms.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No forms yet"
                detail="Create your first form above."
                actionLabel="Create a form"
                onAction={createNewForm}
              />
            ) : (
              <List label="Forms">
                {forms.map((f) => (
                  <Row
                    key={f.id}
                    title={f.name}
                    meta={`${f.fields.length} ${f.fields.length === 1 ? 'field' : 'fields'}`}
                    action={
                      <Button
                        kind="secondary"
                        onClick={() => {
                          setView({ kind: 'designer', formId: f.id })
                          resetDesigner()
                        }}
                      >
                        Edit
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </>
      ) : view.kind === 'designer' && form ? (
        <>
          <Card mono="Design" title={form.name}>
            <FormGrid>
              <TextInput
                label="Label"
                value={fieldLabel}
                onChange={(v) => {
                  setFieldLabel(v)
                  if (fieldError) setFieldError(null)
                }}
                error={fieldError}
              />
              <Select
                label="Type"
                value={fieldType}
                onChange={setFieldType}
                options={FIELD_TYPES}
              />
              <Checkbox
                label="Required"
                checked={fieldRequired}
                onChange={setFieldRequired}
              />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={addField}>Add field</PrimaryButton>
            </Actions>
          </Card>
          <Card mono={`${form.fields.length} fields`} title="Fields">
            {form.fields.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No fields yet"
                detail="Add the first field above."
                actionLabel="Add a field"
                onAction={addField}
              />
            ) : (
              <div role="group" aria-label="Field definitions">
                <List label="Fields">
                  {form.fields.map((f) => (
                    <Row
                      key={f.id}
                      title={f.label}
                      value={f.type}
                      action={
                        <Button kind="ghost" ariaLabel={`Delete ${f.label}`} onClick={() => deleteField(f.id)}>
                          Delete
                        </Button>
                      }
                    />
                  ))}
                </List>
              </div>
            )}
            <Actions>
              <Button kind="secondary" onClick={openPreview} disabled={form.fields.length === 0}>
                Preview
              </Button>
              <PrimaryButton onClick={() => setView({ kind: 'list' })}>Save form</PrimaryButton>
              <Button kind="ghost" onClick={() => setView({ kind: 'list' })}>
                Back
              </Button>
            </Actions>
          </Card>
        </>
      ) : view.kind === 'fill' && form ? (
        <>
          <Card mono="Fill" title={form.name}>
            {form.fields.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No fields to fill"
                detail="Add fields in the designer first."
                actionLabel="Back to designer"
                onAction={backToDesigner}
              />
            ) : (
              <>
                <FormGrid>
                  {form.fields.map((f) => (
                    <TextInput
                      key={f.id}
                      label={f.label}
                      type={f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : 'text'}
                      value={fillValues[f.id] ?? ''}
                      onChange={(v) => setFillValues((prev) => ({ ...prev, [f.id]: v }))}
                    />
                  ))}
                </FormGrid>
                <Actions>
                  <PrimaryButton onClick={submit}>Submit</PrimaryButton>
                  <Button kind="ghost" onClick={backToDesigner}>
                    Back
                  </Button>
                </Actions>
                {validationErrors.length > 0 ? (
                  <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
                    {validationErrors.map((e) => (
                      <p key={e} style={{ margin: 0, fontSize: 'calc(13px * var(--tf))', color: 'var(--danger, var(--ink))' }} role="alert">
                        {e}
                      </p>
                    ))}
                  </div>
                ) : null}
                {submitted ? (
                  <>
                    <p style={{ margin: 'calc(8px * var(--sf)) 0 0', fontSize: 'calc(13px * var(--tf))', color: 'var(--accent, var(--ink))' }}>
                      Form submitted successfully
                    </p>
                    <Actions>
                      <Button kind="secondary" onClick={exportJson}>
                        Export JSON
                      </Button>
                    </Actions>
                  </>
                ) : null}
              </>
            )}
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
