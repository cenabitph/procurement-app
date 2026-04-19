import { Hono } from 'hono';
import { query, queryOne } from '../db/index';
import { getUser } from '../middleware/auth';
import { layout, escHtml } from '../views/layout';
import {
  pageHeader, breadcrumb, statusBadge, tableWrapper, th, td, trLink,
  emptyState, formField, card, cardHeader, formatPeso, formatDate
} from '../views/components';

interface AppPlan {
  id: string; procuring_entity_code: string; fiscal_year: number;
  total_abc: string; revision: number; approved_at: string | null;
  created_at: string; entity_name?: string; entry_count?: number;
}

interface AppEntry {
  id: string; app_plan_id: string; ppmp_item_id: string; project_title: string;
  procurement_mode: string; category: string; abc: string;
  item_description?: string;
}

const app = new Hono();

// ─── List ────────────────────────────────────────────────────
app.get('/', async (c) => {
  const rows = await query<AppPlan>(
    `SELECT a.*, pe.name as entity_name,
       (SELECT COUNT(*) FROM app_entries ae WHERE ae.app_plan_id = a.id) as entry_count
     FROM app_plans a
     LEFT JOIN procuring_entities pe ON a.procuring_entity_code = pe.uacs_code
     ORDER BY a.fiscal_year DESC, a.created_at DESC`
  );

  const table = rows.length === 0
    ? emptyState('No APPs found.', '/app-plan/new', 'New APP')
    : tableWrapper(`
        <thead><tr>
          ${th('ID')}${th('Entity')}${th('Year')}${th('Entries')}${th('Total ABC')}${th('Revision')}${th('Approved')}${th('Created')}
        </tr></thead>
        <tbody>
          ${rows.map((r) => trLink(
            `/app-plan/${r.id}`,
            td(`<span class="font-mono text-xs text-blue-600">${escHtml(r.id.slice(0, 8))}…</span>`) +
            td(escHtml(r.entity_name ?? r.procuring_entity_code)) +
            td(String(r.fiscal_year)) +
            td(String(r.entry_count ?? 0), 'text-center') +
            td(formatPeso(r.total_abc), 'text-right font-mono text-xs') +
            td(`Rev. ${r.revision}`, 'text-center') +
            td(r.approved_at ? `<span class="text-green-700 font-medium text-xs">✓ ${formatDate(r.approved_at)}</span>` : '<span class="text-slate-400 text-xs">Pending</span>') +
            td(formatDate(r.created_at), 'text-xs text-slate-500 whitespace-nowrap')
          )).join('')}
        </tbody>`);

  const content = pageHeader('APP', 'Annual Procurement Plans', { href: '/app-plan/new', label: 'New APP' }) +
    `<div class="p-6">${card(table)}</div>`;

  return c.html(layout({ title: 'APP', active: 'app-plan', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── New form ────────────────────────────────────────────────
app.get('/new', async (c) => {
  const entities = await query<{ uacs_code: string; name: string }>(
    `SELECT uacs_code, name FROM procuring_entities ORDER BY name`
  );

  const form = `
    <form method="POST" action="/app-plan" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        ${formField('Procuring Entity', 'procuring_entity_code', { options: entities.map((e) => ({ value: e.uacs_code, label: e.name })), required: true })}
        ${formField('Fiscal Year', 'fiscal_year', { type: 'number', value: new Date().getFullYear(), min: '2000', max: '2099', required: true })}
        ${formField('Revision Number', 'revision', { type: 'number', value: 0, min: '0', required: true })}
      </div>
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Create APP</button>
        <a href="/app-plan" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('New APP', 'Create Annual Procurement Plan') +
    breadcrumb([{ label: 'APP', href: '/app-plan' }, { label: 'New' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'New APP', active: 'app-plan', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── Create ──────────────────────────────────────────────────
app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO app_plans (id, procuring_entity_code, fiscal_year, revision) VALUES (?, ?, ?, ?)`,
    [id, body.procuring_entity_code, body.fiscal_year, body.revision ?? 0]
  );
  return c.redirect(`/app-plan/${id}?flash=APP+created`);
});

// ─── Detail ──────────────────────────────────────────────────
app.get('/:id', async (c) => {
  const plan = await queryOne<AppPlan & { entity_name: string }>(
    `SELECT a.*, pe.name as entity_name FROM app_plans a
     LEFT JOIN procuring_entities pe ON a.procuring_entity_code = pe.uacs_code
     WHERE a.id = ?`,
    [c.req.param('id')]
  );
  if (!plan) return c.html('<h1>Not found</h1>', 404);

  const entries = await query<AppEntry>(
    `SELECT ae.*, pi.general_description as item_description
     FROM app_entries ae
     LEFT JOIN ppmp_items pi ON ae.ppmp_item_id = pi.id
     WHERE ae.app_plan_id = ?`,
    [plan.id]
  );

  // PPMPs available for this entity+year
  const ppmpItems = await query<{ id: string; general_description: string; ppmp_id: string }>(
    `SELECT pi.id, pi.general_description, pi.ppmp_id FROM ppmp_items pi
     INNER JOIN ppmp p ON pi.ppmp_id = p.id
     WHERE p.procuring_entity_code = ? AND p.fiscal_year = ? AND p.status = 'APPROVED'`,
    [plan.procuring_entity_code, plan.fiscal_year]
  );

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  const entriesTable = entries.length === 0
    ? emptyState('No entries yet.')
    : tableWrapper(`
        <thead><tr>
          ${th('Project Title')}${th('PPMP Item')}${th('Mode')}${th('Category')}${th('ABC')}${th('')}
        </tr></thead>
        <tbody>
          ${entries.map((e) => `<tr class="hover:bg-slate-50">
            ${td(escHtml(e.project_title), 'font-medium')}
            ${td(escHtml(e.item_description ?? e.ppmp_item_id), 'text-xs text-slate-500 max-w-xs truncate')}
            ${td(escHtml(e.procurement_mode.replace(/_/g, ' ')), 'text-xs')}
            ${td(escHtml(e.category.replace(/_/g, ' ')), 'text-xs')}
            ${td(formatPeso(e.abc), 'text-right font-mono text-xs')}
            ${td(`<form method="POST" action="/app-plan/${plan.id}/entries/${e.id}/delete" onsubmit="return confirm('Delete entry?')"><button class="text-xs text-red-500 hover:underline">Delete</button></form>`)}
          </tr>`).join('')}
          <tr class="bg-slate-50 font-semibold">
            <td colspan="4" class="px-4 py-2 text-right text-xs">TOTAL ABC</td>
            <td class="px-4 py-2 text-right font-mono text-sm font-bold">${formatPeso(plan.total_abc)}</td>
            <td></td>
          </tr>
        </tbody>`);

  const addEntryForm = !plan.approved_at ? `
    <form method="POST" action="/app-plan/${plan.id}/entries" class="space-y-3 p-5 border-t border-slate-200">
      <div class="text-sm font-semibold text-slate-700 mb-2">Add Entry</div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        ${formField('Project Title', 'project_title', { required: true })}
        ${formField('PPMP Item', 'ppmp_item_id', {
          options: ppmpItems.length > 0
            ? ppmpItems.map((pi) => ({ value: pi.id, label: pi.general_description.slice(0, 60) }))
            : [{ value: '', label: '— No approved PPMP items found —' }],
          required: true
        })}
        ${formField('Procurement Mode', 'procurement_mode', { options: [
          { value: 'COMPETITIVE_BIDDING', label: 'Competitive Bidding' },
          { value: 'SMALL_VALUE_PROCUREMENT', label: 'Small Value Procurement' },
          { value: 'SHOPPING', label: 'Shopping' },
          { value: 'DIRECT_CONTRACTING', label: 'Direct Contracting' },
          { value: 'NEGOTIATED_EMERGENCY', label: 'Negotiated – Emergency' },
        ], required: true })}
        ${formField('Category', 'category', { options: [
          { value: 'GOODS', label: 'Goods' },
          { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
          { value: 'CONSULTING_SERVICES', label: 'Consulting Services' }], required: true })}
        ${formField('ABC (₱)', 'abc', { type: 'number', min: '0', step: '0.01', required: true })}
      </div>
      <button type="submit" class="px-4 py-2 bg-green-700 text-white text-sm font-semibold hover:bg-green-800">Add Entry</button>
    </form>` : '<div class="p-5 text-sm text-slate-500 border-t border-slate-200">APP is approved — no further edits allowed.</div>';

  const approveBtn = !plan.approved_at && entries.length > 0 ? `
    <form method="POST" action="/app-plan/${plan.id}/approve">
      <button class="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold hover:bg-green-700">Approve APP</button>
    </form>` : '';

  const metaCard = card(`
    ${cardHeader(`APP — FY ${plan.fiscal_year} Rev. ${plan.revision}`, plan.approved_at ? statusBadge('APPROVED') : statusBadge('DRAFT'))}
    <div class="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
      <div><div class="text-xs text-slate-500">Entity</div><div class="font-medium">${escHtml(plan.entity_name ?? plan.procuring_entity_code)}</div></div>
      <div><div class="text-xs text-slate-500">Total ABC</div><div class="font-bold text-blue-700">${formatPeso(plan.total_abc)}</div></div>
      <div><div class="text-xs text-slate-500">Approved</div><div>${plan.approved_at ? formatDate(plan.approved_at) : '—'}</div></div>
    </div>
    ${approveBtn ? `<div class="px-5 pb-4">${approveBtn}</div>` : ''}
  `);

  const entriesCard = card(`
    ${cardHeader(`Entries (${entries.length})`)}
    ${entriesTable}
    ${addEntryForm}
  `, 'mt-4');

  const content = pageHeader(`APP FY ${plan.fiscal_year}`, escHtml(plan.entity_name ?? '')) +
    breadcrumb([{ label: 'APP', href: '/app-plan' }, { label: `FY ${plan.fiscal_year}` }]) +
    `<div class="p-6">${metaCard}${entriesCard}</div>`;

  return c.html(layout({ title: `APP ${plan.fiscal_year}`, active: 'app-plan', content, flash, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── Add entry ───────────────────────────────────────────────
app.post('/:id/entries', async (c) => {
  const planId = c.req.param('id');
  const body = await c.req.parseBody();
  await query(
    `INSERT INTO app_entries (id, app_plan_id, ppmp_item_id, project_title, procurement_mode, category, abc) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), planId, body.ppmp_item_id, body.project_title, body.procurement_mode, body.category, body.abc]
  );
  await query(`UPDATE app_plans SET total_abc = (SELECT COALESCE(SUM(abc),0) FROM app_entries WHERE app_plan_id = ?) WHERE id = ?`, [planId, planId]);
  return c.redirect(`/app-plan/${planId}?flash=Entry+added`);
});

// ─── Delete entry ────────────────────────────────────────────
app.post('/:id/entries/:entryId/delete', async (c) => {
  const { id, entryId } = c.req.param();
  await query(`DELETE FROM app_entries WHERE id = ? AND app_plan_id = ?`, [entryId, id]);
  await query(`UPDATE app_plans SET total_abc = (SELECT COALESCE(SUM(abc),0) FROM app_entries WHERE app_plan_id = ?) WHERE id = ?`, [id, id]);
  return c.redirect(`/app-plan/${id}?flash=Entry+removed`);
});

// ─── Approve ─────────────────────────────────────────────────
app.post('/:id/approve', async (c) => {
  await query(`UPDATE app_plans SET approved_at = NOW() WHERE id = ? AND approved_at IS NULL`, [c.req.param('id')]);
  return c.redirect(`/app-plan/${c.req.param('id')}?flash=APP+approved`);
});

export default app;
