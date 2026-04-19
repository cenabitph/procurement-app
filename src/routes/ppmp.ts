import { Hono } from 'hono';
import { query, queryOne } from '../db/index';
import { layout, escHtml } from '../views/layout';
import {
  pageHeader, breadcrumb, statusBadge, tableWrapper, th, td, trLink,
  emptyState, formField, card, cardHeader, formatPeso, formatDate
} from '../views/components';

interface PPMP {
  id: string; procuring_entity_code: string; fiscal_year: number;
  total_abc: string; prepared_by: string; certified_by: string;
  approved_by: string; status: string; created_at: string; updated_at: string;
  entity_name?: string; item_count?: number;
}

interface PPMPItem {
  id: string; ppmp_id: string; general_description: string; unit_of_measure: string;
  quantity: string; estimated_unit_cost: string; total_abc: string;
  scheduled_quarter: number; procurement_mode: string; category: string;
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

const app = new Hono();

// ─── List ────────────────────────────────────────────────────
app.get('/', async (c) => {
  const year = c.req.query('year') ?? '';
  let sql = `SELECT p.*, pe.name as entity_name,
               (SELECT COUNT(*) FROM ppmp_items pi WHERE pi.ppmp_id = p.id) as item_count
             FROM ppmp p LEFT JOIN procuring_entities pe ON p.procuring_entity_code = pe.uacs_code`;
  const params: unknown[] = [];
  if (year) { sql += ' WHERE p.fiscal_year = ?'; params.push(year); }
  sql += ' ORDER BY p.fiscal_year DESC, p.created_at DESC';

  const rows = await query<PPMP>(sql, params);
  const years = await query<{ y: number }>(`SELECT DISTINCT fiscal_year as y FROM ppmp ORDER BY y DESC`);

  const filters = `
    <div class="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3 text-sm">
      <span class="text-slate-500">Filter by year:</span>
      <a href="/ppmp" class="px-3 py-1 border ${!year ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300 hover:bg-slate-50'}">All</a>
      ${years.map((y) => `<a href="/ppmp?year=${y.y}" class="px-3 py-1 border ${year === String(y.y) ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300 hover:bg-slate-50'}">${y.y}</a>`).join('')}
    </div>`;

  const table = rows.length === 0
    ? emptyState('No PPMPs found. Create the first one.', '/ppmp/new', 'New PPMP')
    : tableWrapper(`
        <thead><tr>
          ${th('ID')}${th('Entity')}${th('Year')}${th('Items')}${th('Total ABC')}${th('Status')}${th('Prepared By')}${th('Created')}
        </tr></thead>
        <tbody>
          ${rows.map((r) => trLink(
            `/ppmp/${r.id}`,
            td(`<span class="font-mono text-xs text-blue-600">${escHtml(r.id.slice(0, 8))}…</span>`) +
            td(escHtml(r.entity_name ?? r.procuring_entity_code)) +
            td(String(r.fiscal_year)) +
            td(String(r.item_count ?? 0), 'text-center') +
            td(formatPeso(r.total_abc), 'text-right font-mono text-xs') +
            td(statusBadge(r.status)) +
            td(escHtml(r.prepared_by)) +
            td(formatDate(r.created_at), 'text-xs text-slate-500 whitespace-nowrap')
          )).join('')}
        </tbody>`);

  const content = pageHeader('PPMP', 'Project Procurement Management Plans', { href: '/ppmp/new', label: 'New PPMP' }) +
    filters +
    `<div class="p-6">${card(table)}</div>`;

  return c.html(layout({ title: 'PPMP', active: 'ppmp', content }));
});

// ─── New form ────────────────────────────────────────────────
app.get('/new', async (c) => {
  const entities = await query<{ uacs_code: string; name: string }>(
    `SELECT uacs_code, name FROM procuring_entities ORDER BY name`
  );
  const entityOpts = entities.map((e) => ({ value: e.uacs_code, label: e.name }));

  const form = `
    <form method="POST" action="/ppmp" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        ${formField('Procuring Entity', 'procuring_entity_code', { options: entityOpts, required: true })}
        ${formField('Fiscal Year', 'fiscal_year', { type: 'number', value: new Date().getFullYear(), min: '2000', max: '2099', required: true })}
        ${formField('Prepared By', 'prepared_by', { required: true, placeholder: 'Name of preparer' })}
        ${formField('Certified By (Budget Officer)', 'certified_by', { required: true, placeholder: 'Name of budget officer' })}
        ${formField('Approved By (Head of Office)', 'approved_by', { required: true, placeholder: 'Name of head of office' })}
      </div>
      <div class="flex gap-3 pt-2">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Create PPMP</button>
        <a href="/ppmp" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('New PPMP', 'Create a new Project Procurement Management Plan') +
    breadcrumb([{ label: 'PPMP', href: '/ppmp' }, { label: 'New' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'New PPMP', active: 'ppmp', content }));
});

// ─── Create ──────────────────────────────────────────────────
app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO ppmp (id, procuring_entity_code, fiscal_year, prepared_by, certified_by, approved_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, body.procuring_entity_code, body.fiscal_year, body.prepared_by, body.certified_by, body.approved_by]
  );
  return c.redirect(`/ppmp/${id}?flash=PPMP+created+successfully`);
});

// ─── Detail ──────────────────────────────────────────────────
app.get('/:id', async (c) => {
  const ppmp = await queryOne<PPMP & { entity_name: string }>(
    `SELECT p.*, pe.name as entity_name FROM ppmp p
     LEFT JOIN procuring_entities pe ON p.procuring_entity_code = pe.uacs_code
     WHERE p.id = ?`,
    [c.req.param('id')]
  );
  if (!ppmp) return c.html('<h1>Not found</h1>', 404);

  const items = await query<PPMPItem>(
    `SELECT * FROM ppmp_items WHERE ppmp_id = ? ORDER BY rowid`,
    [ppmp.id]
  );

  const flashMsg = c.req.query('flash');
  const flash = flashMsg ? { type: 'success' as const, message: decodeURIComponent(flashMsg) } : undefined;

  const itemsTable = items.length === 0
    ? emptyState('No items yet. Add the first item below.')
    : tableWrapper(`
        <thead><tr>
          ${th('Description')}${th('UoM')}${th('Qty')}${th('Unit Cost')}${th('Total ABC')}${th('Qtr')}${th('Mode')}${th('Category')}${th('')}
        </tr></thead>
        <tbody>
          ${items.map((item) => `<tr class="hover:bg-slate-50">
            ${td(escHtml(item.general_description), 'max-w-xs truncate')}
            ${td(escHtml(item.unit_of_measure))}
            ${td(parseFloat(item.quantity).toLocaleString(), 'text-right')}
            ${td(formatPeso(item.estimated_unit_cost), 'text-right font-mono text-xs')}
            ${td(formatPeso(item.total_abc), 'text-right font-mono text-xs font-semibold')}
            ${td(`Q${item.scheduled_quarter}`, 'text-center')}
            ${td(escHtml(item.procurement_mode.replace(/_/g, ' ')), 'text-xs')}
            ${td(escHtml(item.category.replace(/_/g, ' ')), 'text-xs')}
            ${td(`<form method="POST" action="/ppmp/${ppmp.id}/items/${item.id}/delete" onsubmit="return confirm('Delete this item?')"><button type="submit" class="text-xs text-red-500 hover:underline">Delete</button></form>`)}
          </tr>`).join('')}
          <tr class="bg-slate-50">
            <td colspan="4" class="px-4 py-2 text-right text-xs font-semibold text-slate-600">TOTAL ABC</td>
            <td class="px-4 py-2 text-right font-mono text-sm font-bold text-slate-900">${formatPeso(ppmp.total_abc)}</td>
            <td colspan="4"></td>
          </tr>
        </tbody>`);

  const addItemForm = ppmp.status === 'DRAFT' || ppmp.status === 'REVISED' ? `
    <form method="POST" action="/ppmp/${ppmp.id}/items" class="space-y-3 p-5 border-t border-slate-200">
      <div class="text-sm font-semibold text-slate-700 mb-2">Add Item</div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        ${formField('Description', 'general_description', { required: true, placeholder: 'Item description' })}
        ${formField('Unit of Measure', 'unit_of_measure', { required: true, placeholder: 'e.g. unit, lot, box' })}
        ${formField('Quantity', 'quantity', { type: 'number', min: '0.0001', step: '0.0001', required: true })}
        ${formField('Estimated Unit Cost (₱)', 'estimated_unit_cost', { type: 'number', min: '0', step: '0.01', required: true })}
        ${formField('Schedule Quarter', 'scheduled_quarter', { options: [
          { value: '1', label: 'Q1' }, { value: '2', label: 'Q2' },
          { value: '3', label: 'Q3' }, { value: '4', label: 'Q4' }], required: true })}
        ${formField('Procurement Mode', 'procurement_mode', { options: PROC_MODES, required: true })}
        ${formField('Category', 'category', { options: CATEGORIES, required: true })}
      </div>
      <button type="submit" class="px-4 py-2 bg-green-700 text-white text-sm font-semibold hover:bg-green-800">Add Item</button>
    </form>` : '';

  const statusActions = `
    <div class="flex gap-2 flex-wrap">
      ${ppmp.status === 'DRAFT' ? `<form method="POST" action="/ppmp/${ppmp.id}/submit"><button class="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Submit for Certification</button></form>` : ''}
      ${ppmp.status === 'SUBMITTED' ? `<form method="POST" action="/ppmp/${ppmp.id}/approve"><button class="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold hover:bg-green-700">Approve</button></form>` : ''}
      ${ppmp.status === 'APPROVED' ? `<form method="POST" action="/ppmp/${ppmp.id}/revise"><button class="px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">Revise</button></form>` : ''}
    </div>`;

  const metaCard = card(`
    ${cardHeader(`PPMP — FY ${ppmp.fiscal_year}`, statusBadge(ppmp.status))}
    <div class="p-5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 text-sm">
      <div><div class="text-xs text-slate-500">Entity</div><div class="font-medium">${escHtml(ppmp.entity_name ?? ppmp.procuring_entity_code)}</div></div>
      <div><div class="text-xs text-slate-500">Total ABC</div><div class="font-bold text-blue-700">${formatPeso(ppmp.total_abc)}</div></div>
      <div><div class="text-xs text-slate-500">Prepared By</div><div>${escHtml(ppmp.prepared_by)}</div></div>
      <div><div class="text-xs text-slate-500">Certified By</div><div>${escHtml(ppmp.certified_by)}</div></div>
      <div><div class="text-xs text-slate-500">Approved By</div><div>${escHtml(ppmp.approved_by)}</div></div>
      <div><div class="text-xs text-slate-500">Last Updated</div><div>${formatDate(ppmp.updated_at)}</div></div>
    </div>
    <div class="px-5 pb-4">${statusActions}</div>
  `);

  const itemsCard = card(`
    ${cardHeader(`Items (${items.length})`)}
    ${itemsTable}
    ${addItemForm}
  `, 'mt-4');

  const content = pageHeader(`PPMP FY ${ppmp.fiscal_year}`, escHtml(ppmp.entity_name ?? '')) +
    breadcrumb([{ label: 'PPMP', href: '/ppmp' }, { label: `FY ${ppmp.fiscal_year}` }]) +
    `<div class="p-6">${metaCard}${itemsCard}</div>`;

  return c.html(layout({ title: `PPMP ${ppmp.fiscal_year}`, active: 'ppmp', content, flash }));
});

// ─── Add item ────────────────────────────────────────────────
app.post('/:id/items', async (c) => {
  const ppmpId = c.req.param('id');
  const body = await c.req.parseBody();
  const qty = parseFloat(String(body.quantity));
  const unitCost = parseFloat(String(body.estimated_unit_cost));
  const totalAbc = qty * unitCost;

  await query(
    `INSERT INTO ppmp_items (id, ppmp_id, general_description, unit_of_measure, quantity, estimated_unit_cost, total_abc, scheduled_quarter, procurement_mode, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), ppmpId, body.general_description, body.unit_of_measure, qty, unitCost, totalAbc, body.scheduled_quarter, body.procurement_mode, body.category]
  );
  // Recalculate total
  await query(`UPDATE ppmp SET total_abc = (SELECT COALESCE(SUM(total_abc),0) FROM ppmp_items WHERE ppmp_id = ?) WHERE id = ?`, [ppmpId, ppmpId]);
  return c.redirect(`/ppmp/${ppmpId}?flash=Item+added`);
});

// ─── Delete item ─────────────────────────────────────────────
app.post('/:id/items/:itemId/delete', async (c) => {
  const { id, itemId } = c.req.param();
  await query(`DELETE FROM ppmp_items WHERE id = ? AND ppmp_id = ?`, [itemId, id]);
  await query(`UPDATE ppmp SET total_abc = (SELECT COALESCE(SUM(total_abc),0) FROM ppmp_items WHERE ppmp_id = ?) WHERE id = ?`, [id, id]);
  return c.redirect(`/ppmp/${id}?flash=Item+removed`);
});

// ─── Status transitions ──────────────────────────────────────
app.post('/:id/submit', async (c) => {
  await query(`UPDATE ppmp SET status = 'SUBMITTED' WHERE id = ? AND status = 'DRAFT'`, [c.req.param('id')]);
  return c.redirect(`/ppmp/${c.req.param('id')}?flash=PPMP+submitted+for+certification`);
});

app.post('/:id/approve', async (c) => {
  await query(`UPDATE ppmp SET status = 'APPROVED' WHERE id = ? AND status = 'SUBMITTED'`, [c.req.param('id')]);
  return c.redirect(`/ppmp/${c.req.param('id')}?flash=PPMP+approved`);
});

app.post('/:id/revise', async (c) => {
  await query(`UPDATE ppmp SET status = 'REVISED' WHERE id = ? AND status = 'APPROVED'`, [c.req.param('id')]);
  return c.redirect(`/ppmp/${c.req.param('id')}?flash=PPMP+set+to+revision`);
});

export default app;
