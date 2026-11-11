import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const models = ['--frontdesk', 'example/deepseek:max', '--worker', 'example/gpt:high', '--reviewer', 'example/gpt:xhigh', '--scout', 'example/gpt:low'];

function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'pi-team test 空格-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'bin');
  const agent = join(dir, 'agent');
  const project = join(dir, 'project');
  mkdirSync(bin); mkdirSync(project);
  writeFileSync(join(bin, 'pi'), `#!/usr/bin/env node
if (process.argv[2] === '--version') console.log('1.5.1');
else {
  console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), agentDir: process.env.PI_CODING_AGENT_DIR }));
  process.exitCode = Number(process.env.FAKE_PI_EXIT || 0);
}
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, PI_CODING_AGENT_DIR: agent, PI_TEAM_BIN_DIR: bin };
  const run = (cmd, args, overrides = {}) => spawnSync(cmd, args, { cwd: project, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10000 });
  const install = (...args) => run('bash', [join(root, 'install.sh'), ...models, ...args]);
  const launch = (args = [], overrides = {}) => run(join(bin, 'pi-team'), args, overrides);
  return { dir, bin, agent, project, run, install, launch };
}

function ok(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('fresh install is self-contained, preserves prompt bodies, and is repeatable', t => {
  const s = setup(t);
  ok(s.install());
  const config = JSON.parse(readFileSync(join(s.agent, 'pi-team/config.json')));
  assert.equal(config.frontdeskModel, 'example/deepseek:max');
  for (const [role, model] of [['worker', 'example/gpt:high'], ['reviewer', 'example/gpt:xhigh'], ['scout', 'example/gpt:low']]) {
    const template = readFileSync(join(root, `agents/gpt-${role}.md`), 'utf8');
    const installed = readFileSync(join(s.agent, `agents/gpt-${role}.md`), 'utf8');
    assert.equal(installed, template.replace('__MODEL_JSON__', JSON.stringify(model)));
  }
  assert.equal(readFileSync(join(s.agent, 'pi-team/front-desk.md'), 'utf8'), readFileSync(join(root, 'front-desk.md'), 'utf8'));
  assert.ok(existsSync(join(s.agent, 'extensions/subagent/index.ts')));
  assert.ok(existsSync(join(s.agent, 'extensions/subagent/LICENSE')));
  ok(s.install());
  assert.equal(readdirSync(join(s.agent, 'pi-team')).some(f => f.includes('.bak-')), false);
  ok(s.launch(['--team-check']));
});

test('launcher preserves cwd, literal arguments, model choice and Pi exit status', t => {
  const s = setup(t);
  const model = 'provider/model:high`literal`$(literal)';
  ok(s.install('--frontdesk', model));
  const message = 'quotes " and $HOME and `echo nope`\nsecond line';
  const result = s.launch(['--print', message, '--session', 'name with spaces']);
  ok(result);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.args, [
    '--model', model,
    '--append-system-prompt', join(s.agent, 'pi-team/front-desk.md'),
    '--tools', '+subagent', '--print', message, '--session', 'name with spaces',
  ]);
  assert.equal(output.cwd, realpathSync(s.project));
  assert.equal(output.agentDir, s.agent);
  assert.equal(s.launch([], { FAKE_PI_EXIT: '7' }).status, 7);
});

test('launcher requires all three role files for launch and local checks', t => {
  const s = setup(t);
  ok(s.install());
  for (const role of ['worker', 'reviewer', 'scout']) {
    const file = join(s.agent, `agents/gpt-${role}.md`);
    const content = readFileSync(file, 'utf8');
    rmSync(file);
    for (const args of [[], ['--team-check']]) {
      const result = s.launch(args);
      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes(`缺少文件：${file}`));
    }
    writeFileSync(file, content);
  }
});

test('collision is detected before writes; force backs up customized files', t => {
  const s = setup(t);
  mkdirSync(join(s.agent, 'agents'), { recursive: true });
  const file = join(s.agent, 'agents/gpt-worker.md');
  writeFileSync(file, 'my existing agent\n');
  const blocked = s.install();
  assert.equal(blocked.status, 1);
  assert.equal(readFileSync(file, 'utf8'), 'my existing agent\n');
  assert.equal(existsSync(join(s.bin, 'pi-team')), false);
  assert.equal(existsSync(join(s.agent, 'pi-team')), false);
  ok(s.install('--force'));
  const backup = readdirSync(dirname(file)).find(f => f.startsWith('gpt-worker.md.bak-'));
  assert.ok(backup);
  assert.equal(readFileSync(join(dirname(file), backup), 'utf8'), 'my existing agent\n');
});

test('existing subagent is preserved, including with force; external extension can be skipped', t => {
  const s = setup(t);
  mkdirSync(join(s.agent, 'extensions/subagent'), { recursive: true });
  const ext = join(s.agent, 'extensions/subagent/index.ts');
  writeFileSync(ext, '// user extension\n');
  ok(s.install('--force'));
  assert.equal(readFileSync(ext, 'utf8'), '// user extension\n');
  assert.equal(existsSync(join(s.agent, 'extensions/subagent/agents.ts')), false);
  const otherAgent = join(s.dir, 'other agent');
  const otherBin = join(s.dir, 'other bin');
  ok(s.run('bash', [join(root, 'install.sh'), ...models, '--skip-subagent'], { PI_CODING_AGENT_DIR: otherAgent, PI_TEAM_BIN_DIR: otherBin }));
  assert.equal(existsSync(join(otherAgent, 'extensions/subagent')), false);
});

test('missing models, multiline values and partial extension directories fail before writes', t => {
  const s = setup(t);
  assert.equal(s.run('bash', [join(root, 'install.sh')]).status, 1);
  assert.equal(s.install('--worker', 'bad\nmodel').status, 1);
  mkdirSync(join(s.agent, 'extensions/subagent'), { recursive: true });
  assert.equal(s.install().status, 1);
  assert.equal(existsSync(join(s.bin, 'pi-team')), false);
});

test('reviewer and scout default to worker; launcher reports missing configuration and supports standalone help', t => {
  const s = setup(t);
  ok(s.run('bash', [join(root, 'install.sh'), '--frontdesk', 'provider/front', '--worker', 'provider/worker:high']));
  for (const role of ['reviewer', 'scout']) {
    assert.match(readFileSync(join(s.agent, `agents/gpt-${role}.md`), 'utf8'), /model: "provider\/worker:high"/);
  }
  rmSync(join(s.agent, 'pi-team/config.json'));
  assert.equal(s.launch().status, 1);
  ok(s.launch(['--team-help']));
});
