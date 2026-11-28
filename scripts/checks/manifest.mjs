// manifest: the app's lacuna.app.json against the schema and the store rules in schema/validate.mjs
// (taken from the base branch): no starter text, lacuna.* ids for first-party apps only, a slug that is
// one DNS label and not reserved, a known folder, and outside apps inside the permission envelope.
import { skip, verdict } from './lib.mjs'
import { validateManifest } from '../../schema/validate.mjs'

export const id = 'manifest'

export async function run(ctx) {
  if (!ctx.slug) return skip('no single app to check')
  const file = `apps/${ctx.slug}/lacuna.app.json`
  if (ctx.manifestError) return verdict([{ file, message: ctx.manifestError, fix: 'Add a lacuna.app.json that is valid JSON. Start from template/lacuna.app.json.' }])
  const { errors, warnings } = validateManifest(ctx.manifest, { slug: ctx.slug, isNew: ctx.isNew })
  const findings = errors.map((e) => ({ file, message: e.replace(/^(schema|rule)\s+/, '') }))
  return verdict(findings, { notes: warnings })
}
