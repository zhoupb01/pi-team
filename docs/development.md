# 开发与来源

[回到 README](../README.md)

## 本地检查

在仓库根目录运行：

```bash
node --test tests/*.test.mjs
bash -n install.sh
```

测试用临时目录和模拟的 Pi，不需要 API Key，也不会实际调用模型。
它们会检查这些事：

- 全新安装、重复安装，以及提示词正文是否保持原样。
- 文件冲突能否在写入前拦住，`--force` 是否先备份。
- 已有 subagent 扩展是否保留，`--skip-subagent` 是否生效。
- 模型参数检查，以及 reviewer 和 scout 省略时是否沿用 worker。
- 启动时是否保留项目目录、参数原文、模型选择和 Pi 退出状态。
- 本地检查、帮助，以及缺少配置时的报错。

`bash -n` 只检查安装脚本的 shell 语法。
这些检查通过，不能说明真实凭证或模型服务可用。实际调用要按 README 再试一次。

[GitHub Actions](../.github/workflows/test.yml) 会在 macOS 和 Ubuntu 上跑同样两条命令，使用 Node.js 22.19.0。

## 文件分工

| 文件 | 做什么 |
| --- | --- |
| [install.sh](../install.sh) | 找到 Node，转交安装器 |
| [scripts/install.mjs](../scripts/install.mjs) | 检查版本和冲突，备份并安装文件 |
| [bin/pi-team](../bin/pi-team) | 读配置，加载提示词，启动 Pi |
| [tests/install.test.mjs](../tests/install.test.mjs) | 用隔离目录检查安装和启动行为 |

## 提示词

这个项目把作者原来的 `pi-desk` 工作流打包，方便其他 Pi 用户安装。
下面四份提示词从作者的 `pi-desk` 提示词起步，后来加了第三个角色和记忆交接：

- [front-desk.md](../front-desk.md)
- [agents/gpt-worker.md](../agents/gpt-worker.md)
- [agents/gpt-reviewer.md](../agents/gpt-reviewer.md)
- [agents/gpt-scout.md](../agents/gpt-scout.md)

三个 agent 顶部的 `model:` 是安装占位符。安装时填入你传的模型标识。
你要自定义工作流，可以改自己安装后的副本。

提示词里的模型评价来自作者原来的用法，不保证哪个模型永远更可靠。
你判断任务有没有做好，还是要看代码、测试和实际结果。

## subagent 来源

[vendor/subagent](../vendor/subagent/) 里的扩展来自 [earendil-works/pi v1.5.1 的官方示例](https://github.com/earendil-works/pi/tree/v1.5.1/packages/coding-agent/examples/extensions/subagent)。
`index.ts` 和 `agents.ts` 保持上游原样。

具体版本、来源、tag 和 SHA-256 哈希，都放在 [UPSTREAM.md](../vendor/subagent/UPSTREAM.md)。
哈希可以用来核对文件是否变过。在仓库根目录运行：

```bash
shasum -a 256 vendor/subagent/index.ts vendor/subagent/agents.ts
```

## 许可证

本项目用 [MIT 许可证](../LICENSE)。
随附的上游代码另保留一份 [MIT 许可证](../vendor/subagent/LICENSE)，版权归原作者。
