import { expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { publish } from '../scripts/deploy.ts';
import { handleMissingFile } from '../src/lib/prerender.ts';
import { read } from './helpers.ts';

interface Step {
  readonly name?: string;
  readonly if?: string;
  readonly uses?: string;
  readonly run?: string;
  readonly with?: Readonly<Record<string, unknown>>;
  readonly env?: Readonly<Record<string, string>>;
  readonly 'continue-on-error'?: unknown;
}
interface Job {
  readonly if?: string;
  readonly needs?: string | readonly string[];
  readonly env?: unknown;
  readonly permissions?: unknown;
  readonly uses?: string;
  readonly steps: readonly Step[];
  readonly 'continue-on-error'?: unknown;
}
interface Workflow {
  readonly on: Readonly<Record<string, unknown>>;
  readonly env?: unknown;
  readonly permissions?: unknown;
  readonly jobs: Readonly<Record<string, Job>>;
}

const workflowFiles = readdirSync('.github/workflows').filter((file) => /\.ya?ml$/.test(file));
const workflow = (file: string) => parse(read(`.github/workflows/${file}`)) as Workflow;
// A job that calls a reusable workflow has `uses` and no steps.
const stepsOf = (file: string) => Object.values(workflow(file).jobs).flatMap(({ steps }) => steps ?? []);
const runIndex = (steps: readonly Step[], command: string) => steps.findIndex(({ run }) => run === command);
const usesIndex = (steps: readonly Step[], action: string) => steps.findIndex(({ uses }) => uses?.startsWith(`actions/${action}@`));

test('every workflow reads the repository only, pins its actions and keeps no credentials', () => {
  expect(workflowFiles.length).toBeGreaterThan(0);
  for (const file of workflowFiles) {
    expect({ file, permissions: workflow(file).permissions }).toEqual({ file, permissions: { contents: 'read' } });
    for (const [name, job] of Object.entries(workflow(file).jobs)) {
      if (job.uses) expect(job.uses).toMatch(/@[0-9a-f]{40}$/);
      // The failure alert is the one job allowed more, and its own test holds it to issues alone.
      if (`${file}/${name}` !== 'deploy.yml/alert') expect({ file, name, permissions: job.permissions }).toEqual({ file, name, permissions: undefined });
    }
    for (const { uses, with: inputs } of stepsOf(file)) {
      if (!uses) continue;
      expect(uses).toMatch(/@[0-9a-f]{40}$/);
      if (uses.startsWith('actions/checkout@')) expect(inputs?.['persist-credentials']).toBe(false);
    }
  }
});

test('a failed check or test stops its workflow', () => {
  for (const file of ['ci.yml', 'deploy.yml']) {
    for (const job of Object.values(workflow(file).jobs)) {
      expect(job['continue-on-error']).toBeUndefined();
      expect(job.steps.filter((step) => step['continue-on-error'] !== undefined)).toEqual([]);
      const checks = job.steps.filter(({ run }) => run === 'bun run check' || run === 'bun run test');
      expect(checks.filter((step) => step.if !== undefined)).toEqual([]);
    }
  }
});

test('pull requests and main run the check and the tests', () => {
  const ci = workflow('ci.yml');
  expect(Object.keys(ci.on)).toEqual(expect.arrayContaining(['push', 'pull_request']));
  const steps = stepsOf('ci.yml');
  expect(runIndex(steps, 'bun run check')).toBeGreaterThan(-1);
  expect(runIndex(steps, 'bun run test')).toBeGreaterThan(-1);
});

test('publishing stays off unless enabled, and only ever publishes main', () => {
  const { build, deploy } = workflow('deploy.yml').jobs;
  expect(build.if).toContain("vars.DEPLOY_ENABLED == 'true'");
  expect(build.if).toContain("github.ref == 'refs/heads/main'");
  expect(build.if).not.toContain('||');
  expect(deploy.needs).toBe('build');
  expect(deploy.if).toBeUndefined();
});

test('only what passed the check and the tests is uploaded', () => {
  const { build, deploy } = workflow('deploy.yml').jobs;
  const check = runIndex(build.steps, 'bun run check');
  const tests = runIndex(build.steps, 'bun run test');
  expect(check).toBeGreaterThan(-1);
  expect(tests).toBeGreaterThan(check);
  expect(usesIndex(build.steps, 'upload-artifact')).toBeGreaterThan(tests);
  const download = usesIndex(deploy.steps, 'download-artifact');
  expect(download).toBeGreaterThan(-1);
  expect(runIndex(deploy.steps, 'bun scripts/deploy.ts')).toBeGreaterThan(download);
  expect(runIndex(deploy.steps, 'bun run build')).toBe(-1);
});

test('the deploy credentials reach the upload step alone, with no dependency scripts beside them', () => {
  const file = workflow('deploy.yml');
  expect(file.env).toBeUndefined();
  const seeing = Object.values(file.jobs).flatMap(({ env, steps }) => {
    expect(env).toBeUndefined();
    return steps.filter((step) => JSON.stringify(step).includes('secrets.'));
  });
  expect(seeing.map(({ run }) => run)).toEqual(['bun scripts/deploy.ts']);
  expect(file.jobs.deploy.steps.some(({ run }) => run === 'bun install --frozen-lockfile --ignore-scripts')).toBe(true);
  expect(file.jobs.deploy.steps.some(({ run }) => run === 'bun install --frozen-lockfile')).toBe(false);
});

test('a failed publish opens an issue, from a job that runs no repository code', () => {
  const { alert, build, deploy } = workflow('deploy.yml').jobs;
  expect(alert.if).toBe('failure()');
  expect(alert.needs).toEqual(['build', 'deploy']);
  expect(alert.permissions).toEqual({ issues: 'write' });
  expect(alert.steps.filter(({ uses }) => uses)).toEqual([]);
  expect(alert.steps.map(({ run }) => run).join()).toContain('gh issue create');
  for (const job of [build, deploy]) expect(job.permissions).toBeUndefined();
});

test('the upload refuses the sample address before running anything', () => {
  const calls: string[][] = [];
  const run = (command: string[]) => { calls.push(command); return { exitCode: 0 }; };
  expect(() => publish({ origin: 'https://example.invalid', slug: 'client.site' }, run)).toThrow('real origin');
  expect(calls).toEqual([]);
});

test('the upload names its Worker and reports a failure', () => {
  const calls: string[][] = [];
  const settings = { origin: 'https://client.example.test', slug: 'client.site' };
  publish(settings, (command) => { calls.push(command); return { exitCode: 0 }; });
  expect(calls).toHaveLength(1);
  expect(calls[0].slice(-2)).toEqual(['--name', 'client-site']);
  expect(() => publish(settings, () => ({ exitCode: 1 }))).toThrow('upload failed');
});

test('a link or photo missing from Owner content warns, and any other build failure still stops', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    expect(() => handleMissingFile({ status: 404, message: 'gone' })).not.toThrow();
  } finally {
    console.warn = warn;
  }
  expect(() => handleMissingFile({ status: 500, message: 'broken' })).toThrow('broken');
  const config = read('vite.config.ts');
  expect(config).toContain('handleHttpError: handleMissingFile');
  expect(config).toContain("handleMissingId: 'warn'");
});

test('the built site carries its security headers', () => {
  const headers = read('build/_headers');
  expect(headers).toContain('/*');
  expect(headers).toContain('X-Content-Type-Options: nosniff');
  expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin');
  expect(headers).toContain('X-Frame-Options: DENY');
});
