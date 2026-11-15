# 手动诊断脚本

本目录存放不进入默认回归清单的探针与走查脚本，按需执行。它们不参与 `run.mjs` 的全量回归与远程重跑集，也不在持续集成中运行。

| 脚本 | 用途 |
| --- | --- |
| `starcore-v079-icon-overlay.mjs` | 科技图标可读性核验，19 枚图标 overlay 截图 |
| `starcore-v091-icon-check.mjs` | 星系层新科技图标可读性与消费点核验 |
| `starcore-v116-locale-fallback-probe.mjs` | 浏览器语言识别与回退探针 |
| `starcore-v117-walkthrough.mjs` | 早期全流程玩家走查 |
| `starcore-v118-icon-overlay.mjs` | 档案馆图标区分度 overlay 对照 |
| `starcore-v124-boss-probe.mjs` | 周首领冒烟探针 |
| `starcore-v126-encounter-probe.mjs` | 随机遭遇事件冒烟探针 |
| `starcore-v133-walkthrough.mjs` | 全玩法走查 |

## 运行方式

先准备构建产物与预览服务：

```bash
corepack pnpm build
corepack pnpm preview --port 4173 --host 127.0.0.1
```

另开终端运行脚本；缺省访问本地预览，设置 `SC_URL` 可指向远程目标：

```bash
node tools/e2e/manual/<脚本>.mjs
SC_URL=https://example.com node tools/e2e/manual/<脚本>.mjs
```

图标类脚本用 `OUT` 指定截图路径，缺省写入系统临时目录。脚本依赖与套件相同，浏览器缺失时先运行 `corepack pnpm diagnose --fix`。
