// Thermal printer (58mm) friendly receipt printing
// Works with browser-installed printers like ZPrinter Paper 58x3276mm

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
  payment_status?: string | null; // remote orders: 'pago' | 'nao_pago' | 'vai_pagar_em' | 'pago_dinheiro'
  status?: string | null; // site orders
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
    pix: 'PIX',
    cartao: 'Cartão',
    stripe: 'Cartão (Stripe)',
    whatsapp: 'A combinar (WhatsApp)',
    dinheiro: 'Dinheiro',
    pago_dinheiro: 'Dinheiro',
  };
  return map[m] || m;
};

const paymentStatusInfo = (o: PrintOrderData) => {
  // For remote orders use payment_status; for site orders consider it paid if status != pending
  if (o.source === 'remoto') {
    const ps = o.payment_status || 'nao_pago';
    if (ps === 'pago' || ps === 'pago_dinheiro') {
      return { paid: true, label: 'PAGO', method: paymentMethodLabel(ps === 'pago_dinheiro' ? 'dinheiro' : o.payment_method) };
    }
    if (ps === 'vai_pagar_em') return { paid: false, label: 'A PAGAR', method: '' };
    return { paid: false, label: 'NÃO PAGO', method: '' };
  }
  // site
  const m = o.payment_method || '';
  // PIX/cartão online via Stripe = pago; whatsapp = a combinar
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

export function printOrderReceipt(order: PrintOrderData) {
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
      const priceLine = it.price != null
        ? `<div class="row"><span>${line}</span><span>${formatBRL(Number(it.price) * Number(it.quantity))}</span></div>`
        : `<div>${line}</div>`;
      return priceLine;
    })
    .join('');

  const addressBlock = order.customer_address
    ? `<div class="block">
        <div class="lbl">ENTREGA</div>
        <div>${escapeHtml(order.customer_address)}</div>
        ${order.customer_cep ? `<div>CEP: ${escapeHtml(order.customer_cep)}</div>` : ''}
       </div>`
    : '';

  const sectorBlock = order.sector
    ? `<div class="block"><div class="lbl">SETOR</div><div>${escapeHtml(order.sector)}</div></div>`
    : '';

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Pedido ${escapeHtml(order.customer_name)}</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 58mm;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    padding: 4mm 3mm 8mm;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .big { font-size: 14px; font-weight: 700; }
  .sep { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row span:last-child { white-space: nowrap; }
  .lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 1px; }
  .block { margin: 4px 0; }
  .badge {
    display: inline-block; padding: 2px 6px; border: 1px solid #000;
    font-weight: 700; font-size: 12px; margin-top: 2px;
  }
  .pending { font-size: 13px; font-weight: 700; }
  @media print {
    body { padding: 2mm; }
  }
</style></head>
<body>
  <div class="center bold big">AMOZI</div>
  <div class="center">Delícias no Pote</div>
  <div class="center" style="font-size:10px">Pedido ${order.source === 'site' ? 'SITE' : 'REMOTO'}</div>
  <div class="sep"></div>

  <div class="row"><span>Data:</span><span>${date}</span></div>
  <div class="row"><span>Hora:</span><span>${time}</span></div>
  ${order.tracking_code ? `<div class="row"><span>Cod:</span><span>${escapeHtml(order.tracking_code)}</span></div>` : ''}

  <div class="sep"></div>

  <div class="block">
    <div class="lbl">CLIENTE</div>
    <div class="bold">${escapeHtml(order.customer_name)}</div>
    ${order.customer_whatsapp ? `<div>WhatsApp: ${escapeHtml(order.customer_whatsapp)}</div>` : ''}
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

  ${order.notes ? `<div class="sep"></div><div class="block"><div class="lbl">OBS</div><div>${escapeHtml(order.notes)}</div></div>` : ''}

  <div class="sep"></div>
  <div class="center" style="font-size:10px">Obrigada pela preferência! 💕</div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 150);
      window.addEventListener('afterprint', () => { setTimeout(() => window.close(), 200); });
    });
  </script>
</body></html>`;

  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) {
    alert('Permita pop-ups para imprimir o pedido.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
