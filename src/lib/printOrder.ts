// Thermal printer (58mm) friendly receipt printing
// Works with browser-installed printers like ZPrinter Paper 58x3276mm

export type PrintSettings = {
  auto_print_enabled?: boolean;
  header_title?: string;
  header_subtitle?: string;
  footer_message?: string;
  extra_info?: string;
  show_logo?: boolean;
  logo_url?: string | null;
  show_tracking_code?: boolean;
  show_whatsapp?: boolean;
  show_address?: boolean;
  show_notes?: boolean;
  font_size?: number;
  paper_width_mm?: number;
  left_offset_mm?: number;
  font_weight?: number; // 400 normal, 600 semi, 700 bold, 800 extra-bold
  logo_size_mm?: number; // largura máxima da logo em mm
};

const DEFAULT_PRINT_SETTINGS: Required<Omit<PrintSettings, 'logo_url'>> & { logo_url: string | null } = {
  auto_print_enabled: false,
  header_title: 'AMOZI',
  header_subtitle: 'Delícias no Pote',
  footer_message: 'Obrigada pela preferência! 💕',
  extra_info: '',
  show_logo: false,
  logo_url: null,
  show_tracking_code: true,
  show_whatsapp: true,
  show_address: true,
  show_notes: true,
  font_size: 11,
  paper_width_mm: 58,
  left_offset_mm: 5,
  font_weight: 600,
  logo_size_mm: 40,
};

export type PrintOrderData = {
  source: 'site' | 'remoto';
  customer_name: string;
  customer_whatsapp?: string | null;
  customer_address?: string | null;
  customer_cep?: string | null;
  sector?: string | null;
  notes?: string | null;
  created_at: string;
  items: Array<{ name: string; quantity: number; price?: number }>;
  total?: number;
  delivery_fee?: number;
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
  tracking_code?: string | null;
};

const escapeHtml = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatBRL = (n: number) => `R$ ${(Number(n) || 0).toFixed(2).replace('.', ',')}`;

const paymentMethodLabel = (m?: string | null) => {
  if (!m) return '';
  const map: Record<string, string> = {
    pix: 'PIX', cartao: 'Cartão', stripe: 'Cartão (Stripe)',
    whatsapp: 'A combinar (WhatsApp)', dinheiro: 'Dinheiro', pago_dinheiro: 'Dinheiro',
  };
  return map[m] || m;
};

const paymentStatusInfo = (o: PrintOrderData) => {
  if (o.source === 'remoto') {
    const ps = o.payment_status || 'nao_pago';
    if (ps === 'pago' || ps === 'pago_dinheiro') {
      return { paid: true, label: 'PAGO', method: paymentMethodLabel(ps === 'pago_dinheiro' ? 'dinheiro' : o.payment_method) };
    }
    if (ps === 'vai_pagar_em') return { paid: false, label: 'A PAGAR', method: '' };
    return { paid: false, label: 'NÃO PAGO', method: '' };
  }
  const m = o.payment_method || '';
  if (m === 'stripe' || m === 'cartao' || m === 'pix') {
    return { paid: true, label: 'PAGO', method: paymentMethodLabel(m) };
  }
  if (m === 'whatsapp') return { paid: false, label: 'A COMBINAR', method: 'WhatsApp' };
  return { paid: false, label: 'NÃO PAGO', method: paymentMethodLabel(m) };
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return { date: `${dd}/${mm}/${yy}`, time: `${hh}:${mi}` };
};

export function buildReceiptHtml(order: PrintOrderData, settings?: PrintSettings | null): string {
  const cfg = { ...DEFAULT_PRINT_SETTINGS, ...(settings || {}) };
  const { date, time } = formatDate(order.created_at);
  const pay = paymentStatusInfo(order);
  const itemsTotal = order.items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0
  );
  const total = order.total != null ? Number(order.total) : itemsTotal + Number(order.delivery_fee || 0);
  const pendingValue = pay.paid ? 0 : total;

  const itemsHtml = order.items
    .map((it) => {
      const line = `${it.quantity}x ${escapeHtml(it.name)}`;
      return it.price != null
        ? `<div class="row"><span>${line}</span><span>${formatBRL(Number(it.price) * Number(it.quantity))}</span></div>`
        : `<div>${line}</div>`;
    })
    .join('');

  const addressBlock = (cfg.show_address && order.customer_address)
    ? `<div class="block"><div class="lbl">ENTREGA</div><div>${escapeHtml(order.customer_address)}</div>${order.customer_cep ? `<div>CEP: ${escapeHtml(order.customer_cep)}</div>` : ''}</div>`
    : '';

  const sectorBlock = order.sector
    ? `<div class="block"><div class="lbl">SETOR</div><div>${escapeHtml(order.sector)}</div></div>`
    : '';

  const logoMaxW = Math.max(20, Math.min(cfg.paper_width_mm ?? 58, cfg.logo_size_mm ?? 40));
  const logoMaxH = Math.round(logoMaxW * 0.6);
  const logoHtml = (cfg.show_logo && cfg.logo_url)
    ? `<div class="center" style="margin-bottom:2mm"><img src="${escapeHtml(cfg.logo_url)}" style="max-width:${logoMaxW}mm;max-height:${logoMaxH}mm;object-fit:contain;filter:contrast(1.4) brightness(0.85)" /></div>`
    : '';

  // Largura útil real do papel 58mm geralmente é ~48mm (a impressora reserva borda física)
  const printableWidth = Math.max(40, (cfg.paper_width_mm ?? 58) - 10);
  const leftOffset = Math.max(0, cfg.left_offset_mm ?? 5);

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Pedido ${escapeHtml(order.customer_name)}</title>
<style>
  @page { size: ${cfg.paper_width_mm}mm auto; margin: 0 !important; padding: 0 !important; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { margin: 0 !important; padding: 0 !important; width: ${cfg.paper_width_mm}mm; }
  body {
    width: ${printableWidth}mm;
    max-width: ${printableWidth}mm;
    font-family: 'Courier New', monospace;
    font-size: ${cfg.font_size}px;
    font-weight: ${cfg.font_weight ?? 600};
    line-height: 1.35;
    color: #000;
    padding: 2mm 0 6mm 0;
    margin: 0 0 0 ${leftOffset}mm !important;
    word-wrap: break-word;
    overflow-wrap: anywhere;
    word-break: break-word;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    text-rendering: geometricPrecision;
  }
  * { max-width: 100%; }
  .center { text-align: center; }
  .bold { font-weight: 800; }
  .big { font-size: ${cfg.font_size + 3}px; font-weight: 800; }
  .sep { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; gap: 4px; width: 100%; }
  .row span:last-child { white-space: nowrap; flex-shrink: 0; }
  .row span:first-child { word-break: break-word; min-width: 0; }
  .lbl { font-size: ${cfg.font_size - 1}px; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 1px; }
  .block { margin: 4px 0; }
  .badge { display: inline-block; padding: 2px 6px; border: 1px solid #000; font-weight: 700; font-size: ${cfg.font_size + 1}px; margin-top: 2px; }
  .pending { font-size: ${cfg.font_size + 2}px; font-weight: 700; }
  @media print {
    @page { size: ${cfg.paper_width_mm}mm auto; margin: 0 !important; }
    html, body { margin: 0 !important; padding: 0 !important; }
    body { padding: 1mm 0 4mm 0; margin: 0 0 0 ${leftOffset}mm !important; }
  }
</style></head>
<body>
  ${logoHtml}
  <div class="center bold big">${escapeHtml(cfg.header_title)}</div>
  ${cfg.header_subtitle ? `<div class="center">${escapeHtml(cfg.header_subtitle)}</div>` : ''}
  <div class="center" style="font-size:${cfg.font_size - 1}px">Pedido ${order.source === 'site' ? 'SITE' : 'REMOTO'}</div>
  <div class="sep"></div>

  <div class="row"><span>Data:</span><span>${date}</span></div>
  <div class="row"><span>Hora:</span><span>${time}</span></div>
  ${cfg.show_tracking_code && order.tracking_code ? `<div class="row"><span>Cod:</span><span>${escapeHtml(order.tracking_code)}</span></div>` : ''}

  <div class="sep"></div>

  <div class="block">
    <div class="lbl">CLIENTE</div>
    <div class="bold">${escapeHtml(order.customer_name)}</div>
    ${cfg.show_whatsapp && order.customer_whatsapp ? `<div>WhatsApp: ${escapeHtml(order.customer_whatsapp)}</div>` : ''}
  </div>

  ${addressBlock}
  ${sectorBlock}

  <div class="sep"></div>

  <div class="block">
    <div class="lbl">ITENS</div>
    ${itemsHtml}
  </div>

  <div class="sep"></div>

  ${order.delivery_fee && order.delivery_fee > 0 ? `<div class="row"><span>Subtotal:</span><span>${formatBRL(itemsTotal)}</span></div>
  <div class="row"><span>Entrega:</span><span>${formatBRL(order.delivery_fee)}</span></div>` : ''}
  <div class="row big"><span>TOTAL:</span><span>${formatBRL(total)}</span></div>

  <div class="sep"></div>

  <div class="block">
    <div class="lbl">PAGAMENTO</div>
    <div class="badge">${pay.label}</div>
    ${pay.method ? `<div style="margin-top:2px">Forma: ${escapeHtml(pay.method)}</div>` : ''}
    ${!pay.paid ? `<div class="pending" style="margin-top:4px">COBRAR: ${formatBRL(pendingValue)}</div>` : ''}
  </div>

  ${cfg.show_notes && order.notes ? `<div class="sep"></div><div class="block"><div class="lbl">OBS</div><div>${escapeHtml(order.notes)}</div></div>` : ''}

  ${cfg.extra_info ? `<div class="sep"></div><div class="center" style="font-size:${cfg.font_size - 1}px;white-space:pre-wrap">${escapeHtml(cfg.extra_info)}</div>` : ''}

  <div class="sep"></div>
  ${cfg.footer_message ? `<div class="center" style="font-size:${cfg.font_size - 1}px">${escapeHtml(cfg.footer_message)}</div>` : ''}
</body></html>`;
}

/**
 * Print via popup window — used when triggered by a user click.
 * Browsers block window.open() outside of user gestures, so for automatic
 * (Realtime/polling) prints use printOrderReceiptSilent below.
 */
export function printOrderReceipt(order: PrintOrderData, settings?: PrintSettings | null) {
  const html = buildReceiptHtml(order, settings);
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) {
    // Fallback to silent iframe if popup is blocked
    printOrderReceiptSilent(order, settings);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.addEventListener('load', () => {
    setTimeout(() => {
      try { w.print(); } catch {}
    }, 200);
  });
}

/**
 * Print via hidden iframe — works without a user gesture, so it's the
 * right choice for automatic printing triggered by Realtime/polling.
 * The iframe is removed after the print dialog closes (or after 30s).
 */
export function printOrderReceiptSilent(order: PrintOrderData, settings?: PrintSettings | null) {
  const html = buildReceiptHtml(order, settings);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      try { iframe.remove(); } catch {}
    }, 1000);
  };

  iframe.onload = () => {
    setTimeout(() => {
      try {
        const win = iframe.contentWindow;
        if (!win) return cleanup();
        win.focus();
        win.print();
        // Some browsers fire afterprint on the iframe window
        win.addEventListener('afterprint', cleanup);
        // Safety cleanup
        setTimeout(cleanup, 30000);
      } catch (e) {
        console.error('silent print failed', e);
        cleanup();
      }
    }, 250);
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  } else {
    iframe.srcdoc = html;
  }
}

