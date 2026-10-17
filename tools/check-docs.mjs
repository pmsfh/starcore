#!/usr/bin/env node
/**
 * check-docs.mjs：文档与实现一致性检查
 *
 * 五组只读检查：
 * 1. Markdown 站内锚点与相对链接
 * 2. 册头「最后核对」版本与正文最高版本
 * 3. 设计令牌代码定义与规范总表条目
 * 4. 图标 symbol 总数、规范声明数与附录 A 登记行数
 * 5. 术语与体例（连击、敌方图鉴、破折号、内部编号与工作用语）
 *
 * 用法：
 *   node tools/check-docs.mjs           仅告警，退出码 0
 *   node tools/check-docs.mjs --strict  有告警即退出码 1
 *   node tools/check-docs.mjs --json    输出 JSON
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARGS = new Set(process.argv.slice(2))
const STRICT = ARGS.has('--strict')
const JSON_OUT = ARGS.has('--json')

const DOCS_DIR = join(ROOT, 'docs')
const TOKENS_CSS = join(ROOT, 'src/styles/tokens.css')
const ICONS_DIR = join(ROOT, 'src/components/ui/icons')
const TOKEN_DOC = join(DOCS_DIR, '设计令牌规范.md')
const ICON_DOC = join(DOCS_DIR, '图标设计规范.md')

const docFiles = readdirSync(DOCS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => join(DOCS_DIR, f))

const textFiles = [
  ...docFiles,
  join(ROOT, 'README.md'),
  join(ROOT, 'README.en.md'),
  join(ROOT, 'references/i18n-en-glossary.md'),
  join(ROOT, 'changelog/changelog.md'),
  join(ROOT, 'tools/README.md'),
].filter(existsSync)

const read = (p) => readFileSync(p, 'utf8')
const rel = (p) => relative(ROOT, p)
const result = { anchors: [], versions: [], tokens: null, icons: null, terms: [] }

// ---------- 1. 锚点与相对链接 ----------
function stripInline(s) {
  return s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
}

function slugify(text) {
  return stripInline(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')
    .replace(/^-|-$/g, '')
}

function anchorsOf(text) {
  const seen = new Map()
  const out = new Set()
  let inFence = false
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!m) continue
    const base = slugify(m[2])
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    out.add(n === 0 ? base : `${base}-${n}`)
  }
  return out
}

for (const file of textFiles) {
  const text = read(file)
  const own = anchorsOf(text)
  const dir = dirname(file)
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[1]
    if (/^(?:https?:|mailto:|tel:|data:)/.test(target)) continue
    const [pathPart, hashPart] = target.split('#')
    const targetPath = pathPart ? resolve(dir, decodeURIComponent(pathPart)) : file
    if (pathPart && (!existsSync(targetPath) || !statSync(targetPath).isFile())) {
      result.anchors.push({ file: rel(file), target, reason: 'file-not-found' })
      continue
    }
    if (hashPart) {
      const hash = decodeURIComponent(hashPart)
      if (!own.has(hash))
        result.anchors.push({ file: rel(file), target, reason: 'anchor-not-found' })
    }
  }
}

// ---------- 2. 册头版本 ----------
const versionValue = (v) => {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec(v.trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null
}
const cmpVersion = (a, b) => {
  const av = versionValue(a)
  const bv = versionValue(b)
  if (!av || !bv) return 0
  for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return av[i] - bv[i]
  return 0
}
const maxVersion = (text) => {
  let max = null
  for (const m of text.matchAll(/\bv(\d+\.\d+(?:\.\d+)?)\b/g)) {
    if (!max || cmpVersion(`v${m[1]}`, max) > 0) max = `v${m[1]}`
  }
  return max
}

for (const file of docFiles) {
  // 图标册用设计稿版本 v2.x，与游戏版本 vX.YY 不同谱系，跳过版本比较
  if (file.endsWith('图标设计规范.md')) continue
  const text = read(file)
  const head = text.split('\n').slice(0, 40).join('\n')
  const stamp = /最后核对\s*(v\d+\.\d+(?:\.\d+)?)/.exec(head)
  if (!stamp) continue
  const bodyMax = maxVersion(text)
  if (bodyMax && cmpVersion(bodyMax, stamp[1]) > 0) {
    result.versions.push({ file: rel(file), stamp: stamp[1], bodyMax })
  }
}

// ---------- 3. 令牌 ----------
function codeTokens() {
  const css = read(TOKENS_CSS)
  const root = /:root\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? ''
  return [...new Set([...root.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))].sort()
}

function docTokens() {
  const lines = read(TOKEN_DOC).split('\n')
  const start = lines.findIndex((l) => /^###\s+1\.2\b/.test(l))
  if (start < 0) return []
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^###\s+/.test(lines[i]) || /^##\s+/.test(lines[i])) {
      end = i
      break
    }
  }
  const names = []
  for (const line of lines.slice(start, end)) {
    const m = /^\|\s*`(--[\w-]+)`/.exec(line)
    if (m) names.push(m[1])
  }
  return [...new Set(names)].sort()
}

const ct = codeTokens()
const dt = docTokens()
const docOnlyAllowed = new Set(['--space-7'])
result.tokens = {
  code: ct.length,
  doc: dt.length,
  missingInDoc: ct.filter((t) => !dt.includes(t)),
  docOnly: dt.filter((t) => !ct.includes(t) && !docOnlyAllowed.has(t)),
  allowedDocOnly: dt.filter((t) => !ct.includes(t) && docOnlyAllowed.has(t)),
}

// ---------- 4. 图标 ----------
function symbolIds() {
  const ids = []
  for (const f of readdirSync(ICONS_DIR).filter((f) => f.endsWith('.vue'))) {
    const text = read(join(ICONS_DIR, f))
    for (const m of text.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/gs)) ids.push(m[1])
  }
  return ids
}

function iconDocStats() {
  const text = read(ICON_DOC)
  const stated = /(?:全部|全量)\s*(\d+)\s*(?:个图标|个 symbol|枚 symbol)/.exec(text)
  const appendix = text.split(/^## 附录 A/m)[1] ?? ''
  const rows = [...appendix.matchAll(/^\|\s*\d+\s*\|\s*(?:~~)?(i-[\w-]+)(?:~~)?[^|]*\|/gm)].map(
    (m) => m[1]
  )
  return { stated: stated ? Number(stated[1]) : null, appendixRows: rows.length, appendixIds: rows }
}

const syms = symbolIds()
const iconStats = iconDocStats()
result.icons = {
  symbols: syms.length,
  uniqueSymbols: new Set(syms).size,
  stated: iconStats.stated,
  appendixRows: iconStats.appendixRows,
  duplicateIds: [...new Set(syms.filter((id, i) => syms.indexOf(id) !== i))],
}

// ---------- 5. 术语与体例 ----------
const isChangelog = (f) => f.includes('/changelog/')
const isGlossary = (f) => f.endsWith('references/i18n-en-glossary.md')
const termRules = [
  { key: '连击', re: /连击/g, applies: (f) => !isChangelog(f) && !isGlossary(f) },
  { key: '敌方图鉴', re: /敌方图鉴/g, applies: (f) => !isChangelog(f) && !isGlossary(f) },
  { key: '破折号', re: /——/g, applies: (f) => !isChangelog(f) },
  { key: '内部编号', re: /\b[ABCG]\d-[ABCG]\d+\b/g, applies: (f) => !isChangelog(f) },
  { key: '阶段用语', re: /(?:本阶段|该批|批次)/g, applies: (f) => !isChangelog(f) },
  { key: '审计用语', re: /(?:审计报告|复核记录)/g, applies: (f) => !isChangelog(f) },
]
for (const file of textFiles) {
  const text = read(file)
  for (const rule of termRules) {
    if (!rule.applies(file)) continue
    const hits = [...text.matchAll(rule.re)]
    if (hits.length) {
      const line = text.slice(0, hits[0].index).split('\n').length
      result.terms.push({ file: rel(file), term: rule.key, count: hits.length, line })
    }
  }
}

// ---------- 汇总 ----------
const problems =
  result.anchors.length +
  result.versions.length +
  result.tokens.missingInDoc.length +
  result.tokens.docOnly.length +
  (result.icons.stated !== null && result.icons.stated !== result.icons.symbols ? 1 : 0) +
  (result.icons.uniqueSymbols !== result.icons.symbols ? 1 : 0) +
  result.terms.length

if (JSON_OUT) {
  console.log(JSON.stringify({ problems, ...result }, null, 2))
} else {
  console.log('== 文档一致性检查 ==')
  console.log(`锚点：${result.anchors.length} 条失效`)
  for (const a of result.anchors.slice(0, 20))
    console.log(`  ${a.file} -> ${a.target}（${a.reason}）`)
  console.log(`册头版本：${result.versions.length} 册滞后`)
  for (const v of result.versions)
    console.log(`  ${v.file}：册头 ${v.stamp}，正文最高 ${v.bodyMax}`)
  console.log(
    `令牌：代码 ${result.tokens.code} 项，规范 ${result.tokens.doc} 项，缺 ${result.tokens.missingInDoc.length} 项，多 ${result.tokens.docOnly.length} 项`
  )
  if (result.tokens.missingInDoc.length)
    console.log(`  规范缺：${result.tokens.missingInDoc.join('、')}`)
  if (result.tokens.docOnly.length) console.log(`  规范多：${result.tokens.docOnly.join('、')}`)
  console.log(
    `图标：symbol ${result.icons.symbols} 枚（唯一 ${result.icons.uniqueSymbols}），规范声明 ${result.icons.stated ?? '未解析'}，附录 A ${result.icons.appendixRows} 行`
  )
  if (result.icons.duplicateIds.length)
    console.log(`  重复 id：${result.icons.duplicateIds.join('、')}`)
  console.log(`术语与体例：${result.terms.length} 处`)
  for (const t of result.terms.slice(0, 30))
    console.log(`  ${t.file}:${t.line} ${t.term} ×${t.count}`)
  console.log(`结果：${problems} 项告警`)
}

if (STRICT && problems > 0) process.exit(1)
