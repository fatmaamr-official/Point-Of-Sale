import QRCode from 'qrcode';
import type { Order } from './mock-data';

async function generateQRDataURL(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, { width: 150, margin: 1, color: { dark: '#333333', light: '#ffffff' } });
  } catch {
    return '';
  }
}

export async function generateReceiptHTML(order: Order, storeName = 'SwiftPOS Store'): Promise<string> {
  const qrData = JSON.stringify({ id: order.id, total: order.total, date: order.date, method: order.paymentMethod });
  const qrImageURL = await generateQRDataURL(qrData);

  const itemsHTML = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;border-bottom:1px dashed #e5e7eb">${item.name}</td>
         <td style="padding:6px 8px;text-align:center;border-bottom:1px dashed #e5e7eb">${item.quantity}</td>
         <td style="padding:6px 0;text-align:right;border-bottom:1px dashed #e5e7eb">$${(item.price * item.quantity).toFixed(2)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${order.id}</title>
<style>
  @media print { body { margin: 0; } @page { size: 80mm auto; margin: 5mm; } .no-print { display: none !important; } }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 320px; margin: 20px auto; font-size: 13px; color: #1f2937; background: #f9fafb; }
  .receipt { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
  .header { text-align: center; padding: 24px 20px 16px; background: linear-gradient(135deg, #059669, #10b981); color: white; }
  .header h1 { font-size: 20px; margin: 0; font-weight: 700; letter-spacing: -0.02em; }
  .header .receipt-id { font-size: 12px; opacity: 0.85; margin-top: 4px; }
  .header .receipt-date { font-size: 11px; opacity: 0.7; margin-top: 2px; }
  .body { padding: 20px; }
  .customer-badge { display: inline-block; background: #f0fdf4; color: #059669; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 0; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; }
  th:last-child { text-align: right; }
  th:nth-child(2) { text-align: center; }
  .totals { margin-top: 16px; padding-top: 12px; border-top: 2px solid #e5e7eb; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
  .totals .grand { font-weight: 700; font-size: 18px; border-top: 2px solid #059669; padding-top: 10px; margin-top: 8px; color: #059669; }
  .payment-badge { display: inline-block; background: #f3f4f6; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
  .qr-section { text-align: center; padding: 16px 0; border-top: 1px dashed #e5e7eb; margin-top: 16px; }
  .qr-section img { border-radius: 8px; }
  .qr-section p { font-size: 10px; color: #9ca3af; margin-top: 6px; }
  .footer { text-align: center; padding: 16px 20px; background: #f9fafb; border-top: 1px solid #f3f4f6; }
  .footer p { margin: 2px 0; font-size: 11px; color: #9ca3af; }
  .btn-row { display: flex; gap: 8px; justify-content: center; padding: 16px; }
  .btn { padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s; }
  .btn-print { background: #059669; color: white; }
  .btn-print:hover { background: #047857; }
  .btn-close { background: #f3f4f6; color: #4b5563; }
  .btn-close:hover { background: #e5e7eb; }
</style></head><body>
<div class="receipt">
  <div class="header">
    <h1>${storeName}</h1>
    <div class="receipt-id">${order.id}</div>
    <div class="receipt-date">${new Date(order.date).toLocaleString()}</div>
  </div>
  <div class="body">
    ${order.customerName ? `<div class="customer-badge">👤 ${order.customerName}</div>` : ''}
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemsHTML}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span></div>
      <div class="row"><span>Tax (9%)</span><span>$${order.tax.toFixed(2)}</span></div>
      ${order.discount > 0 ? `<div class="row" style="color:#059669"><span>Discount</span><span>-$${order.discount.toFixed(2)}</span></div>` : ''}
      <div class="row grand"><span>TOTAL</span><span>$${order.total.toFixed(2)}</span></div>
      <div style="text-align:center;margin-top:8px"><span class="payment-badge">${order.paymentMethod}</span></div>
    </div>
    ${qrImageURL ? `
    <div class="qr-section">
      <img src="${qrImageURL}" alt="QR Code" width="120" height="120" />
      <p>Scan to verify transaction</p>
    </div>` : ''}
  </div>
  <div class="footer">
    <p>Thank you for your purchase!</p>
    <p>Returns accepted within 30 days with receipt</p>
  </div>
</div>
<div class="btn-row no-print">
  <button class="btn btn-print" onclick="window.print()">🖨️ Print</button>
  <button class="btn btn-close" onclick="window.close()">✕ Close</button>
</div>
</body></html>`;
}

export async function openReceiptWindow(order: Order, storeName?: string) {
  const html = await generateReceiptHTML(order, storeName);
  const win = window.open('', '_blank', 'width=420,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
