import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, cpSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const help = `用法：bash install.sh --frontdesk MODEL --worker MODEL [--reviewer MODEL] [--scout MODEL]

MODEL 是 pi --list-models 中的 provider/model，可带 :high、:xhigh 等后缀。
--reviewer 和 --scout 默认与 --worker 相同。
--skip-subagent  复用通过其他路径或包安装的兼容 subagent 扩展
--force          先备份，再覆盖 pi-team 自己的配置与角色文件

安装到 ~/.pi/agent 和 ~/.local/bin，不修改 Pi 的默认模型或凭证。
PI_CODING_AGENT_DIR、PI_TEAM_BIN_DIR 可分别覆盖这两个位置。
已有的 extensions/subagent 扩展始终保留。
`;

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { console.log(help); return; }
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (['--force', '--skip-subagent'].includes(arg)) options[arg] = true;
    else if (['--frontdesk', '--worker', '--reviewer', '--scout'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--') || /[\r\n\0]/.test(value)) throw new Error(`${arg} 需要一个单行模型标识。`);
      options[arg] = value;
    } else throw new Error(`未知参数：${arg}`);
  }
  if (!options['--frontdesk'] || !options['--worker']) throw new Error(help);
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 19)) throw new Error('需要 Node.js 22.19+。');
  const pi = spawnSync('pi', ['--version'], { encoding: 'utf8' });
  if (pi.error || pi.status !== 0) throw new Error('找不到可用的 pi。请先安装 Pi：https://pi.dev');
  const version = pi.stdout.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!version || Number(version[1]) < 1 || (Number(version[1]) === 1 && (Number(version[2]) < 5 || (Number(version[2]) === 5 && Number(version[3]) < 1)))) {
    throw new Error('此版本需要 Pi 1.5.1+；运行 pi update 后重试。');
  }
  const expand = p => resolve(p === '~' ? homedir() : p.startsWith('~/') ? join(homedir(), p.slice(2)) : p);
  const agentDir = expand(process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent'));
  const binDir = expand(process.env.PI_TEAM_BIN_DIR || join(homedir(), '.local', 'bin'));
  const teamDir = join(agentDir, 'pi-team');
  const extensionDir = join(agentDir, 'extensions', 'subagent');
  const read = file => readFileSync(join(root, file), 'utf8');
  const files = new Map([
    [join(binDir, 'pi-team'), read('bin/pi-team')],
    [join(teamDir, 'config.json'), JSON.stringify({ frontdeskModel: options['--frontdesk'] }, null, 2) + '\n'],
    [join(teamDir, 'front-desk.md'), read('front-desk.md')],
  ]);
  for (const role of ['worker', 'reviewer', 'scout']) {
    const model = options[`--${role}`] || options['--worker'];
    files.set(join(agentDir, 'agents', `gpt-${role}.md`), read(`agents/gpt-${role}.md`).replace('__MODEL_JSON__', JSON.stringify(model)));
  }
  const present = file => { try { lstatSync(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
  // Check every destination before writing, so a collision leaves the old setup intact.
  const changes = [];
  for (const [file, content] of files) {
    if (present(file)) {
      if (!lstatSync(file).isFile()) throw new Error(`目标不是普通文件，保留原样：${file}`);
      if (readFileSync(file, 'utf8') === content) continue;
      if (!options['--force']) throw new Error(`已有不同内容：${file}。修改前请备份，或用 --force 自动备份后覆盖。`);
    }
    changes.push([file, content]);
  }
  const existingExtension = ['index.ts', 'index.js'].some(name => existsSync(join(extensionDir, name)));
  const installExtension = !options['--skip-subagent'] && !existingExtension;
  if (installExtension && present(extensionDir)) throw new Error(`subagent 目录存在但没有入口，请检查：${extensionDir}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid;
  for (const [file, content] of changes) {
    mkdirSync(dirname(file), { recursive: true });
    if (present(file)) {
      const backup = `${file}.bak-${stamp}`;
      copyFileSync(file, backup);
      console.log(`备份：${backup}`);
    }
    writeFileSync(file, content, { mode: 0o644 });
  }
  chmodSync(join(binDir, 'pi-team'), 0o755);
  if (installExtension) {
    mkdirSync(dirname(extensionDir), { recursive: true });
    cpSync(join(root, 'vendor', 'subagent'), extensionDir, { recursive: true, errorOnExist: true, force: false });
    console.log(`安装官方 subagent 示例：${extensionDir}`);
  } else console.log('复用已有 subagent 扩展；请确认它在 Pi 中启用。');
  console.log(`安装完成：${join(binDir, 'pi-team')}
配置：${teamDir}
进入项目目录后运行 pi-team。`);
  if (!(process.env.PATH || '').split(':').includes(binDir)) {
    console.log(`请把 ${binDir} 加入 PATH，或使用上面的完整命令路径。`);
  }
}

try { main(); } catch (error) { console.error(`pi-team: ${error.message}`); process.exitCode = 1; }
