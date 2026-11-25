/**
 * DSH bundle that publishes the GAPIT AI skill.
 *
 * The skill payload (SKILL.md, references/, resources/) lives in
 * `skills/gapit-ai/` next to this file. A skill provider is registered on the
 * Host registry so the skill appears in the catalog exactly while the bundle is
 * installed and enabled. The skill body is read from disk on load, so editing
 * the payload does not require reinstalling the bundle.
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PROVIDER_NAME = 'gapit-ai'
const SKILL_RANK = 300 // same order as "custom" skill roots: above user roots, below project roots
const SKILL_DIR = fileURLToPath(new URL('./skills/gapit-ai', import.meta.url))
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md')

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Unquote a single YAML scalar. */
function scalar(raw) {
  const value = raw.trim()
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if (first === '"' && last === '"') return JSON.parse(value)
    if (first === "'" && last === "'") return value.slice(1, -1).replaceAll("''", "'")
  }
  return value
}

/**
 * Parse the small YAML subset used by skill frontmatter: top-level scalars,
 * `>`/`|` block scalars, and one level of nested key/value metadata.
 * @param {string} text raw SKILL.md content.
 * @returns {{ data: Record<string, unknown>, body: string }}
 */
function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(text)
  if (match === null) throw new Error('SKILL.md has no YAML frontmatter')
  const source = match[1]
  const body = text.slice(match[0].length)
  const data = {}
  const lines = source.split(/\r?\n/)

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const keyMatch = /^([A-Za-z0-9_.-]+):(?:[ \t]+(.*))?$/.exec(line)
    if (keyMatch === null) throw new Error(`unsupported frontmatter line: ${line}`)

    const key = keyMatch[1]
    const rest = (keyMatch[2] ?? '').trim()

    if (rest === '>' || rest === '|' || /^[>|][+-]?$/.test(rest)) {
      const block = []
      let j = i + 1
      for (; j < lines.length; j += 1) {
        if (lines[j].trim() !== '' && !/^\s+/.test(lines[j])) break
        block.push(lines[j])
      }
      const indents = block.filter(line => line.trim() !== '').map(line => /^\s*/.exec(line)[0].length)
      const cut = indents.length > 0 ? Math.min(...indents) : 0
      const stripped = block.map(line => line.slice(cut))
      data[key] = rest.startsWith('|') ? stripped.join('\n').trim() : stripped.join('\n').trim().replace(/\s*\n\s*/g, ' ')
      i = j - 1
      continue
    }

    if (rest === '') {
      const nested = {}
      let j = i + 1
      for (; j < lines.length; j += 1) {
        const child = lines[j]
        if (child.trim() === '') continue
        if (!/^\s+/.test(child)) break
        const childMatch = /^\s+([A-Za-z0-9_.-]+):(?:[ \t]+(.*))?$/.exec(child)
        if (childMatch === null) throw new Error(`unsupported nested frontmatter line: ${child}`)
        nested[childMatch[1]] = scalar(childMatch[2] ?? '')
      }
      data[key] = nested
      i = j - 1
      continue
    }

    data[key] = scalar(rest)
  }

  return { data, body }
}

/** Load and validate the skill payload from disk. */
async function readSkill() {
  const text = await readFile(SKILL_FILE, 'utf8')
  const { data, body } = parseFrontmatter(text)
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const description = typeof data.description === 'string' ? data.description.replace(/\s+/g, ' ').trim() : ''
  if (!NAME_PATTERN.test(name)) throw new Error(`invalid skill name in ${SKILL_FILE}: "${name}"`)
  if (description === '') throw new Error(`missing skill description in ${SKILL_FILE}`)
  const metadata = data.metadata !== null && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
    ? data.metadata
    : undefined
  return {
    name,
    description,
    whenToUse: typeof data.whenToUse === 'string' ? data.whenToUse.trim() : undefined,
    metadata,
    content: body.trim(),
  }
}

function candidate(skill) {
  return {
    path: SKILL_FILE,
    name: skill.name,
    description: skill.description,
    ...(skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse }),
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'custom',
    provider: PROVIDER_NAME,
    rank: SKILL_RANK,
    locator: { skillFile: SKILL_FILE, skillDir: SKILL_DIR },
    resourceBase: { kind: 'directory', path: SKILL_DIR },
    ...(skill.metadata === undefined ? {} : { metadata: skill.metadata }),
  }
}

/**
 * @param {string} entry Loader row id for logs.
 * @param {import('@deepseek-ai/cordis').Context} ctx Host context.
 */
export const inject = ['skills']

export function apply(ctx) {
  const warn = (message) => ctx.logger?.warn?.(`[gapit-ai] ${message}`)

  ctx.effect(() => ctx.skills.registerProvider(() => ({
    name: PROVIDER_NAME,
    async list() {
      try {
        const skill = await readSkill()
        return [candidate(skill)]
      } catch (error) {
        warn(`skill payload unavailable: ${error instanceof Error ? error.message : String(error)}`)
        return []
      }
    },
    async get(loaded) {
      if (loaded?.locator?.skillFile !== SKILL_FILE) return undefined
      const skill = await readSkill()
      return {
        path: SKILL_FILE,
        name: skill.name,
        description: skill.description,
        ...(skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse }),
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'custom',
        provider: PROVIDER_NAME,
        resourceBase: { kind: 'directory', path: SKILL_DIR },
        ...(skill.metadata === undefined ? {} : { metadata: skill.metadata }),
        content: skill.content,
      }
    },
  })))
}
