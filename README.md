# pi-team

给 Pi 加一个前台和两位模型搭档。你跟 DeepSeek 说需求，GPT 负责开发和审查。

## 三步用起来

**1. 准备 Pi 和模型**

- 用 macOS、Linux，或 Windows 的 WSL。装好 [Pi](https://pi.dev) 1.5.1+ 和 Node.js 22.19+。安装器会检查版本。
- 在 Pi 里配好 DeepSeek、GPT 的提供商和凭证。你用自己的账号。
- 用 `pi --list-models` 找模型标识。参数写成 `provider/model[:thinking]`，思考等级要选模型支持的。

可选：你有通用规则，就放在 `~/.codex/AGENTS.md`。启动器只在文件存在时加载它。

**2. 安装 pi-team**

```bash
git clone https://github.com/zhoupb01/pi-team.git
cd pi-team
bash install.sh \
  --frontdesk 'YOUR_PROVIDER/YOUR_DEEPSEEK_MODEL:max' \
  --worker 'YOUR_PROVIDER/YOUR_GPT_MODEL:high' \
  --reviewer 'YOUR_PROVIDER/YOUR_GPT_MODEL:xhigh'
```

把占位符换成你的模型标识。省略 `--reviewer` 时，沿用 `--worker` 的完整配置。

> 已有同名 agent 且内容不同时，安装会在写入前停止。加 `--force` 会先备份，再覆盖。
> 已有 subagent 扩展不管加不加 `--force` 都不会被覆盖。复用其他路径的扩展，见[安装与维护](docs/maintenance.md)。

把 `export PATH="$HOME/.local/bin:$PATH"` 加到 `~/.zshrc` 或 `~/.bashrc`，在当前终端也执行一次。

**3. 检查，然后进入你的项目**

```bash
pi-team --team-check
cd /path/to/your-project
pi-team
```

`--team-check` 只查本地文件，不验证凭证、模型服务或扩展是否启用。

## 用之前必须知道

- **提示词不是沙箱。** 前台能改文件。reviewer 没有 `edit/write`，但有 `bash`，不能保证只读。
- 角色共享工作区。别让多个角色同时改同一个文件。
- 提示词要求 worker 不 commit、不 push。前台做这些操作前会问你。
- 两个 GPT 角色用到的 `codex_search` 不在本仓库里。要搜网页，你得另装兼容工具。
- 模型调用花你自己的额度。并行和审查都会增加调用。

## 先跑一个只读任务

在有 `package.json` 的项目里，你可以这样说：

> 请用 gpt-reviewer 检查这个项目的 package.json，列出 scripts；然后你自己核对一次。不要修改文件。

看工具输出，确认调用了 `gpt-reviewer` 和你选的模型。这一步才会实际调用模型。

## 装完之后文件在哪

| 默认路径 | 用途 |
| --- | --- |
| `~/.local/bin/pi-team` | 启动命令 |
| `~/.pi/agent/pi-team/config.json` | 前台模型配置 |
| `~/.pi/agent/pi-team/front-desk.md` | 前台提示词 |
| `~/.pi/agent/agents/gpt-worker.md` | 开发角色的提示词和模型 |
| `~/.pi/agent/agents/gpt-reviewer.md` | 审查角色的提示词和模型 |

## 进阶

- [怎么用](docs/usage.md)：分工、常用参数、改模型、加搭档。
- [安装与维护](docs/maintenance.md)：扩展、自定义目录、更新、从 pi-desk 迁移、卸载。
- [开发与来源](docs/development.md)：测试、原版提示词、上游代码和许可证。

[MIT 许可证](LICENSE)
