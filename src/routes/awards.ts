import { Hono } from 'hono';
import { query, queryOne } from '../db/index';
import { getUser } from '../middleware/auth';
import { layout, escHtml } from '../views/layout';
import {
  pageHeader, breadcrumb, statusBadge, tableWrapper, th, td, trLink,
  emptyState, formField, card, cardHeader, formatPeso, formatDate
} from '../views/components';

interface NOA {
  id: string; project_id: string; supplier_id: string;
  awarded_amount: string; posting_date: string; acceptance_deadline: string;
  accepted_at: string | null; philgeps_posted: number;
  philgeps_posting_ref: string | null; created_at: string;
  project_title?: string; pr_ref?: string; supplier_name?: string;
}

interface NTP {
  id: string; project_id: string; supplier_id: string;
  contract_amount: string; contract_ref: string;
  contract_signing_date: string; ntp_date: string; posting_date: string;
  created_at: string;
  project_title?: string; pr_ref?: string; supplier_name?: string;
}

const app = new Hono();

// ─── NOA List ────────────────────────────────────────────────
app.get('/', async (c) => {
  const tab = c.req.query('tab') ?? 'noa';

  const [noaRows, ntpRows] = await Promise.all([
    query<NOA>(
      `SELECT n.*, p.title as project_title, p.pr_ref, s.business_name as supplier_name
       FROM notices_of_award n
       LEFT JOIN procurement_projects p ON n.project_id = p.id
       LEFT JOIN suppliers s ON n.supplier_id = s.id
       ORDER BY n.posting_date DESC`
    ),
    query<NTP>(
      `SELECT n.*, p.title as project_title, p.pr_ref, s.business_name as supplier_name
       FROM notices_to_proceed n
       LEFT JOIN procurement_projects p ON n.project_id = p.id
       LEFT JOIN suppliers s ON n.supplier_id = s.id
       ORDER BY n.ntp_date DESC`
    ),
  ]);

  const tabs = `
    <div class="px-6 pt-4 flex gap-1 border-b border-slate-200 bg-white">
      <a href="/awards?tab=noa" class="px-5 py-2.5 text-sm font-semibold border-b-2 ${tab === 'noa' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'}">
        Notice of Award (${noaRows.length})
      </a>
      <a href="/awards?tab=ntp" class="px-5 py-2.5 text-sm font-semibold border-b-2 ${tab === 'ntp' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'}">
        Notice to Proceed (${ntpRows.length})
      </a>
    </div>`;

  let tabContent = '';
  if (tab === 'noa') {
    const noaAction = `<a href="/awards/noa/new" class="px-4 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ Issue NOA</a>`;
    const noaTable = noaRows.length === 0
      ? emptyState('No Notices of Award issued.', '/awards/noa/new', 'Issue NOA')
      : tableWrapper(`
          <thead><tr>
            ${th('Project')}${th('Supplier')}${th('Awarded Amount')}${th('Posted')}${th('Deadline')}${th('Accepted')}${th('PhilGEPS')}${th('')}
          </tr></thead>
          <tbody>
            ${noaRows.map((r) => trLink(
              `/awards/noa/${r.id}`,
              td(`<div class="font-medium text-xs">${escHtml(r.project_title ?? '')}</div><div class="text-xs text-blue-600 font-mono">${escHtml(r.pr_ref ?? '')}</div>`) +
              td(escHtml(r.supplier_name ?? '')) +
              td(formatPeso(r.awarded_amount), 'text-right font-mono text-xs font-semibold') +
              td(formatDate(r.posting_date), 'text-xs') +
              td(formatDate(r.acceptance_deadline), 'text-xs') +
              td(r.accepted_at ? `<span class="text-green-700 font-semibold text-xs">✓ ${formatDate(r.accepted_at)}</span>` : '<span class="text-amber-600 text-xs">Awaiting</span>') +
              td(r.philgeps_posted ? '<span class="text-green-700 text-xs font-semibold">✓ Posted</span>' : '<span class="text-slate-400 text-xs">Not posted</span>') +
              td(`<a href="/awards/noa/${r.id}" class="text-xs text-blue-600 hover:underline">View</a>`)
            )).join('')}
          </tbody>`);
    tabContent = `<div class="p-6">${card(`<div class="flex items-center justify-between p-4 border-b border-slate-200"><span class="text-sm font-semibold text-slate-700">All Notices of Award</span>${noaAction}</div>${noaTable}`)}</div>`;
  } else {
    const ntpAction = `<a href="/awards/ntp/new" class="px-4 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ Issue NTP</a>`;
    const ntpTable = ntpRows.length === 0
      ? emptyState('No Notices to Proceed issued.', '/awards/ntp/new', 'Issue NTP')
      : tableWrapper(`
          <thead><tr>
            ${th('Project')}${th('Supplier')}${th('Contract Amount')}${th('Contract Ref')}${th('Contract Signed')}${th('NTP Date')}${th('')}
          </tr></thead>
          <tbody>
            ${ntpRows.map((r) => trLink(
              `/awards/ntp/${r.id}`,
              td(`<div class="font-medium text-xs">${escHtml(r.project_title ?? '')}</div><div class="text-xs text-blue-600 font-mono">${escHtml(r.pr_ref ?? '')}</div>`) +
              td(escHtml(r.supplier_name ?? '')) +
              td(formatPeso(r.contract_amount), 'text-right font-mono text-xs font-semibold') +
              td(`<span class="font-mono text-xs">${escHtml(r.contract_ref)}</span>`) +
              td(formatDate(r.contract_signing_date), 'text-xs') +
              td(formatDate(r.ntp_date), 'text-xs font-semibold') +
              td(`<a href="/awards/ntp/${r.id}" class="text-xs text-blue-600 hover:underline">View</a>`)
            )).join('')}
          </tbody>`);
    tabContent = `<div class="p-6">${card(`<div class="flex items-center justify-between p-4 border-b border-slate-200"><span class="text-sm font-semibold text-slate-700">All Notices to Proceed</span>${ntpAction}</div>${ntpTable}`)}</div>`;
  }

  const content = pageHeader('Awards & Notices', 'NOA and NTP management') + tabs + tabContent;
  return c.html(layout({ title: 'Awards', active: 'awards', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── NOA — new form ──────────────────────────────────────────
app.get('/noa/new', async (c) => {
  const [projects, suppliers] = await Promise.all([
    query<{ id: string; title: string; pr_ref: string }>(
      `SELECT id, title, pr_ref FROM procurement_projects WHERE status IN ('BAC_RESOLUTION','NOTICE_OF_AWARD','POST_QUALIFICATION') ORDER BY created_at DESC`
    ),
    query<{ id: string; business_name: string }>(
      `SELECT id, business_name FROM suppliers WHERE blacklisted = 0 ORDER BY business_name`
    ),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const deadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const form = `
    <form method="POST" action="/awards/noa" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        ${formField('Project', 'project_id', {
          options: projects.map((p) => ({ value: p.id, label: `${p.pr_ref} — ${p.title}` })),
          required: true
        })}
        ${formField('Awarded Supplier', 'supplier_id', {
          options: suppliers.map((s) => ({ value: s.id, label: s.business_name })),
          required: true
        })}
        ${formField('Awarded Amount (₱)', 'awarded_amount', { type: 'number', min: '0', step: '0.01', required: true })}
        ${formField('Posting Date', 'posting_date', { type: 'date', value: today, required: true })}
        ${formField('Acceptance Deadline', 'acceptance_deadline', { type: 'date', value: deadline, required: true })}
      </div>
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Issue NOA</button>
        <a href="/awards" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('Issue Notice of Award') +
    breadcrumb([{ label: 'Awards', href: '/awards' }, { label: 'New NOA' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'New NOA', active: 'awards', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── NOA — create ────────────────────────────────────────────
app.post('/noa', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO notices_of_award (id, project_id, supplier_id, awarded_amount, posting_date, acceptance_deadline) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, body.project_id, body.supplier_id, body.awarded_amount, body.posting_date, body.acceptance_deadline]
  );
  await query(`UPDATE procurement_projects SET status = 'NOTICE_OF_AWARD' WHERE id = ?`, [body.project_id]);
  return c.redirect(`/awards/noa/${id}?flash=NOA+issued`);
});

// ─── NOA — detail ────────────────────────────────────────────
app.get('/noa/:id', async (c) => {
  const noa = await queryOne<NOA>(
    `SELECT n.*, p.title as project_title, p.pr_ref, s.business_name as supplier_name
     FROM notices_of_award n
     LEFT JOIN procurement_projects p ON n.project_id = p.id
     LEFT JOIN suppliers s ON n.supplier_id = s.id
     WHERE n.id = ?`,
    [c.req.param('id')]
  );
  if (!noa) return c.html('<h1>Not found</h1>', 404);

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  const isOverdue = !noa.accepted_at && new Date(noa.acceptance_deadline) < new Date();

  const noaCard = card(`
    ${cardHeader(`NOA — ${escHtml(noa.pr_ref ?? '')}`, isOverdue ? '<span class="text-xs font-semibold text-red-600">OVERDUE</span>' : noa.accepted_at ? statusBadge('APPROVED') : statusBadge('SUBMITTED'))}
    <div class="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
      <div><div class="text-xs text-slate-500">Project</div><div class="font-medium">${escHtml(noa.project_title ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">Supplier</div><div class="font-medium">${escHtml(noa.supplier_name ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">Awarded Amount</div><div class="font-bold text-blue-700">${formatPeso(noa.awarded_amount)}</div></div>
      <div><div class="text-xs text-slate-500">Posting Date</div><div>${formatDate(noa.posting_date)}</div></div>
      <div><div class="text-xs text-slate-500">Acceptance Deadline</div><div class="${isOverdue ? 'text-red-600 font-semibold' : ''}">${formatDate(noa.acceptance_deadline)}</div></div>
      <div><div class="text-xs text-slate-500">Accepted At</div><div>${noa.accepted_at ? `<span class="text-green-700 font-semibold">✓ ${formatDate(noa.accepted_at)}</span>` : '—'}</div></div>
      <div><div class="text-xs text-slate-500">PhilGEPS</div><div>${noa.philgeps_posted ? `<span class="text-green-700">✓ ${escHtml(noa.philgeps_posting_ref ?? 'Posted')}</span>` : '<span class="text-slate-400">Not posted</span>'}</div></div>
    </div>
    <div class="border-t border-slate-200 px-5 py-3 flex gap-3 flex-wrap">
      ${!noa.accepted_at ? `
        <form method="POST" action="/awards/noa/${noa.id}/accept">
          <button class="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold hover:bg-green-700">Mark as Accepted</button>
        </form>` : ''}
      ${!noa.philgeps_posted ? `
        <form method="POST" action="/awards/noa/${noa.id}/philgeps" class="flex items-center gap-2">
          <input type="text" name="ref" placeholder="PhilGEPS posting ref" required class="border border-slate-300 px-2 py-1 text-xs focus:outline-none">
          <button type="submit" class="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Mark PhilGEPS Posted</button>
        </form>` : ''}
      ${noa.accepted_at ? `
        <a href="/awards/ntp/new?project_id=${noa.project_id}&supplier_id=${noa.supplier_id}&amount=${noa.awarded_amount}"
           class="px-4 py-1.5 bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800">Issue NTP →</a>` : ''}
    </div>
  `);

  const content = pageHeader('Notice of Award', `${escHtml(noa.project_title ?? '')}`) +
    breadcrumb([{ label: 'Awards', href: '/awards' }, { label: `NOA — ${noa.pr_ref ?? ''}` }]) +
    `<div class="p-6">${noaCard}</div>`;

  return c.html(layout({ title: 'NOA Detail', active: 'awards', content, flash, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

app.post('/noa/:id/accept', async (c) => {
  await query(`UPDATE notices_of_award SET accepted_at = NOW() WHERE id = ?`, [c.req.param('id')]);
  return c.redirect(`/awards/noa/${c.req.param('id')}?flash=NOA+accepted`);
});

app.post('/noa/:id/philgeps', async (c) => {
  const body = await c.req.parseBody();
  await query(`UPDATE notices_of_award SET philgeps_posted = 1, philgeps_posting_ref = ? WHERE id = ?`, [body.ref, c.req.param('id')]);
  return c.redirect(`/awards/noa/${c.req.param('id')}?flash=PhilGEPS+posting+recorded`);
});

// ─── NTP — new form ──────────────────────────────────────────
app.get('/ntp/new', async (c) => {
  const preProjectId = c.req.query('project_id') ?? '';
  const preSupplierId = c.req.query('supplier_id') ?? '';
  const preAmount = c.req.query('amount') ?? '';

  const [projects, suppliers] = await Promise.all([
    query<{ id: string; title: string; pr_ref: string }>(
      `SELECT id, title, pr_ref FROM procurement_projects WHERE status IN ('NOTICE_OF_AWARD','PERFORMANCE_BOND_POSTED','CONTRACT_SIGNED') ORDER BY created_at DESC`
    ),
    query<{ id: string; business_name: string }>(
      `SELECT id, business_name FROM suppliers WHERE blacklisted = 0 ORDER BY business_name`
    ),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const form = `
    <form method="POST" action="/awards/ntp" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        ${formField('Project', 'project_id', {
          options: projects.map((p) => ({ value: p.id, label: `${p.pr_ref} — ${p.title}` })),
          value: preProjectId, required: true
        })}
        ${formField('Supplier', 'supplier_id', {
          options: suppliers.map((s) => ({ value: s.id, label: s.business_name })),
          value: preSupplierId, required: true
        })}
        ${formField('Contract Amount (₱)', 'contract_amount', { type: 'number', min: '0', step: '0.01', value: preAmount, required: true })}
        ${formField('Contract Reference No.', 'contract_ref', { required: true, placeholder: 'e.g. CONTRACT-2025-001' })}
        ${formField('Contract Signing Date', 'contract_signing_date', { type: 'date', value: today, required: true })}
        ${formField('NTP Date', 'ntp_date', { type: 'date', value: today, required: true })}
        ${formField('NTP Posting Date', 'posting_date', { type: 'date', value: today, required: true })}
      </div>
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Issue NTP</button>
        <a href="/awards" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('Issue Notice to Proceed') +
    breadcrumb([{ label: 'Awards', href: '/awards' }, { label: 'New NTP' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'New NTP', active: 'awards', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── NTP — create ────────────────────────────────────────────
app.post('/ntp', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO notices_to_proceed (id, project_id, supplier_id, contract_amount, contract_ref, contract_signing_date, ntp_date, posting_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.project_id, body.supplier_id, body.contract_amount, body.contract_ref, body.contract_signing_date, body.ntp_date, body.posting_date]
  );
  await query(`UPDATE procurement_projects SET status = 'NOTICE_TO_PROCEED' WHERE id = ?`, [body.project_id]);
  return c.redirect(`/awards/ntp/${id}?flash=NTP+issued`);
});

// ─── NTP — detail ────────────────────────────────────────────
app.get('/ntp/:id', async (c) => {
  const ntp = await queryOne<NTP>(
    `SELECT n.*, p.title as project_title, p.pr_ref, s.business_name as supplier_name
     FROM notices_to_proceed n
     LEFT JOIN procurement_projects p ON n.project_id = p.id
     LEFT JOIN suppliers s ON n.supplier_id = s.id
     WHERE n.id = ?`,
    [c.req.param('id')]
  );
  if (!ntp) return c.html('<h1>Not found</h1>', 404);

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  const ntpCard = card(`
    ${cardHeader(`NTP — ${escHtml(ntp.pr_ref ?? '')}`, statusBadge('NOTICE_TO_PROCEED'))}
    <div class="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
      <div><div class="text-xs text-slate-500">Project</div><div class="font-medium">${escHtml(ntp.project_title ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">Supplier</div><div class="font-medium">${escHtml(ntp.supplier_name ?? '')}</div></div>
      <div><div class="text-xs text-slate-500">Contract Amount</div><div class="font-bold text-blue-700">${formatPeso(ntp.contract_amount)}</div></div>
      <div><div class="text-xs text-slate-500">Contract Ref.</div><div class="font-mono text-xs">${escHtml(ntp.contract_ref)}</div></div>
      <div><div class="text-xs text-slate-500">Contract Signed</div><div>${formatDate(ntp.contract_signing_date)}</div></div>
      <div><div class="text-xs text-slate-500">NTP Date</div><div class="font-semibold text-green-700">${formatDate(ntp.ntp_date)}</div></div>
      <div><div class="text-xs text-slate-500">Posted</div><div>${formatDate(ntp.posting_date)}</div></div>
    </div>
    <div class="border-t border-slate-200 px-5 py-3">
      <a href="/projects/${ntp.project_id}" class="text-xs text-blue-600 hover:underline">View Project →</a>
    </div>
  `);

  const content = pageHeader('Notice to Proceed', `${escHtml(ntp.project_title ?? '')}`) +
    breadcrumb([{ label: 'Awards', href: '/awards?tab=ntp' }, { label: `NTP — ${ntp.pr_ref ?? ''}` }]) +
    `<div class="p-6">${ntpCard}</div>`;

  return c.html(layout({ title: 'NTP Detail', active: 'awards', content, flash, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

export default app;
