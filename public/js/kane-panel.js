// "Verified by Kane" badge + results panel. Data: GET /api/kane/report
const badge = document.getElementById('kaneBadge');
const count = document.getElementById('kaneBadgeCount');
const dlg = document.getElementById('kaneDlg');
const list = document.getElementById('kaneList');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = ts => {
  if (!ts) return '';
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

let report = null;

async function load() {
  try {
    report = await (await fetch('/api/kane/report')).json();
    const { passed, total } = report;
    count.textContent = total ? `${passed}/${total}` : '—';
    badge.dataset.state = !total ? 'none' : passed === total ? 'pass' : 'fail';
  } catch {
    count.textContent = '—';
    badge.dataset.state = 'none';
  }
}

function render() {
  if (!report) return;
  list.innerHTML = report.results.map(r => {
    const state = r.status === 'passed' ? 'pass' : r.status === 'not-run' ? 'none' : 'fail';
    const icon = state === 'pass' ? '✓' : state === 'fail' ? '✕' : '·';
    const meta = [r.duration && `${Math.round(r.duration)}s`, ago(r.ranAt)].filter(Boolean).join(' · ');
    const lines = (r.summary || (state === 'none' ? 'Not run yet.' : '')).split('\n').filter(Boolean);
    return `<li class="kane-item" data-state="${state}">
      <span class="kane-icon">${icon}</span>
      <div class="kane-body">
        <div class="kane-row"><strong>${esc(r.id)}</strong><span class="kane-meta">${esc(meta)}</span></div>
        <div class="kane-obj">${esc(r.objective)}</div>
        ${lines.length ? `<ul class="kane-saw">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
      </div>
    </li>`;
  }).join('');
  document.getElementById('kaneDlgTitle').textContent =
    `${report.passed} of ${report.total} browser checks passing`;
}

badge?.addEventListener('click', async () => { await load(); render(); dlg.showModal(); });
document.getElementById('kaneDlgClose')?.addEventListener('click', () => dlg.close());
dlg?.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
load();
