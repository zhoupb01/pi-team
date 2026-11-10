# 安装与维护

[回到 README](../README.md)

第一次装，先走 [README 的三步](../README.md#三步用起来)。这里放不常用的操作。

## 安装器会做什么

安装器会检查 Node.js 22.19+ 和 Pi 1.5.1+，再复制启动器、配置和角色文件。
新环境还会装上仓库随附的 subagent 扩展。你不用额外跑 `npm install`。

文件内容相同，可以重复安装。已有文件内容不同，安装器会在写入前停止。
这也包括你原来就有的同名 `gpt-worker.md` 和 `gpt-reviewer.md`。
加 `--force` 后，会先在每个要覆盖的文件旁备份，再写入新内容。
备份名是原文件名加 `.bak-时间戳-进程号`。已有 subagent 扩展始终保留。

安装器不会改普通 Pi 的默认模型、凭证、个人规则或现有 `pi-desk` 启动器。
不过，角色和 subagent 扩展是共享的，普通 Pi 和旧工作流也能用到它们。
安装完成后，你可以移动或删除仓库副本。下次更新时再准备一份即可。

## subagent 扩展

默认位置是 `~/.pi/agent/extensions/subagent/`。
那里已有 `index.ts` 或 `index.js` 时，安装器会复用它。加 `--force` 也不会覆盖。
如果目录已存在却没有这两个入口，安装器会报错。先查看目录内容，再决定如何处理。

如果你通过其他包或路径装了 subagent，安装时加 `--skip-subagent`：

```bash
bash install.sh \
  --frontdesk 'YOUR_PROVIDER/YOUR_DEEPSEEK_MODEL:max' \
  --worker 'YOUR_PROVIDER/YOUR_GPT_MODEL:high' \
  --skip-subagent
```

这里省略了 `--reviewer`，审查角色会沿用开发角色的模型和思考等级。
你的扩展要兼容官方示例的 `agent`、`task`、`tasks`、`agentScope` 参数，以及 Markdown agent 文件格式。
同一个环境只启用一个提供 `subagent` 工具的扩展。

启动 Pi 后，确认扩展已启用，再跑 README 里的首次任务。
`--team-check` 不会替你检查扩展是否启用。

## 自定义目录

`PI_CODING_AGENT_DIR` 决定 Pi 配置、角色和扩展放在哪。安装和启动都认这个变量。
`PI_TEAM_BIN_DIR` 只决定安装时把 `pi-team` 命令放在哪。

```bash
PI_CODING_AGENT_DIR="$HOME/.pi-work/agent" \
PI_TEAM_BIN_DIR="$HOME/bin" \
bash install.sh \
  --frontdesk 'YOUR_PROVIDER/YOUR_DEEPSEEK_MODEL:max' \
  --worker 'YOUR_PROVIDER/YOUR_GPT_MODEL:high'

PI_CODING_AGENT_DIR="$HOME/.pi-work/agent" "$HOME/bin/pi-team" --team-check
PI_CODING_AGENT_DIR="$HOME/.pi-work/agent" "$HOME/bin/pi-team"
```

先把示例里的模型占位符换成你的模型。
自定义 agent 目录需要自己的模型和凭证配置，启动时也要带同一个 `PI_CODING_AGENT_DIR`。
你可以把这两个变量放进 shell 配置，把命令目录加入 PATH。

通用规则仍然用 `~/.codex/AGENTS.md`，不会跟着 agent 目录走。没有这个文件，启动器就跳过它。

## 更新

进入你的仓库副本，拉取新版本，再带上自己的模型配置安装：

```bash
cd /path/to/pi-team
git pull --ff-only
bash install.sh \
  --frontdesk 'YOUR_PROVIDER/YOUR_DEEPSEEK_MODEL:max' \
  --worker 'YOUR_PROVIDER/YOUR_GPT_MODEL:high' \
  --reviewer 'YOUR_PROVIDER/YOUR_GPT_MODEL:xhigh'
```

把路径和模型占位符换成你的。用了自定义目录，就带上原来的环境变量。
安装器不会从旧配置里补齐模型参数，你要把想保留的值传进去。

如果报内容冲突，先看报错里的文件。确认要换成仓库版本后，再加 `--force`：

```bash
bash install.sh \
  --frontdesk 'YOUR_PROVIDER/YOUR_DEEPSEEK_MODEL:max' \
  --worker 'YOUR_PROVIDER/YOUR_GPT_MODEL:high' \
  --reviewer 'YOUR_PROVIDER/YOUR_GPT_MODEL:xhigh' \
  --force
```

这会先备份，再覆盖启动器、配置和有变化的同名角色文件。
你对已安装提示词的修改也会被覆盖，需要从备份里找回想保留的部分。
如果你原来用了 `--skip-subagent`，这次也带上它。

已有 subagent 扩展不会随这次更新升级。要升级它，得单独核对上游和你的本地改动。

## 从 pi-desk 迁移

不用先卸载旧 `pi-desk`。先按 README 准备模型和仓库，再查看已有的同名角色。
如果两个文件都在，你可以在 pi-team 仓库里这样对比：

```bash
cd /path/to/pi-team
git diff --no-index -- "$HOME/.pi/agent/agents/gpt-worker.md" agents/gpt-worker.md
git diff --no-index -- "$HOME/.pi/agent/agents/gpt-reviewer.md" agents/gpt-reviewer.md
```

有差异时，`git diff --no-index` 会返回 1，表示发现差异。这两条命令不会改文件。
仓库里的 `model:` 是安装占位符。对比时也要看提示词正文，别只看模型一行。
用了自定义 agent 目录，就把上面的默认路径换掉。

确认你要使用仓库版本后，运行上一节带 `--force` 的完整安装命令。
安装器会先备份同名角色。**旧 pi-desk 如果也调用这些角色，之后会读到更新后的版本。**
已有 subagent 扩展仍会保留。迁移后先用 `pi-team --team-check` 查本地文件，再跑一次只读任务。

## 卸载

下面两条命令删除默认位置的启动器和 pi-team 配置，也会删掉配置目录里的个人修改：

```bash
rm "$HOME/.local/bin/pi-team"
rm -r "$HOME/.pi/agent/pi-team"
```

两个 GPT 角色和 subagent 扩展可能还在供旧 pi-desk 或其他工作流使用。还在用，就保留。
确认不再使用时，再删除这些共享文件：

```bash
rm "$HOME/.pi/agent/agents/gpt-worker.md" "$HOME/.pi/agent/agents/gpt-reviewer.md"
rm -r "$HOME/.pi/agent/extensions/subagent"
```

用了自定义目录，就替换成你的实际路径。旁边的 `.bak-*` 备份按需清理。
