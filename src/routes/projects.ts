import { Hono } from 'hono';
import { query, queryOne } from '../db/index';
import { layout, escHtml } from '../views/layout';
import {
  pageHeader, breadcrumb, statusBadge, tableWrapper, th, td, trLink,
  emptyState, formField, card, cardHeader, formatPeso, formatDate
} from '../views/components';

interface Project {
  id: string; pr_ref: string; title: string; category: string;
  procurement_mode: string; status: string; abc: string;
  fund_appropriations_act: string; fund_allotment_class: string;
  fund_uacs: string; fund_obligation_request_no: string | null;
  ppmp_ref: string; app_ref: string; procuring_entity_code: string;
  bac_id: string | null; philgeps_ref: string | null;
  is_foreign: number; created_at: string; updated_at: string;
  entity_name?: string;
}

interface Milestone {
  id: string; project_id: string; activity: string;
  planned_date: string; actual_date: string | null;
}

const PROC_MODES = [
  { value: 'COMPETITIVE_BIDDING', label: 'Competitive Bidding' },
  { value: 'LIMITED_SOURCE_BIDDING', label: 'Limited Source Bidding' },
  { value: 'DIRECT_CONTRACTING', label: 'Direct Contracting' },
  { value: 'REPEAT_ORDER', label: 'Repeat Order' },
  { value: 'SHOPPING', label: 'Shopping' },
  { value: 'SMALL_VALUE_PROCUREMENT', label: 'Small Value Procurement' },
  { value: 'NEGOTIATED_TWO_FAILED_BIDDINGS', label: 'Negotiated – Two Failed Biddings' },
  { value: 'NEGOTIATED_EMERGENCY', label: 'Negotiated – Emergency' },
  { value: 'AGENCY_TO_AGENCY', label: 'Agency-to-Agency' },
  { value: 'LEASE_OF_VENUE', label: 'Lease of Venue' },
  { value: 'UN_AGENCIES', label: 'UN Agencies' },
];

const CATEGORIES = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'CONSULTING_SERVICES', label: 'Consulting Services' },
];

const ALLOTMENT_CLASSES = [
  { value: 'PS', label: 'PS — Personnel Services' },
  { value: 'MOOE', label: 'MOOE — Maintenance & Operating Expenses' },
  { value: 'CO', label: 'CO — Capital Outlay' },
  { value: 'FinEx', label: 'FinEx — Financial Expenses' },
];

const STATUS_FLOW = [
  'DRAFT', 'PPMP_APPROVED', 'APP_APPROVED', 'PRE_PROCUREMENT_CONFERENCE',
  'ADVERTISED_POSTED', 'ELIGIBILITY_CHECK', 'OPENING_OF_BIDS', 'BID_EVALUATION',
  'POST_QUALIFICATION', 'BAC_RESOLUTION', 'NOTICE_OF_AWARD', 'PERFORMANCE_BOND_POSTED',
  'CONTRACT_SIGNED', 'NOTICE_TO_PROCEED', 'ONGOING', 'COMPLETED',
];

const MILESTONE_ACTIVITIES = [
  'Pre-Procurement Conference', 'Advertisement / Posting', 'Eligibility Check',
  'Opening of Bids', 'Bid Evaluation', 'Post-Qualification', 'BAC Resolution',
  'Notice of Award', 'Performance Bond Posting', 'Contract Signing', 'Notice to Proceed',
  'Contract Duration Start', 'Contract Duration End',
];

const app = new Hono();

// ─── List ────────────────────────────────────────────────────
app.get('/', async (c) => {
  const statusFilter = c.req.query('status') ?? '';
  const categoryFilter = c.req.query('category') ?? '';
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (statusFilter) { conditions.push('p.status = ?'); params.push(statusFilter); }
  if (categoryFilter) { conditions.push('p.category = ?'); params.push(categoryFilter); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const rows = await query<Project>(
    `SELECT p.*, pe.name as entity_name FROM procurement_projects p
     LEFT JOIN procuring_entities pe ON p.procuring_entity_code = pe.uacs_code
     ${where} ORDER BY p.created_at DESC`,
    params
  );

  const statusCounts = await query<{ status: string; cnt: number }>(
    `SELECT status, COUNT(*) as cnt FROM procurement_projects GROUP BY status`
  );
  const countMap: Record<string, number> = {};
  statusCounts.forEach((s) => { countMap[s.status] = s.cnt; });

  const filterBar = `
    <div class="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-2 flex-wrap text-xs">
      <span class="text-slate-500 mr-1">Status:</span>
      <a href="/projects" class="px-2.5 py-1 border ${!statusFilter ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300 hover:bg-slate-50'}">All</a>
      ${STATUS_FLOW.map((s) => `<a href="/projects?status=${s}" class="px-2.5 py-1 border ${statusFilter === s ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300 hover:bg-slate-50'}">${s.replace(/_/g, ' ')}${countMap[s] ? ` (${countMap[s]})` : ''}</a>`).join('')}
      <a href="/projects?status=TERMINATED" class="px-2.5 py-1 border ${statusFilter === 'TERMINATED' ? 'bg-red-600 text-white border-red-600' : 'border-slate-300 hover:bg-slate-50'}">TERMINATED</a>
      <a href="/projects?status=FAILED" class="px-2.5 py-1 border ${statusFilter === 'FAILED' ? 'bg-red-600 text-white border-red-600' : 'border-slate-300 hover:bg-slate-50'}">FAILED</a>
    </div>`;

  const table = rows.length === 0
    ? emptyState('No projects found.', '/projects/new', 'New Project')
    : tableWrapper(`
        <thead><tr>
          ${th('PR Ref')}${th('Title')}${th('Category')}${th('Mode')}${th('ABC')}${th('Entity')}${th('Status')}${th('Updated')}
        </tr></thead>
        <tbody>
          ${rows.map((r) => trLink(
            `/projects/${r.id}`,
            td(`<span class="font-mono text-xs text-blue-600">${escHtml(r.pr_ref)}</span>`) +
            td(escHtml(r.title), 'max-w-xs truncate font-medium') +
            td(escHtml(r.category.replace(/_/g, ' ')), 'text-xs') +
            td(escHtml(r.procurement_mode.replace(/_/g, ' ')), 'text-xs text-slate-500 max-w-[140px] truncate') +
            td(formatPeso(r.abc), 'text-right font-mono text-xs') +
            td(escHtml(r.entity_name ?? r.procuring_entity_code), 'text-xs text-slate-500 max-w-[120px] truncate') +
            td(statusBadge(r.status)) +
            td(formatDate(r.updated_at), 'text-xs text-slate-500 whitespace-nowrap')
          )).join('')}
        </tbody>`);

  const content = pageHeader('Procurement Projects', 'Manage all procurement projects', { href: '/projects/new', label: 'New Project' }) +
    filterBar +
    `<div class="p-6">${card(table)}</div>`;

  return c.html(layout({ title: 'Projects', active: 'projects', content }));
});

// ─── New form ────────────────────────────────────────────────
app.get('/new', async (c) => {
  const entities = await query<{ uacs_code: string; name: string }>(
    `SELECT uacs_code, name FROM procuring_entities ORDER BY name`
  );

  const form = `
    <form method="POST" action="/projects" class="space-y-5">
      <div class="border-b border-slate-200 pb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Project Information</div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          ${formField('PR Reference Number', 'pr_ref', { required: true, placeholder: 'e.g. PR-2025-001' })}
          ${formField('Project Title', 'title', { required: true })}
          ${formField('Category', 'category', { options: CATEGORIES, required: true })}
          ${formField('Procurement Mode', 'procurement_mode', { options: PROC_MODES, required: true })}
          ${formField('Approved Budget for Contract (ABC) ₱', 'abc', { type: 'number', min: '0', step: '0.01', required: true })}
          ${formField('Procuring Entity', 'procuring_entity_code', { options: entities.map((e) => ({ value: e.uacs_code, label: e.name })), required: true })}
          ${formField('PPMP Reference', 'ppmp_ref', { required: true, placeholder: 'PPMP ID' })}
          ${formField('APP Reference', 'app_ref', { required: true, placeholder: 'APP Entry ID' })}
          ${formField('PhilGEPS Reference', 'philgeps_ref', { placeholder: 'Optional' })}
        </div>
      </div>
      <div class="border-b border-slate-200 pb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Fund Source</div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          ${formField('Appropriations Act', 'fund_appropriations_act', { required: true, placeholder: 'e.g. GAA FY 2025' })}
          ${formField('Allotment Class', 'fund_allotment_class', { options: ALLOTMENT_CLASSES, required: true })}
          ${formField('UACS Code', 'fund_uacs', { required: true, placeholder: 'e.g. 5021301000' })}
          ${formField('Obligation Request No.', 'fund_obligation_request_no', { placeholder: 'Optional' })}
        </div>
      </div>
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Create Project</button>
        <a href="/projects" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('New Procurement Project') +
    breadcrumb([{ label: 'Projects', href: '/projects' }, { label: 'New' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'New Project', active: 'projects', content }));
});

// ─── Create ──────────────────────────────────────────────────
app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO procurement_projects
      (id, pr_ref, title, category, procurement_mode, status, abc,
       fund_appropriations_act, fund_allotment_class, fund_uacs, fund_obligation_request_no,
       ppmp_ref, app_ref, procuring_entity_code, philgeps_ref, is_foreign)
     VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, body.pr_ref, body.title, body.category, body.procurement_mode, body.abc,
     body.fund_appropriations_act, body.fund_allotment_class, body.fund_uacs,
     body.fund_obligation_request_no || null, body.ppmp_ref, body.app_ref,
     body.procuring_entity_code, body.philgeps_ref || null]
  );
  return c.redirect(`/projects/${id}?flash=Project+created`);
});

// ─── Detail ──────────────────────────────────────────────────
app.get('/:id', async (c) => {
  const proj = await queryOne<Project>(
    `SELECT p.*, pe.name as entity_name FROM procurement_projects p
     LEFT JOIN procuring_entities pe ON p.procuring_entity_code = pe.uacs_code
     WHERE p.id = ?`,
    [c.req.param('id')]
  );
  if (!proj) return c.html('<h1>Not found</h1>', 404);

  const [milestones, bids, noa] = await Promise.all([
    query<Milestone>(`SELECT * FROM procurement_milestones WHERE project_id = ? ORDER BY planned_date`, [proj.id]),
    query<{ id: string; supplier_name: string; bid_price: string; submitted_at: string; is_disqualified: number }>(
      `SELECT b.id, s.business_name as supplier_name, b.bid_price, b.submitted_at, b.is_disqualified
       FROM bid_documents b LEFT JOIN suppliers s ON b.supplier_id = s.id WHERE b.project_id = ?`,
      [proj.id]
    ),
    queryOne<{ id: string; awarded_amount: string; posting_date: string; accepted_at: string | null }>(
      `SELECT id, awarded_amount, posting_date, accepted_at FROM notices_of_award WHERE project_id = ? LIMIT 1`,
      [proj.id]
    ),
  ]);

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  // Status progression
  const currentIdx = STATUS_FLOW.indexOf(proj.status);
  const nextStatus = STATUS_FLOW[currentIdx + 1] ?? null;

  const statusActions = `
    <div class="flex gap-2 flex-wrap items-center">
      ${nextStatus ? `
        <form method="POST" action="/projects/${proj.id}/advance">
          <button class="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
            Advance → ${nextStatus.replace(/_/g, ' ')}
          </button>
        </form>` : ''}
      ${proj.status !== 'TERMINATED' && proj.status !== 'COMPLETED' && proj.status !== 'FAILED' ? `
        <form method="POST" action="/projects/${proj.id}/terminate" onsubmit="return confirm('Terminate this project?')">
          <button class="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Terminate</button>
        </form>
        <form method="POST" action="/projects/${proj.id}/fail" onsubmit="return confirm('Mark as failed?')">
          <button class="px-4 py-1.5 border border-red-400 text-red-600 text-xs font-semibold hover:bg-red-50">Mark Failed</button>
        </form>` : ''}
    </div>`;

  const metaCard = card(`
    ${cardHeader(`${escHtml(proj.pr_ref)} — ${escHtml(proj.title)}`, statusBadge(proj.status))}
    <div class="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
      <div><div class="text-xs text-slate-500">Category</div><div class="font-medium">${escHtml(proj.category.replace(/_/g, ' '))}</div></div>
      <div><div class="text-xs text-slate-500">Mode</div><div>${escHtml(proj.procurement_mode.replace(/_/g, ' '))}</div></div>
      <div><div class="text-xs text-slate-500">ABC</div><div class="font-bold text-blue-700">${formatPeso(proj.abc)}</div></div>
      <div><div class="text-xs text-slate-500">Entity</div><div>${escHtml(proj.entity_name ?? proj.procuring_entity_code)}</div></div>
      <div><div class="text-xs text-slate-500">Fund Source</div><div class="text-xs">${escHtml(proj.fund_appropriations_act)} / ${escHtml(proj.fund_allotment_class)}</div></div>
      <div><div class="text-xs text-slate-500">UACS</div><div class="font-mono text-xs">${escHtml(proj.fund_uacs)}</div></div>
      ${proj.philgeps_ref ? `<div><div class="text-xs text-slate-500">PhilGEPS Ref</div><div class="font-mono text-xs">${escHtml(proj.philgeps_ref)}</div></div>` : ''}
      <div><div class="text-xs text-slate-500">Created</div><div class="text-xs text-slate-600">${formatDate(proj.created_at)}</div></div>
      <div><div class="text-xs text-slate-500">Updated</div><div class="text-xs text-slate-600">${formatDate(proj.updated_at)}</div></div>
    </div>
    <div class="px-5 pb-4">${statusActions}</div>
  `);

  // Milestone timeline
  const milestoneForm = `
    <form method="POST" action="/projects/${proj.id}/milestones" class="flex gap-3 items-end p-4 border-t border-slate-200 flex-wrap">
      <div class="flex-1 min-w-[180px]">
        ${formField('Activity', 'activity', { options: MILESTONE_ACTIVITIES.map((a) => ({ value: a, label: a })), required: true })}
      </div>
      <div class="w-40">
        ${formField('Planned Date', 'planned_date', { type: 'date', required: true })}
      </div>
      <div class="w-40">
        ${formField('Actual Date', 'actual_date', { type: 'date' })}
      </div>
      <button type="submit" class="px-4 py-2 bg-green-700 text-white text-xs font-semibold hover:bg-green-800 self-end">Add</button>
    </form>`;

  const milestonesCard = card(`
    ${cardHeader('Milestones')}
    ${milestones.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No milestones yet.</div>'
      : tableWrapper(`
          <thead><tr>${th('Activity')}${th('Planned')}${th('Actual')}${th('Status')}${th('')}</tr></thead>
          <tbody>
            ${milestones.map((m) => `<tr class="hover:bg-slate-50">
              ${td(escHtml(m.activity), 'font-medium')}
              ${td(formatDate(m.planned_date))}
              ${td(m.actual_date ? formatDate(m.actual_date) : '<span class="text-slate-400">—</span>')}
              ${td(m.actual_date ? '<span class="text-green-600 font-semibold text-xs">✓ Done</span>' : '<span class="text-amber-600 text-xs">Pending</span>')}
              ${td(`<form method="POST" action="/projects/${proj.id}/milestones/${m.id}/delete" onsubmit="return confirm('Delete milestone?')">
                <button class="text-xs text-red-500 hover:underline">Delete</button></form>`)}
            </tr>`).join('')}
          </tbody>`)}
    ${milestoneForm}
  `, 'mt-4');

  // Bids summary
  const bidsCard = card(`
    ${cardHeader('Bids', `<a href="/bids?project_id=${proj.id}" class="text-xs text-blue-600 hover:underline">Manage bids →</a>`)}
    ${bids.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No bids submitted.</div>'
      : tableWrapper(`
          <thead><tr>${th('Supplier')}${th('Bid Price')}${th('Submitted')}${th('Status')}</tr></thead>
          <tbody>
            ${bids.map((b) => `<tr class="hover:bg-slate-50" onclick="location.href='/bids/${b.id}'" style="cursor:pointer">
              ${td(escHtml(b.supplier_name), 'font-medium')}
              ${td(formatPeso(b.bid_price), 'text-right font-mono text-xs')}
              ${td(formatDate(b.submitted_at), 'text-xs text-slate-500')}
              ${td(b.is_disqualified ? '<span class="text-xs font-semibold text-red-600">Disqualified</span>' : '<span class="text-xs text-green-700">Eligible</span>')}
            </tr>`).join('')}
          </tbody>`)}
    ${['OPENING_OF_BIDS', 'BID_EVALUATION', 'POST_QUALIFICATION'].includes(proj.status)
      ? `<div class="p-4 border-t border-slate-200"><a href="/bids/new?project_id=${proj.id}" class="px-4 py-2 bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800">+ Submit Bid</a></div>`
      : ''}
  `, 'mt-4');

  const noaCard = noa ? card(`
    ${cardHeader('Notice of Award')}
    <div class="p-5 grid grid-cols-2 gap-4 text-sm">
      <div><div class="text-xs text-slate-500">Awarded Amount</div><div class="font-bold text-blue-700">${formatPeso(noa.awarded_amount)}</div></div>
      <div><div class="text-xs text-slate-500">Posting Date</div><div>${formatDate(noa.posting_date)}</div></div>
      <div><div class="text-xs text-slate-500">Acceptance Status</div><div>${noa.accepted_at ? `<span class="text-green-600 font-semibold">Accepted ${formatDate(noa.accepted_at)}</span>` : '<span class="text-amber-600">Awaiting acceptance</span>'}</div></div>
    </div>
    <div class="px-5 pb-4"><a href="/awards/${noa.id}" class="text-xs text-blue-600 hover:underline">View NOA →</a></div>
  `, 'mt-4') : '';

  const content = pageHeader(proj.title, `PR: ${proj.pr_ref}`) +
    breadcrumb([{ label: 'Projects', href: '/projects' }, { label: proj.pr_ref }]) +
    `<div class="p-6">${metaCard}${milestonesCard}${bidsCard}${noaCard}</div>`;

  return c.html(layout({ title: proj.title, active: 'projects', content, flash }));
});

// ─── Advance status ──────────────────────────────────────────
app.post('/:id/advance', async (c) => {
  const proj = await queryOne<Project>(`SELECT status FROM procurement_projects WHERE id = ?`, [c.req.param('id')]);
  if (!proj) return c.redirect('/projects');
  const idx = STATUS_FLOW.indexOf(proj.status);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return c.redirect(`/projects/${c.req.param('id')}`);
  const newStatus = STATUS_FLOW[idx + 1];
  await query(`UPDATE procurement_projects SET status = ? WHERE id = ?`, [newStatus, c.req.param('id')]);
  return c.redirect(`/projects/${c.req.param('id')}?flash=Status+updated+to+${encodeURIComponent(newStatus)}`);
});

app.post('/:id/terminate', async (c) => {
  await query(`UPDATE procurement_projects SET status = 'TERMINATED' WHERE id = ?`, [c.req.param('id')]);
  return c.redirect(`/projects/${c.req.param('id')}?flash=Project+terminated`);
});

app.post('/:id/fail', async (c) => {
  await query(`UPDATE procurement_projects SET status = 'FAILED' WHERE id = ?`, [c.req.param('id')]);
  return c.redirect(`/projects/${c.req.param('id')}?flash=Project+marked+as+failed`);
});

// ─── Milestones ──────────────────────────────────────────────
app.post('/:id/milestones', async (c) => {
  const body = await c.req.parseBody();
  await query(
    `INSERT INTO procurement_milestones (id, project_id, activity, planned_date, actual_date) VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), c.req.param('id'), body.activity, body.planned_date, body.actual_date || null]
  );
  return c.redirect(`/projects/${c.req.param('id')}?flash=Milestone+added`);
});

app.post('/:id/milestones/:milestoneId/delete', async (c) => {
  await query(`DELETE FROM procurement_milestones WHERE id = ? AND project_id = ?`, [c.req.param('milestoneId'), c.req.param('id')]);
  return c.redirect(`/projects/${c.req.param('id')}?flash=Milestone+removed`);
});

export default app;
