// dco: every commit in the pull request carries a Developer Certificate of Origin sign-off
// (`Signed-off-by: Name <email>`) that matches the commit's author. `git commit -s` adds it.
import { verdict } from './lib.mjs'

export const id = 'dco'

export function signoffs(body) {
  return [...body.matchAll(/^Signed-off-by:\s*(.+?)\s*<([^<>\s]+)>\s*$/gim)].map((m) => ({ name: m[1].trim(), email: m[2].trim() }))
}

export async function run(ctx) {
  const findings = []
  const commits = ctx.commits.filter((c) => !c.merge)
  if (!commits.length) findings.push({ message: 'the pull request has no commits of its own' })
  for (const c of commits) {
    const s = signoffs(c.body)
    const short = c.sha.slice(0, 7)
    if (!s.length) {
      findings.push({ message: `commit ${short} has no Signed-off-by line`, fix: 'Amend with `git commit --amend -s` (or `git rebase --signoff <base>` for several commits) and push again.' })
    } else if (!s.some((x) => x.email.toLowerCase() === c.email.toLowerCase())) {
      findings.push({ message: `commit ${short} is signed off by ${s.map((x) => x.name).join(', ')}, not by its author ${c.name}`, fix: 'The author signs off their own commit. Use the same email for the commit and the sign-off.' })
    }
  }
  return verdict(findings, { measured: { commits: commits.length } })
}
