import { escHtml } from './layout';

// ─── Status badge ────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  // ProjectStatus
  DRAFT: 'bg-slate-100 text-slate-700',
  PPMP_APPROVED: 'bg-sky-100 text-sky-700',
  APP_APPROVED: 'bg-indigo-100 text-indigo-700',
  PRE_PROCUREMENT_CONFERENCE: 'bg-violet-100 text-violet-700',
  ADVERTISED_POSTED: 'bg-purple-100 text-purple-700',
  ELIGIBILITY_CHECK: 'bg-blue-100 text-blue-700',
  OPENING_OF_BIDS: 'bg-cyan-100 text-cyan-700',
  BID_EVALUATION: 'bg-teal-100 text-teal-700',
  POST_QUALIFICATION: 'bg-emerald-100 text-emerald-700',
  BAC_RESOLUTION: 'bg-lime-100 text-lime-700',
  NOTICE_OF_AWARD: 'bg-yellow-100 text-yellow-700',
  PERFORMANCE_BOND_POSTED: 'bg-orange-100 text-orange-700',
  CONTRACT_SIGNED: 'bg-amber-100 text-amber-700',
  NOTICE_TO_PROCEED: 'bg-green-100 text-green-700',
  ONGOING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  TERMINATED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
  // PPMPStatus
  SUBMITTED: 'bg-sky-100 text-sky-700',
  APPROVED: 'bg-green-100 text-green-700',
  REVISED: 'bg-amber-100 text-amber-700',
  // Supplier
  ACTIVE: 'bg-green-100 text-green-700',
  BLACKLISTED: 'bg-red-100 text-red-700',
};

export function statusBadge(status: string): string {
  const cls = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600';
  const label = status.replace(/_/g, ' ');
  return `<span class="inline-block px-2 py-0.5 text-xs font-semibold ${cls}">${escHtml(label)}</span>`;
}

// ─── Page header ─────────────────────────────────────────────
export function pageHeader(
  title: string,
  subtitle?: string,
  action?: { href: string; label: string }
): string {
  return `
  <div class="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-slate-900">${escHtml(title)}</h1>
      ${subtitle ? `<p class="text-sm text-slate-500 mt-0.5">${escHtml(subtitle)}</p>` : ''}
    </div>
    ${action ? `<a href="${action.href}" class="inline-flex items-center gap-1 px-4 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">+ ${escHtml(action.label)}</a>` : ''}
  </div>`;
}

// ─── KPI card ────────────────────────────────────────────────
export function kpiCard(label: string, value: string, sub?: string, color = 'blue'): string {
  const border: Record<string, string> = {
    blue: 'border-t-4 border-blue-600',
    green: 'border-t-4 border-green-600',
    amber: 'border-t-4 border-amber-500',
    red: 'border-t-4 border-red-500',
  };
  return `
  <div class="bg-white border border-slate-200 ${border[color] ?? border.blue} p-5">
    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${escHtml(label)}</div>
    <div class="text-3xl font-bold text-slate-900 mt-1">${escHtml(value)}</div>
    ${sub ? `<div class="text-xs text-slate-400 mt-1">${escHtml(sub)}</div>` : ''}
  </div>`;
}

// ─── Table wrapper ───────────────────────────────────────────
export function tableWrapper(inner: string): string {
  return `<div class="overflow-x-auto"><table class="w-full text-sm border-collapse">${inner}</table></div>`;
}

export function th(label: string, extraClass = ''): string {
  return `<th class="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 bg-slate-50 border-b border-slate-200 whitespace-nowrap ${extraClass}">${escHtml(label)}</th>`;
}

export function td(content: string, extraClass = ''): string {
  return `<td class="px-4 py-3 border-b border-slate-100 ${extraClass}">${content}</td>`;
}

export function trLink(href: string, cells: string): string {
  return `<tr class="hover:bg-slate-50 cursor-pointer" onclick="location.href='${href}'">${cells}</tr>`;
}

// ─── Empty state ─────────────────────────────────────────────
export function emptyState(message: string, actionHref?: string, actionLabel?: string): string {
  return `
  <div class="py-16 text-center text-slate-400">
    <div class="text-4xl mb-2">📭</div>
    <div class="text-sm">${escHtml(message)}</div>
    ${actionHref ? `<a href="${actionHref}" class="mt-3 inline-block px-4 py-2 bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800">${escHtml(actionLabel ?? 'Create')}</a>` : ''}
  </div>`;
}

// ─── Form helpers ────────────────────────────────────────────
export function formField(
  label: string,
  name: string,
  opts: {
    type?: string;
    value?: string | number;
    required?: boolean;
    options?: { value: string; label: string }[];
    min?: string;
    max?: string;
    step?: string;
    placeholder?: string;
  } = {}
): string {
  const { type = 'text', value = '', required = false, options, min, max, step, placeholder } = opts;
  const base = 'w-full border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
  const req = required ? 'required' : '';

  let input: string;
  if (options) {
    const opts_ = options.map((o) => `<option value="${escHtml(o.value)}" ${String(value) === o.value ? 'selected' : ''}>${escHtml(o.label)}</option>`).join('');
    input = `<select name="${name}" ${req} class="${base}">${opts_}</select>`;
  } else if (type === 'textarea') {
    input = `<textarea name="${name}" ${req} rows="3" placeholder="${escHtml(placeholder ?? '')}" class="${base}">${escHtml(value)}</textarea>`;
  } else {
    const extras = [min ? `min="${min}"` : '', max ? `max="${max}"` : '', step ? `step="${step}"` : '', placeholder ? `placeholder="${escHtml(placeholder)}"` : ''].filter(Boolean).join(' ');
    input = `<input type="${type}" name="${name}" value="${escHtml(value)}" ${req} ${extras} class="${base}">`;
  }

  return `
  <div>
    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">${escHtml(label)}${required ? ' <span class="text-red-500">*</span>' : ''}</label>
    ${input}
  </div>`;
}

export function card(content: string, extraClass = ''): string {
  return `<div class="bg-white border border-slate-200 ${extraClass}">${content}</div>`;
}

export function cardHeader(title: string, action?: string): string {
  return `<div class="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
    <span class="text-sm font-semibold text-slate-700">${escHtml(title)}</span>
    ${action ?? ''}
  </div>`;
}

// ─── Breadcrumb ──────────────────────────────────────────────
export function breadcrumb(items: { label: string; href?: string }[]): string {
  return `<nav class="flex items-center gap-1 text-xs text-slate-500 px-6 pt-4 pb-0">
    ${items.map((item, i) => {
      const sep = i > 0 ? '<span class="mx-1">/</span>' : '';
      return item.href
        ? `${sep}<a href="${item.href}" class="hover:text-blue-600">${escHtml(item.label)}</a>`
        : `${sep}<span class="text-slate-700 font-medium">${escHtml(item.label)}</span>`;
    }).join('')}
  </nav>`;
}

// ─── Formatters ──────────────────────────────────────────────
export function formatPeso(amount: number | string | null): string {
  const n = parseFloat(String(amount ?? 0));
  return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
}
