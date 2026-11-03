import { Order } from '@/types';
import { generateQRCodeSVG } from './qrGenerator';

export interface PrintConfiguration {
  paperWidth: '80mm' | '58mm';
  restaurantName: string;
  tagline?: string;
  address: string;
  phone?: string;
  gstin?: string;
  showQrCode: boolean;
  showPrices: boolean;
  fontSize: 'compact' | 'normal';
  footerNote: string;
  slipTitle: string; // e.g., 'KOT & BILL SLIP' or 'FOOD RESTAURANT SLIP'
}

export const DEFAULT_PRINT_CONFIG: PrintConfiguration = {
  paperWidth: '80mm',
  restaurantName: 'Only Dhosa',
  tagline: 'Food Restaurant Management',
  address: 'Maruti Chowk, Tapovam Mahadev Mandir, 60 feet main road, opp. Anupam Heights and Bajrang Dairy bestakar, Vavdi, Rajkot, Gujarat. 360004',
  phone: '+91 98765 43210',
  gstin: '',
  showQrCode: true,
  showPrices: true,
  fontSize: 'normal',
  footerNote: 'THANK YOU! VISIT AGAIN',
  slipTitle: 'FOOD RESTAURANT BILL / KOT',
};

const STORAGE_KEY = 'food_restaurant_pos_print_config_v1';

export function getSavedPrintConfig(customSettings?: { restaurant_name?: string; address?: string; phone?: string; gstin?: string }): PrintConfiguration {
  if (typeof window === 'undefined') {
    return {
      ...DEFAULT_PRINT_CONFIG,
      restaurantName: customSettings?.restaurant_name || DEFAULT_PRINT_CONFIG.restaurantName,
      address: customSettings?.address || DEFAULT_PRINT_CONFIG.address,
      phone: customSettings?.phone || DEFAULT_PRINT_CONFIG.phone,
      gstin: customSettings?.gstin || DEFAULT_PRINT_CONFIG.gstin,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PRINT_CONFIG,
        restaurantName: customSettings?.restaurant_name || DEFAULT_PRINT_CONFIG.restaurantName,
        address: customSettings?.address || DEFAULT_PRINT_CONFIG.address,
        phone: customSettings?.phone || DEFAULT_PRINT_CONFIG.phone,
        gstin: customSettings?.gstin || DEFAULT_PRINT_CONFIG.gstin,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRINT_CONFIG,
      ...parsed,
      restaurantName: parsed.restaurantName || customSettings?.restaurant_name || DEFAULT_PRINT_CONFIG.restaurantName,
      address: parsed.address || customSettings?.address || DEFAULT_PRINT_CONFIG.address,
    };
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function savePrintConfig(config: Partial<PrintConfiguration>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedPrintConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save print config', err);
  }
}

/**
 * Builds standard thermal printer HTML for Food Restaurant Management KOT/Bill slip
 */
export function buildSlipHtml(order: Order, tableNumber?: string, config?: PrintConfiguration): string {
  const cfg = config || DEFAULT_PRINT_CONFIG;
  const is58mm = cfg.paperWidth === '58mm';
  
  const createdDate = order.created_at ? new Date(order.created_at) : new Date();
  const dateStr = createdDate.toLocaleDateString('en-GB');
  const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const invoiceNo = `2627-${String(order.id).padStart(5, '0')}`;
  const kotNo = order.token_no ? `KOT #${order.token_no}` : `KOT #${order.id}`;
  const resolvedTable = order.table_number || tableNumber || 'N/A';
  
  const items = order.items || [];
  const totalItemsCount = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const grandTotal = Number(order.grand_total || 0).toFixed(2);
  const subtotal = Number(order.subtotal || grandTotal).toFixed(2);
  const discount = Number(order.discount || 0);

  // Generate 100% offline inline SVG QR code
  const qrSvg = generateQRCodeSVG(`POS_INV_${invoiceNo}`, is58mm ? 76 : 88);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${invoiceNo} - ${kotNo} Slip</title>
  <style>
    @page {
      size: ${cfg.paperWidth} auto;
      margin: 2mm 2.5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 4px 2px 24px 2px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: ${is58mm ? '10.5px' : cfg.fontSize === 'compact' ? '11px' : '12px'};
      line-height: 1.25;
      color: #000;
      background: #fff;
      width: 100%;
      max-width: ${is58mm ? '54mm' : '76mm'};
      margin-left: auto;
      margin-right: auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    
    .restaurant-title {
      font-size: ${is58mm ? '15px' : '17px'};
      font-weight: 900;
      letter-spacing: -0.2px;
      margin: 0;
      text-transform: uppercase;
      color: #e11d48;
    }
    .restaurant-sub {
      font-size: 9.5px;
      font-weight: 600;
      color: #444;
      line-height: 1.2;
      margin-top: 3px;
    }
    .slip-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1px 6px;
      border: 1px solid #000;
      border-radius: 4px;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? '10px' : '11px'};
      margin: 2px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: ${is58mm ? '10px' : '11px'};
    }
    th {
      border-bottom: 1px dashed #000;
      padding: 3px 1px;
      font-weight: 800;
    }
    td {
      padding: 3px 1px;
      vertical-align: top;
    }
    .item-name {
      font-weight: 700;
      word-break: break-word;
    }
    .item-notes {
      font-size: 9px;
      color: #555;
      margin-top: 1px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: ${is58mm ? '10.5px' : '11.5px'};
    }
    .total-box {
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      padding: 4px 0;
      margin-top: 4px;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? '14px' : '16px'};
      font-weight: 900;
    }
    .qr-block {
      margin-top: 8px;
      text-align: center;
    }
    .qr-block svg {
      margin: 3px auto;
      display: block;
    }
    .footer-text {
      font-size: 10px;
      font-weight: 800;
      text-align: center;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .cut-feed {
      height: 20px;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="restaurant-title">🍕 ${cfg.restaurantName}</div>
    <div class="restaurant-sub">${cfg.address}</div>
    ${cfg.phone ? `<div class="restaurant-sub font-bold">Tel: ${cfg.phone}</div>` : ''}
    ${cfg.gstin ? `<div class="restaurant-sub">GSTIN: ${cfg.gstin}</div>` : ''}
    <div class="slip-badge">${cfg.slipTitle || 'FOOD RESTAURANT BILL / KOT'}</div>
  </div>

  <div class="divider"></div>

  <div class="meta-row">
    <span class="font-bold">Table: ${resolvedTable}</span>
    <span class="font-bold">${kotNo}</span>
  </div>
  <div class="meta-row">
    <span>Invoice: <b>${invoiceNo}</b></span>
    <span>Type: <b>${order.order_type || 'Dine-In'}</b></span>
  </div>
  <div class="meta-row">
    <span>Date: ${dateStr}</span>
    <span>Time: ${timeStr}</span>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th class="text-left" style="width: 50%;">Name</th>
        <th class="text-center" style="width: 14%;">Qty</th>
        <th class="text-right" style="width: 18%;">Price</th>
        <th class="text-right" style="width: 18%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it: any) => {
        const qty = it.quantity || 1;
        const price = Number(it.price || 0);
        const lineTotal = Number(it.total_price || (qty * price));
        const notes = it.notes ? `<div class="item-notes">↳ ${it.notes}</div>` : '';
        return `
          <tr>
            <td class="text-left">
              <span class="item-name">${it.name}</span>
              ${notes}
            </td>
            <td class="text-center font-bold">${qty}</td>
            <td class="text-right">${price.toFixed(1)}</td>
            <td class="text-right font-bold">${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="summary-row">
    <span class="font-bold">Total Items</span>
    <span class="font-bold">${totalItemsCount}</span>
  </div>
  ${discount > 0 ? `
    <div class="summary-row">
      <span>Subtotal</span>
      <span>${subtotal}</span>
    </div>
    <div class="summary-row">
      <span>Discount</span>
      <span>-${discount.toFixed(2)}</span>
    </div>
  ` : ''}

  <div class="total-box">
    <span>Total</span>
    <span>${grandTotal}</span>
  </div>

  ${cfg.showQrCode ? `
    <div class="qr-block">
      <div style="font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px;">THANK YOU</div>
      <div style="display: flex; justify-content: center;">
        ${qrSvg}
      </div>
      <div style="font-size: 8.5px; font-weight: 700; color: #444; margin-top: 3px;">INV: ${invoiceNo}</div>
    </div>
  ` : `
    <div class="footer-text">THANK YOU</div>
  `}

  <div class="footer-text">${cfg.footerNote || 'THANK YOU! VISIT AGAIN'}</div>
  <div class="cut-feed"></div>
</body>
</html>`;
}

/**
 * Triggers thermal slip printing via an isolated hidden iframe
 */
export function printOrderSlip(
  order: Order, 
  tableNumber?: string, 
  customConfig?: Partial<PrintConfiguration>
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const config: PrintConfiguration = {
      ...getSavedPrintConfig(),
      ...(customConfig || {}),
    };

    const html = buildSlipHtml(order, tableNumber, config);

    // Reuse or create hidden iframe
    let iframe = document.getElementById('__thermal_pos_print_frame__') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = '__thermal_pos_print_frame__';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      resolve(true);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // With inline SVG, DOM is ready immediately
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve(true);
      } catch (err) {
        console.error('Print trigger failed', err);
        window.print();
        resolve(false);
      }
    }, 150);
  });
}
