import { Hono } from 'hono';
import { query, queryOne } from '../db/index';
import { getUser } from '../middleware/auth';
import { layout, escHtml } from '../views/layout';
import {
  pageHeader, breadcrumb, statusBadge, tableWrapper, th, td, trLink,
  emptyState, formField, card, cardHeader, formatPeso, formatDate
} from '../views/components';

interface Supplier {
  id: string; philgeps_no: string; business_name: string; trade_name: string | null;
  type: string; street: string; barangay: string; city_municipality: string;
  province: string; region: string; zip_code: string; tin: string;
  philgeps_reg_no: string; philgeps_cert_no: string; philgeps_validity: string;
  philgeps_platinum: number; vat_registered: number;
  blacklisted: number; blacklist_ref: string | null;
  created_at: string; updated_at: string;
}

const SUPPLIER_TYPES = [
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'CORPORATION', label: 'Corporation' },
  { value: 'JOINT_VENTURE', label: 'Joint Venture' },
  { value: 'COOPERATIVE', label: 'Cooperative' },
];

const REGIONS = [
  'NCR', 'CAR', 'Region I', 'Region II', 'Region III', 'Region IV-A',
  'MIMAROPA', 'Region V', 'Region VI', 'Region VII', 'Region VIII',
  'Region IX', 'Region X', 'Region XI', 'Region XII', 'CARAGA', 'BARMM',
].map((r) => ({ value: r, label: r }));

const app = new Hono();

// ─── List ────────────────────────────────────────────────────
app.get('/', async (c) => {
  const search = c.req.query('q') ?? '';
  const blacklisted = c.req.query('blacklisted') ?? '';
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (search) {
    conditions.push('(business_name LIKE ? OR philgeps_no LIKE ? OR tin LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (blacklisted === '1') { conditions.push('blacklisted = 1'); }
  else if (blacklisted === '0') { conditions.push('blacklisted = 0'); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = await query<Supplier>(
    `SELECT * FROM suppliers ${where} ORDER BY business_name`,
    params
  );

  const filterBar = `
    <div class="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3 flex-wrap">
      <form method="GET" action="/suppliers" class="flex gap-2">
        <input type="text" name="q" value="${escHtml(search)}" placeholder="Search by name, PhilGEPS no., TIN…"
          class="border border-slate-300 px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-500">
        <button type="submit" class="px-4 py-1.5 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Search</button>
        ${search ? `<a href="/suppliers" class="px-3 py-1.5 border border-slate-300 text-sm hover:bg-slate-50">Clear</a>` : ''}
      </form>
      <div class="flex gap-1 text-xs">
        <a href="/suppliers" class="px-3 py-1.5 border ${!blacklisted ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300 hover:bg-slate-50'}">All</a>
        <a href="/suppliers?blacklisted=0" class="px-3 py-1.5 border ${blacklisted === '0' ? 'bg-green-600 text-white border-green-600' : 'border-slate-300 hover:bg-slate-50'}">Active</a>
        <a href="/suppliers?blacklisted=1" class="px-3 py-1.5 border ${blacklisted === '1' ? 'bg-red-600 text-white border-red-600' : 'border-slate-300 hover:bg-slate-50'}">Blacklisted</a>
      </div>
    </div>`;

  const table = rows.length === 0
    ? emptyState('No suppliers found.', '/suppliers/new', 'Register Supplier')
    : tableWrapper(`
        <thead><tr>
          ${th('PhilGEPS No.')}${th('Business Name')}${th('Type')}${th('City')}${th('TIN')}${th('PhilGEPS Valid Until')}${th('VAT')}${th('Status')}
        </tr></thead>
        <tbody>
          ${rows.map((r) => trLink(
            `/suppliers/${r.id}`,
            td(`<span class="font-mono text-xs text-blue-600">${escHtml(r.philgeps_no)}</span>`) +
            td(`<div class="font-medium">${escHtml(r.business_name)}</div>${r.trade_name ? `<div class="text-xs text-slate-400">${escHtml(r.trade_name)}</div>` : ''}`) +
            td(escHtml(r.type.replace(/_/g, ' ')), 'text-xs') +
            td(escHtml(r.city_municipality), 'text-xs text-slate-500') +
            td(`<span class="font-mono text-xs">${escHtml(r.tin)}</span>`) +
            td(formatDate(r.philgeps_validity), 'text-xs') +
            td(r.vat_registered ? '<span class="text-green-600 text-xs font-semibold">VAT</span>' : '<span class="text-slate-400 text-xs">Non-VAT</span>') +
            td(r.blacklisted ? statusBadge('BLACKLISTED') : statusBadge('ACTIVE'))
          )).join('')}
        </tbody>`);

  const content = pageHeader('Supplier Registry', 'Manage accredited suppliers and bidders', { href: '/suppliers/new', label: 'Register Supplier' }) +
    filterBar +
    `<div class="p-6">${card(table)}</div>`;

  return c.html(layout({ title: 'Suppliers', active: 'suppliers', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── New form ────────────────────────────────────────────────
app.get('/new', async (c) => {
  const form = `
    <form method="POST" action="/suppliers" class="space-y-5">
      <div class="border-b border-slate-200 pb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Business Information</div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          ${formField('PhilGEPS Registration Number', 'philgeps_no', { required: true, placeholder: 'e.g. PS-PHILGEPS-00000' })}
          ${formField('Business Name', 'business_name', { required: true })}
          ${formField('Trade Name', 'trade_name', { placeholder: 'Optional' })}
          ${formField('Business Type', 'type', { options: SUPPLIER_TYPES, required: true })}
          ${formField('TIN', 'tin', { required: true, placeholder: '000-000-000-000' })}
        </div>
      </div>
      <div class="border-b border-slate-200 pb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Address</div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          ${formField('Street', 'street', { required: true })}
          ${formField('Barangay', 'barangay', { required: true })}
          ${formField('City / Municipality', 'city_municipality', { required: true })}
          ${formField('Province', 'province', { required: true })}
          ${formField('Region', 'region', { options: REGIONS, required: true })}
          ${formField('ZIP Code', 'zip_code', { required: true, placeholder: '0000' })}
        </div>
      </div>
      <div class="border-b border-slate-200 pb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">PhilGEPS Registration</div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          ${formField('PhilGEPS Reg. No.', 'philgeps_reg_no', { required: true })}
          ${formField('PhilGEPS Cert. No.', 'philgeps_cert_no', { required: true })}
          ${formField('Validity Date', 'philgeps_validity', { type: 'date', required: true })}
          ${formField('Membership Level', 'philgeps_platinum', { options: [{ value: '0', label: 'Regular' }, { value: '1', label: 'Platinum' }] })}
          ${formField('VAT Registered?', 'vat_registered', { options: [{ value: '0', label: 'No' }, { value: '1', label: 'Yes' }] })}
        </div>
      </div>
      <div class="flex gap-3">
        <button type="submit" class="px-5 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">Register Supplier</button>
        <a href="/suppliers" class="px-5 py-2 border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</a>
      </div>
    </form>`;

  const content = pageHeader('Register Supplier') +
    breadcrumb([{ label: 'Suppliers', href: '/suppliers' }, { label: 'Register' }]) +
    `<div class="p-6">${card(`<div class="p-5">${form}</div>`)}</div>`;

  return c.html(layout({ title: 'Register Supplier', active: 'suppliers', content, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── Create ──────────────────────────────────────────────────
app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO suppliers (id, philgeps_no, business_name, trade_name, type, street, barangay,
       city_municipality, province, region, zip_code, tin, philgeps_reg_no, philgeps_cert_no,
       philgeps_validity, philgeps_platinum, vat_registered)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.philgeps_no, body.business_name, body.trade_name || null, body.type,
     body.street, body.barangay, body.city_municipality, body.province, body.region, body.zip_code,
     body.tin, body.philgeps_reg_no, body.philgeps_cert_no, body.philgeps_validity,
     body.philgeps_platinum ?? 0, body.vat_registered ?? 0]
  );
  return c.redirect(`/suppliers/${id}?flash=Supplier+registered`);
});

// ─── Detail ──────────────────────────────────────────────────
app.get('/:id', async (c) => {
  const supplier = await queryOne<Supplier>(`SELECT * FROM suppliers WHERE id = ?`, [c.req.param('id')]);
  if (!supplier) return c.html('<h1>Not found</h1>', 404);

  const bids = await query<{ id: string; project_title: string; bid_price: string; submitted_at: string; status: string }>(
    `SELECT b.id, p.title as project_title, b.bid_price, b.submitted_at,
       CASE WHEN b.is_disqualified THEN 'Disqualified' ELSE 'Eligible' END as status
     FROM bid_documents b LEFT JOIN procurement_projects p ON b.project_id = p.id
     WHERE b.supplier_id = ? ORDER BY b.submitted_at DESC`,
    [supplier.id]
  );

  const flash = c.req.query('flash') ? { type: 'success' as const, message: decodeURIComponent(c.req.query('flash')!) } : undefined;

  const infoCard = card(`
    ${cardHeader(escHtml(supplier.business_name), supplier.blacklisted ? statusBadge('BLACKLISTED') : statusBadge('ACTIVE'))}
    <div class="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
      <div><div class="text-xs text-slate-500">PhilGEPS No.</div><div class="font-mono">${escHtml(supplier.philgeps_no)}</div></div>
      <div><div class="text-xs text-slate-500">Trade Name</div><div>${escHtml(supplier.trade_name ?? '—')}</div></div>
      <div><div class="text-xs text-slate-500">Type</div><div>${escHtml(supplier.type.replace(/_/g, ' '))}</div></div>
      <div><div class="text-xs text-slate-500">TIN</div><div class="font-mono">${escHtml(supplier.tin)}</div></div>
      <div><div class="text-xs text-slate-500">VAT</div><div>${supplier.vat_registered ? 'VAT-Registered' : 'Non-VAT'}</div></div>
      <div><div class="text-xs text-slate-500">PhilGEPS Cert</div><div class="font-mono text-xs">${escHtml(supplier.philgeps_cert_no)}</div></div>
      <div><div class="text-xs text-slate-500">PhilGEPS Valid Until</div><div>${formatDate(supplier.philgeps_validity)}</div></div>
      <div><div class="text-xs text-slate-500">Membership</div><div>${supplier.philgeps_platinum ? '⭐ Platinum' : 'Regular'}</div></div>
    </div>
    <div class="border-t border-slate-200 p-5">
      <div class="text-xs text-slate-500 mb-1">Address</div>
      <div class="text-sm">${escHtml(supplier.street)}, Brgy. ${escHtml(supplier.barangay)}, ${escHtml(supplier.city_municipality)}, ${escHtml(supplier.province)}, ${escHtml(supplier.region)} ${escHtml(supplier.zip_code)}</div>
    </div>
    <div class="border-t border-slate-200 px-5 py-3 flex gap-3">
      ${supplier.blacklisted
        ? `<form method="POST" action="/suppliers/${supplier.id}/unblacklist"><button class="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold hover:bg-green-700">Remove Blacklist</button></form>`
        : `<form method="POST" action="/suppliers/${supplier.id}/blacklist" onsubmit="return confirm('Blacklist this supplier?')">
             <input type="text" name="ref" placeholder="Blacklist reference/basis" required class="border border-slate-300 px-2 py-1 text-xs mr-2 focus:outline-none">
             <button class="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Blacklist</button>
           </form>`}
    </div>
  `);

  const bidsCard = card(`
    ${cardHeader('Bid History')}
    ${bids.length === 0
      ? '<div class="p-4 text-sm text-slate-400">No bids submitted.</div>'
      : tableWrapper(`
          <thead><tr>${th('Project')}${th('Bid Price')}${th('Submitted')}${th('Status')}</tr></thead>
          <tbody>
            ${bids.map((b) => `<tr class="hover:bg-slate-50" onclick="location.href='/bids/${b.id}'" style="cursor:pointer">
              ${td(escHtml(b.project_title), 'font-medium')}
              ${td(formatPeso(b.bid_price), 'text-right font-mono text-xs')}
              ${td(formatDate(b.submitted_at), 'text-xs text-slate-500')}
              ${td(`<span class="text-xs font-semibold ${b.status === 'Eligible' ? 'text-green-700' : 'text-red-600'}">${b.status}</span>`)}
            </tr>`).join('')}
          </tbody>`)}
  `, 'mt-4');

  const content = pageHeader(supplier.business_name, `PhilGEPS: ${supplier.philgeps_no}`) +
    breadcrumb([{ label: 'Suppliers', href: '/suppliers' }, { label: supplier.business_name }]) +
    `<div class="p-6">${infoCard}${bidsCard}</div>`;

  return c.html(layout({ title: supplier.business_name, active: 'suppliers', content, flash, user: (() => { const u = getUser(c); return u ? { username: u.username, role: u.role } : undefined; })() }));
});

// ─── Blacklist actions ───────────────────────────────────────
app.post('/:id/blacklist', async (c) => {
  const body = await c.req.parseBody();
  await query(`UPDATE suppliers SET blacklisted = 1, blacklist_ref = ? WHERE id = ?`, [body.ref, c.req.param('id')]);
  return c.redirect(`/suppliers/${c.req.param('id')}?flash=Supplier+blacklisted`);
});

app.post('/:id/unblacklist', async (c) => {
  await query(`UPDATE suppliers SET blacklisted = 0, blacklist_ref = NULL WHERE id = ?`, [c.req.param('id')]);
  return c.redirect(`/suppliers/${c.req.param('id')}?flash=Supplier+removed+from+blacklist`);
});

export default app;
