#!/usr/bin/env node
/**
 * run.mjs：星核纪元 · 端到端诊断运行器
 *
 * 对本地预览或远程目标运行回归脚本集；默认自动管理本地预览服务的启停。
 *
 * 用法：
 *   node tools/e2e/run.mjs                    # 本地全量回归（自动起停预览，端口自 4173 起自动选择空闲）
 *   node tools/e2e/run.mjs --core             # 本地核心 12（日常与合并前）
 *   node tools/e2e/run.mjs --jobs 2           # 本地全量两路并行
 *   node tools/e2e/run.mjs --remote <URL>     # 对远程目标运行重跑集
 *   node tools/e2e/run.mjs <脚本> [...]        # 运行任意脚本清单（默认本地预览）
 *
 * 选项：
 *   --remote <URL>   指定远程目标（等价于设置 SC_URL 环境变量）
 *   --port <N>       指定本地预览端口（缺省自 4173 起自动寻找空闲端口）
 *   --jobs <N>       并行脚本数（缺省 1，建议不超过 CPU 核数）
 *   --core           只跑核心 12（全部包含在远程重跑集，本地/远程通用）
 *   --no-start       不管理预览服务，使用已运行中的本地预览（PREVIEW_URL 可指定）
 *   --log-dir <DIR>  日志目录（缺省：系统临时目录下 starcore-e2e）
 *   --help           显示本说明
 *
 * 退出码：0 = 全部通过；1 = 存在失败项
 */
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const E2E_DIR = path.join(ROOT, 'tools', 'e2e')

// 清单：本地全量回归（39）/ 远程重跑（33），
const SUITE = [
  'starcore-baseline-regress.mjs',
  'starcore-v045-release.mjs',
  'starcore-v046-empty-states.mjs',
  'starcore-v048-training-slots.mjs',
  'starcore-v049-action-queue.mjs',
  'starcore-v056-infinite-tree.mjs',
  'starcore-v057-achievements.mjs',
  'starcore-v058-automation.mjs',
  'starcore-map-layers.mjs',
  'starcore-v060-endless.mjs',
  'starcore-v061-relic-fusion.mjs',
  'starcore-v062-daily.mjs',
  'starcore-v077-ui-fixes.mjs',
  'starcore-v078-hygiene.mjs',
  'starcore-v081-save-safety.mjs',
  'starcore-v082-wiring.mjs',
  'starcore-v083-guard.mjs',
  'starcore-v084-hygiene.mjs',
  'starcore-smoke.mjs',
  'starcore-v0863-import-confirm.mjs',
  'starcore-v0863-offline-report.mjs',
  'starcore-v095-error-fallback.mjs',
  'starcore-v095-nav-a11y.mjs',
  'starcore-v115-en-locale.mjs',
  'starcore-v118-archive.mjs',
  'starcore-v122-achievements.mjs',
  'starcore-v123-formation-traits.mjs',
  'starcore-v124-weekly-boss.mjs',
  'starcore-v126-encounter.mjs',
  'starcore-v127-dispatch.mjs',
  'starcore-v135-save-integrity.mjs',
  'starcore-v155-ceremony.mjs',
  'starcore-v156-battle-replay.mjs',
  'starcore-v172-echo.mjs',
  'starcore-archive-groups.mjs',
  'starcore-v181-imperial-ui.mjs',
  'starcore-v182-imperial-audit.mjs',
  'starcore-v183-imperial-forge.mjs',
  'starcore-boot-screen.mjs',
]

// 核心 12：启动与版本、主循环、存档、守卫、帝庭线；全部在 REMOTE 中，保证本地/线上通用
const CORE = [
  'starcore-v045-release.mjs',
  'starcore-v056-infinite-tree.mjs',
  'starcore-v057-achievements.mjs',
  'starcore-v058-automation.mjs',
  'starcore-v062-daily.mjs',
  'starcore-v081-save-safety.mjs',
  'starcore-v082-wiring.mjs',
  'starcore-v083-guard.mjs',
  'starcore-v135-save-integrity.mjs',
  'starcore-v181-imperial-ui.mjs',
  'starcore-v183-imperial-forge.mjs',
  'starcore-boot-screen.mjs',
]

const REMOTE = [
  'starcore-v045-release.mjs',
  'starcore-v056-infinite-tree.mjs',
  'starcore-v057-achievements.mjs',
  'starcore-v058-automation.mjs',
  'starcore-v060-endless.mjs',
  'starcore-v062-daily.mjs',
  'starcore-v081-save-safety.mjs',
  'starcore-v082-wiring.mjs',
  'starcore-v083-guard.mjs',
  'starcore-v084-hygiene.mjs',
  'starcore-v086-bulk-upgrade.mjs',
  'starcore-v0863-import-confirm.mjs',
  'starcore-v0863-offline-report.mjs',
  'starcore-v087-security.mjs',
  'starcore-map-layers.mjs',
  'starcore-v095-error-fallback.mjs',
  'starcore-v095-nav-a11y.mjs',
  'starcore-v115-en-locale.mjs',
  'starcore-v118-archive.mjs',
  'starcore-v122-achievements.mjs',
  'starcore-v123-formation-traits.mjs',
  'starcore-v124-weekly-boss.mjs',
  'starcore-v126-encounter.mjs',
  'starcore-v127-dispatch.mjs',
  'starcore-v135-save-integrity.mjs',
  'starcore-v155-ceremony.mjs',
  'starcore-v156-battle-replay.mjs',
  'starcore-v172-echo.mjs',
  'starcore-archive-groups.mjs',
  'starcore-v181-imperial-ui.mjs',
  'starcore-v183-imperial-forge.mjs',
  'starcore-v182-imperial-audit.mjs',
  'starcore-boot-screen.mjs',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function printHelp() {
  console.log(`星核纪元 · 端到端诊断运行器

用法：
  node tools/e2e/run.mjs                    本地全量回归（自动起停预览，自动选择空闲端口）
  node tools/e2e/run.mjs --core             本地核心 12（日常与合并前）
  node tools/e2e/run.mjs --jobs 2           本地全量两路并行
  node tools/e2e/run.mjs --remote <URL>     对远程目标运行重跑集
  node tools/e2e/run.mjs <脚本> [...]        运行任意脚本清单（默认本地预览）

选项：
  --remote <URL>    指定远程目标（等价于设置 SC_URL 环境变量）
  --port <N>        指定本地预览端口（缺省自 4173 起自动寻找空闲端口）
  --jobs <N>        并行脚本数（缺省 1，建议不超过 CPU 核数）
  --core            只跑核心 12（全部包含在远程重跑集，本地/远程通用）
  --no-start        不管理预览服务，使用已运行中的本地预览（PREVIEW_URL 可指定）
  --log-dir <DIR>   日志目录（缺省：系统临时目录下 starcore-e2e）
  --help            显示本说明`)
}

// 参数解析
const argv = process.argv.slice(2)
let remote = process.env.SC_URL || null
let port = null
let noStart = false
let logDir = path.join(os.tmpdir(), 'starcore-e2e')
let jobs = 1
let core = false
const scripts = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--') continue
  else if (a === '--remote') {
    const v = argv[++i]
    if (!v || v.startsWith('--')) {
      console.error('--remote 需要一个地址参数')
      process.exit(2)
    }
    remote = v
  } else if (a === '--port') {
    port = Number(argv[++i])
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      console.error('--port 需要一个有效端口号')
      process.exit(2)
    }
  } else if (a === '--jobs') {
    jobs = Number(argv[++i])
    if (!Number.isInteger(jobs) || jobs < 1 || jobs > 8) {
      console.error('--jobs 需要 1 到 8 的整数')
      process.exit(2)
    }
  } else if (a === '--core') core = true
  else if (a === '--no-start') noStart = true
  else if (a === '--log-dir') {
    const v = argv[++i]
    if (!v) {
      console.error('--log-dir 需要一个目录路径')
      process.exit(2)
    }
    logDir = v
  } else if (a === '--help' || a === '-h') {
    printHelp()
    process.exit(0)
  } else if (a.startsWith('--')) {
    console.error(`未知选项：${a}`)
    printHelp()
    process.exit(2)
  } else scripts.push(a)
}

const mode = remote ? 'remote' : 'local'
if (core && scripts.length) {
  console.error('--core 不能与脚本清单同时使用')
  process.exit(2)
}
const list = scripts.length ? scripts : core ? CORE : mode === 'remote' ? REMOTE : SUITE

for (const s of list) {
  if (!fs.existsSync(path.join(E2E_DIR, s))) {
    console.error(`脚本不存在：${s}`)
    process.exit(2)
  }
}

// 预览服务生命周期
let previewProc = null
const activeChildren = new Set()

function freePort(start) {
  return new Promise((resolve, reject) => {
    let p = start
    const probe = () => {
      if (p > start + 100) return reject(new Error(`未找到空闲端口（自 ${start} 起）`))
      const srv = net.createServer()
      srv.once('error', () => {
        p += 1
        probe()
      })
      srv.once('listening', () => srv.close(() => resolve(p)))
      srv.listen(p, '127.0.0.1')
    }
    probe()
  })
}

function portFree(p) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(p, '127.0.0.1')
  })
}

async function reachable(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) })
    return r.status >= 200 && r.status < 500
  } catch {
    return false
  }
}

async function waitForUp(url, totalMs) {
  const end = Date.now() + totalMs
  while (Date.now() < end) {
    if (await reachable(url + '/')) return true
    await sleep(400)
  }
  return false
}

async function startPreview(pickPort) {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.error('dist/ 未生成：先运行 `corepack pnpm build` 或 `corepack pnpm diagnose --fix`。')
    process.exit(2)
  }
  const p = pickPort || (await freePort(4173))
  const log = fs.openSync(path.join(logDir, 'preview.log'), 'w')
  previewProc = spawn('corepack', ['pnpm', 'preview', '--port', String(p), '--host', '127.0.0.1'], {
    cwd: ROOT,
    detached: process.platform !== 'win32',
    stdio: ['ignore', log, log],
  })
  const url = `http://127.0.0.1:${p}`
  if (!(await waitForUp(url, 60000))) {
    console.error(`预览服务启动失败（详见 ${path.join(logDir, 'preview.log')}）。`)
    await stopPreview(p)
    process.exit(2)
  }
  return { url, port: p }
}

async function stopPreview(p) {
  const proc = previewProc
  if (!proc) return
  previewProc = null
  try {
    if (process.platform !== 'win32') process.kill(-proc.pid, 'SIGTERM')
    else proc.kill('SIGTERM')
  } catch {
    /* 已退出 */
  }
  if (p) {
    for (let i = 0; i < 20; i++) {
      await sleep(200)
      if (await portFree(p)) return
    }
    try {
      if (process.platform !== 'win32') process.kill(-proc.pid, 'SIGKILL')
      else proc.kill('SIGKILL')
    } catch {
      /* 忽略 */
    }
  }
}

let targetPort = null
let cleaningUp = false
let interrupted = false
async function cleanup() {
  if (cleaningUp) return
  cleaningUp = true
  for (const child of activeChildren) {
    try {
      child.kill('SIGTERM')
    } catch {
      /* 已退出 */
    }
  }
  await stopPreview(targetPort)
}
process.on('SIGINT', () => {
  interrupted = true
  cleanup().finally(() => process.exit(130))
})
process.on('SIGTERM', () => {
  interrupted = true
  cleanup().finally(() => process.exit(143))
})

// 单脚本执行：独立日志文件，子进程退出后汇总
function runScript(s, env) {
  const logPath = path.join(logDir, `${s}.log`)
  return new Promise((resolve) => {
    let fd
    let settled = false
    const done = (ok) => {
      if (settled) return
      settled = true
      try {
        if (fd !== undefined) fs.closeSync(fd)
      } catch {
        /* 已关闭 */
      }
      resolve(ok)
    }
    try {
      fd = fs.openSync(logPath, 'w')
      const child = spawn('node', [s], { cwd: E2E_DIR, env, stdio: ['ignore', fd, fd] })
      activeChildren.add(child)
      child.on('error', (err) => {
        console.error(`  [启动失败] ${s}: ${err.message}`)
        activeChildren.delete(child)
        done(false)
      })
      child.on('close', (code) => {
        activeChildren.delete(child)
        done(code === 0)
      })
    } catch (err) {
      console.error(`  [启动失败] ${s}: ${err.message}`)
      done(false)
    }
  })
}

// 主流程
async function main() {
  let target
  if (mode === 'remote') {
    target = remote.replace(/\/+$/, '')
    if (!(await waitForUp(target, 8000))) {
      console.error(`远程目标不可达：${target}`)
      process.exit(2)
    }
  } else if (noStart) {
    target = (process.env.PREVIEW_URL || `http://127.0.0.1:${port || 4173}`).replace(/\/+$/, '')
    if (!(await waitForUp(target, 8000))) {
      console.error(`本地预览不可达：${target}（先启动预览，或去掉 --no-start 由运行器自动起停）。`)
      process.exit(2)
    }
  } else {
    const started = await startPreview(port)
    target = started.url
    targetPort = started.port
  }

  console.log('===== 星核纪元 · 端到端诊断 =====')
  const setName = core ? (mode === 'remote' ? '核心 · 远程' : '核心') : mode === 'remote' ? '远程重跑' : '本地回归'
  console.log(`模式：${setName}（${list.length} 个脚本）`)
  console.log(`目标：${target}`)
  console.log(`并发：${jobs}${jobs > 1 ? ' 路' : ''}`)
  console.log(`日志：${logDir}`)
  console.log('')

  const env = { ...process.env }
  if (mode === 'remote') {
    env.SC_URL = target
    delete env.PREVIEW_URL
  } else {
    env.PREVIEW_URL = target
    delete env.SC_URL
  }

  let pass = 0
  let fail = 0
  const failed = []
  let cursor = 0
  const worker = async () => {
    while (true) {
      if (interrupted) return
      const i = cursor++
      if (i >= list.length) return
      const s = list[i]
      const ok = await runScript(s, env)
      if (interrupted) return
      if (ok) {
        console.log(`PASS  ${s}`)
        pass += 1
      } else {
        console.log(`FAIL  ${s}`)
        fail += 1
        failed.push(s)
      }
    }
  }
  const workerCount = Math.min(jobs, list.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  await cleanup()
  if (interrupted) return

  console.log('')
  console.log(
    `E2E_DONE mode=${mode} target=${target} pass=${pass} fail=${fail} log_dir=${logDir}${failed.length ? ` failed:[${failed.join(' ')}]` : ''}`
  )
  if (failed.length)
    console.log(`失败脚本的明细日志见 ${logDir}/<脚本名>.log（搜「✗」定位失败项）。`)
  process.exit(fail ? 1 : 0)
}

// 日志目录准备（仅清理同名 .log，不动目录内其他文件），
fs.mkdirSync(logDir, { recursive: true })
for (const f of fs.readdirSync(logDir)) {
  if (f.endsWith('.log')) fs.rmSync(path.join(logDir, f))
}

main()
