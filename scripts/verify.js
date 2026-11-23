#!/usr/bin/env node
// Runs the plain-English checks in kane/checks.json with Kane CLI against a
// running PathProof, writes kane/last-report.md, and exits 1 if any check fails.
//
//   node scripts/verify.js                 run every check
//   node scripts/verify.js reroute loads   run only these ids
//   node scripts/verify.js --hook          Claude Code Stop hook mode
//
// Hook mode skips work when nothing in the app changed since the last green
// run, and on failure prints {"decision":"block","reason":...} so the agent
// is told what Kane saw and keeps working instead of stopping.
import { spawn, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const hook = args.includes('--hook');
const only = args.filter(a => !a.startsWith('--'));
const url = process.env.PATHPROOF_URL || `http://localhost:${process.env.PORT || 8000}`;
const stateFile = path.join(root, 'kane', '.last-green');
const failFile = path.join(root, 'kane', '.last-fail');
const reportFile = path.join(root, 'kane', 'last-report.md');

function appFingerprint() {
  try {
    const out = execSync('git ls-files -m -o --exclude-standard public lib server.js kane/checks.json', { cwd: root }).toString();
    const head = execSync('git rev-parse HEAD', { cwd: root }).toString();
    const h = createHash('sha1').update(head);
    for (const f of out.split('\n').filter(Boolean).sort()) {
      h.update(f);
      try { h.update(readFileSync(path.join(root, f))); } catch {}
    }
    return h.digest('hex');
  } catch { return String(Date.now()); }
}

function runCheck(check) {
  return new Promise(resolve => {
    const a = ['run', check.objective, '--url', url, '--agent', '--headless',
      '--max-steps', String(check.maxSteps || 30), '--timeout', String(check.timeout || 300),
      '--final-validation', 'on'];
    // On Windows kane-cli is a .cmd shim, so it needs a shell; quote every arg ourselves.
    const win = process.platform === 'win32';
    const q = x => `"${String(x).replace(/"/g, '\\"')}"`;
    const child = win
      ? spawn(['kane-cli', ...a.map(q)].join(' '), { cwd: root, shell: true })
      : spawn('kane-cli', a, { cwd: root });
    const lines = [];
    let buf = '';
    const onData = d => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { lines.push(buf.slice(0, i)); buf = buf.slice(i + 1); }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', code => {
      if (buf) lines.push(buf);
      mkdirSync(path.join(root, 'kane', 'runs'), { recursive: true });
      writeFileSync(path.join(root, 'kane', 'runs', `${check.id}.ndjson`), lines.join(String.fromCharCode(10)));
      const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      // Pull out anything that looks like a verdict, failure or bug from the NDJSON.
      const notes = events
        .filter(e => /fail|error|bug|assert|result|summary|final/i.test(e.type || e.event || ''))
        .map(e => e.message || e.reason || e.summary || e.text || JSON.stringify(e))
        .slice(-8);
      const end = events.filter(e => e.type === 'run_end').pop();
      if (end) {
        const ok = end.status === 'passed';
        const why = [end.summary, end.reason, end.final_state && 'final state: ' + JSON.stringify(end.final_state)].filter(Boolean);
        return resolve({ check, ok, code, notes: why, summary: end.summary });
      }
      const plain = lines.filter(l => !l.startsWith('{')).slice(-8);
      resolve({ check, ok: code === 0, code, notes: notes.length ? notes : plain });
    });
  });
}

async function main() {
  if (hook) {
    // Avoid an endless loop: the Stop hook re-fires after the agent replies.
    const input = (() => { try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; } })();
    const fp = appFingerprint();
    if (existsSync(stateFile) && readFileSync(stateFile, 'utf8') === fp) process.exit(0);
    // Agent stopped again without changing anything since Kane's last failure: let it stop.
    if (input.stop_hook_active && existsSync(failFile) && readFileSync(failFile, 'utf8') === fp) process.exit(0);
    try { await fetch(url); } catch {
      console.error(`[kane] PathProof is not running at ${url}; skipping browser checks.`);
      process.exit(0);
    }
    try { execSync('kane-cli balance', { stdio: 'pipe' }); } catch {
      console.error('[kane] kane-cli is not logged in; skipping browser checks. Run: kane-cli login');
      process.exit(0);
    }
  }

  let checks = JSON.parse(readFileSync(path.join(root, 'kane', 'checks.json'), 'utf8'));
  if (only.length) checks = checks.filter(c => only.includes(c.id));

  const results = [];
  for (const c of checks) {
    process.stderr.write(`[kane] ${c.id} … `);
    const r = await runCheck(c);
    process.stderr.write(r.ok ? 'pass\n' : `FAIL (exit ${r.code})\n`);
    results.push(r);
  }

  const failed = results.filter(r => !r.ok);
  const md = [`# Kane report — ${new Date().toISOString()}`, `URL: ${url}`, '',
    ...results.flatMap(r => [`## ${r.ok ? '✅' : '❌'} ${r.check.id}`, `> ${r.check.objective}`, '',
      ...r.notes.map(n => `- ${String(n).slice(0, 400)}`), ''])].join('\n');
  mkdirSync(path.dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, md);

  if (!failed.length) {
    writeFileSync(stateFile, appFingerprint());
    console.error(`[kane] all ${results.length} checks passed`);
    process.exit(0);
  }
  writeFileSync(failFile, appFingerprint());
  if (hook) {
    const reason = `Kane CLI ran the browser checks and ${failed.length} failed. Fix the app, then stop again to re-verify. Details in kane/last-report.md.\n\n` +
      failed.map(r => `- ${r.check.id}: ${r.check.objective}\n  Kane saw: ${r.notes.join(' | ').slice(0, 600)}`).join('\n');
    console.log(JSON.stringify({ decision: 'block', reason }));
    process.exit(0);
  }
  console.error(md);
  process.exit(1);
}

main();
