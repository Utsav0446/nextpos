'use server';

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { getOrderById } from '@/queries/orders';
import { getSettings } from '@/queries/settings';
import { getCurrentUser } from '@/lib/auth';

// Helper: center-align text
function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(padding) + text;
}

// Helper: justify text (left-aligned + right-aligned)
function justifyText(left: string, right: string, width: number): string {
  if (left.length + right.length >= width) {
    const space = width - right.length - 1;
    return left.substring(0, Math.max(0, space)) + ' ' + right;
  }
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(spaces) + right;
}

async function sendToPrinter(ip: string, port: number, data: string, jobName: string) {
  // 1. Save to local print_jobs folder for simulation & visual testing
  try {
    const dir = path.join(process.cwd(), 'print_jobs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${jobName}_${Date.now()}.txt`);
    fs.writeFileSync(filePath, data, 'utf-8');
    console.log(`[Printer Simulation] Saved job ${jobName} to ${filePath}`);
  } catch (err) {
    console.error('Failed to save printer simulation file:', err);
  }

  // 2. Try to connect to real ESC/POS printer via TCP socket
  return new Promise<boolean>((resolve) => {
    if (!ip || ip === '127.0.0.1' || ip.trim() === '') {
      console.log(`[Printer] Skipping real socket print for local/empty IP: ${ip}`);
      return resolve(true); // Treat local/empty as success for simulation
    }

    const socket = new net.Socket();
    socket.setTimeout(3000); // 3 seconds timeout

    socket.connect(port, ip, () => {
      // ESC/POS Initialization: ESC @ (0x1B 0x40)
      const initCommand = Buffer.from([0x1B, 0x40]);
      socket.write(initCommand);
      
      // Write the text data
      socket.write(data);
      
      // Feed 3 lines & Cut paper: GS V 66 0 (0x1D 0x56 0x42 0x00)
      const cutCommand = Buffer.from([0x1B, 0x64, 0x03, 0x1D, 0x56, 0x42, 0x00]);
      socket.write(cutCommand);
      
      socket.end();
      resolve(true);
    });

    socket.on('error', (err) => {
      console.error(`[Printer Socket Error] Failed to print to ${ip}:${port} - ${err.message}`);
      socket.destroy();
      resolve(false); // resolve false but don't crash, we have the simulation file
    });

    socket.on('timeout', () => {
      console.error(`[Printer Socket Timeout] Connection timed out to ${ip}:${port}`);
      socket.destroy();
      resolve(false);
    });
  });
}

function generateBillReceiptText(order: any, settings: any) {
  const paperWidth = settings.paper_width || '80mm';
  const width = paperWidth === '80mm' ? 42 : 32;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);
  
  let out = '';
  if (settings.logo_url) {
    out += centerText('[ LOGO ]', width) + '\n';
  }
  out += centerText(settings.restaurant_name, width) + '\n';
  if (settings.receipt_header) {
    out += centerText(settings.receipt_header, width) + '\n';
  }
  if (settings.address) {
    out += centerText(settings.address, width) + '\n';
  }
  if (settings.phone) {
    out += centerText(`Tel: ${settings.phone}`, width) + '\n';
  }
  if (settings.gstin) {
    out += centerText(`GSTIN: ${settings.gstin}`, width) + '\n';
  }
  out += doubleLine + '\n';
  
  if (settings.enable_token_number && order.token_no) {
    out += centerText(`TOKEN NO: ${order.token_no}`, width) + '\n';
    out += doubleLine + '\n';
  }
  
  out += justifyText(`Bill No: #${order.id}`, `Type: ${order.order_type}`, width) + '\n';
  out += justifyText(`Date: ${new Date(order.created_at).toLocaleDateString()}`, order.table_number ? `Table: ${order.table_number}` : '', width) + '\n';
  out += `Customer: ${order.customer_name || 'Walk-In'}\n`;
  out += line + '\n';
  
  out += justifyText('Item', 'Qty   Amt', width) + '\n';
  out += line + '\n';
  
  order.items?.forEach((item: any) => {
    const qtyStr = item.quantity.toString().padEnd(5);
    const amtStr = (Number(item.price) * item.quantity).toFixed(2);
    out += justifyText(item.name, `${qtyStr}${amtStr}`, width) + '\n';
  });
  
  out += line + '\n';
  out += justifyText('Subtotal:', Number(order.subtotal).toFixed(2), width) + '\n';
  if (Number(order.tax) > 0) {
    out += justifyText(`GST (${settings.gst_percentage}%):`, Number(order.tax).toFixed(2), width) + '\n';
  }
  if (Number(order.discount) > 0) {
    out += justifyText('Discount:', `-${Number(order.discount).toFixed(2)}`, width) + '\n';
  }
  out += doubleLine + '\n';
  out += justifyText('GRAND TOTAL:', Number(order.grand_total).toFixed(2), width) + '\n';
  out += doubleLine + '\n';
  
  if (order.payment_type) {
    out += centerText(`Paid via ${order.payment_type}`, width) + '\n';
  }
  out += '\n';
  out += centerText(settings.receipt_footer || 'Thank you! Visit again!', width) + '\n';
  out += centerText('System generated copy', width) + '\n';
  
  return out;
}

function generateKOTText(order: any, settings: any) {
  const paperWidth = settings.paper_width || '80mm';
  const width = paperWidth === '80mm' ? 42 : 32;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);
  
  let out = '';
  out += '\n';
  const headerText = order.order_type === 'Takeaway' ? '*** PARCEL ORDER ***' : '*** KITCHEN ORDER ***';
  out += centerText(headerText, width) + '\n';
  out += doubleLine + '\n';
  
  // Highlight Table or Token prominently
  if (order.order_type === 'Dine-In' && order.table_number) {
    out += centerText(`TABLE: ${order.table_number.toUpperCase()}`, width) + '\n';
  } else if (order.token_no) {
    out += centerText(`TOKEN NO: #${order.token_no}`, width) + '\n';
  } else {
    out += centerText(`ORDER ID: #${order.id}`, width) + '\n';
  }
  out += doubleLine + '\n';
  
  // Metadata
  out += justifyText(`Order: #${order.id}`, `Type: ${order.order_type.toUpperCase()}`, width) + '\n';
  const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  out += justifyText(`Time: ${orderTime}`, `Date: ${new Date(order.created_at).toLocaleDateString()}`, width) + '\n';
  out += line + '\n';
  
  // Items header
  out += justifyText('QTY    ITEM DETAILS', '', width) + '\n';
  out += line + '\n';
  
  // Items listing
  order.items?.forEach((item: any) => {
    const openParenIdx = item.name.indexOf('(');
    let namePart = item.name;
    let customPart = '';
    if (openParenIdx !== -1) {
      namePart = item.name.substring(0, openParenIdx).trim();
      customPart = item.name.substring(openParenIdx).trim();
      if (customPart.startsWith('(') && customPart.endsWith(')')) {
        customPart = customPart.substring(1, customPart.length - 1).trim();
      }
    }
    
    // Format quantity and name line
    const qtyStr = `${item.quantity}`.padEnd(3);
    out += `${qtyStr} x  ${namePart.toUpperCase()}\n`;
    
    // Add indented customizations
    if (customPart) {
      out += `       >> ${customPart.toUpperCase()}\n`;
    }
  });
  
  out += line + '\n';
  
  // Prominent Notes section
  if (order.notes && order.notes.trim() !== '') {
    out += '\n';
    out += doubleLine + '\n';
    out += centerText('SPECIAL INSTRUCTIONS / NOTES', width) + '\n';
    out += line + '\n';
    
    // Wrap notes if they exceed the printer width
    const notesWords = order.notes.split(' ');
    let currentLine = '';
    notesWords.forEach((word: string) => {
      if ((currentLine + word).length >= width - 2) {
        out += ` ${currentLine.trim()}\n`;
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });
    if (currentLine) {
      out += ` ${currentLine.trim()}\n`;
    }
    
    out += doubleLine + '\n';
  }
  
  out += '\n\n'; // Feed spacing
  return out;
}

function generateTokenSlipText(order: any, settings: any) {
  const paperWidth = settings.paper_width || '80mm';
  const width = paperWidth === '80mm' ? 42 : 32;
  const doubleLine = '='.repeat(width);
  
  let out = '';
  if (settings.logo_url) {
    out += centerText('[ LOGO ]', width) + '\n';
  }
  out += centerText(settings.restaurant_name, width) + '\n';
  out += doubleLine + '\n';
  out += '\n';
  out += centerText('CUSTOMER CLAIM SLIP', width) + '\n';
  out += '\n';
  out += centerText('TOKEN NUMBER', width) + '\n';
  out += centerText(`[ ${order.token_no || order.id} ]`, width) + '\n';
  out += '\n';
  out += doubleLine + '\n';
  out += justifyText(`Order: #${order.id}`, `Type: ${order.order_type}`, width) + '\n';
  out += centerText(new Date(order.created_at).toLocaleTimeString(), width) + '\n';
  out += '\n';
  out += centerText('Please present this slip', width) + '\n';
  out += centerText('to collect your parcel.', width) + '\n';
  
  return out;
}

export async function printKOTAction(orderId: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const order = await getOrderById(orderId);
    if (!order) return { error: 'Order not found.' };

    const settings = await getSettings();

    const kotData = generateKOTText(order, settings);
    const ip = settings.kot_printer_ip || '127.0.0.1';
    const port = settings.kot_printer_port || 9100;

    const copies = settings.kot_copies || 1;
    for (let i = 0; i < copies; i++) {
      await sendToPrinter(ip, port, kotData, `kot_order_${orderId}_copy_${i+1}`);
    }
    return { success: true, printed: 'kot_on_kot_printer', copies };
  } catch (err: any) {
    return { error: err.message || 'Failed to print KOT.' };
  }
}

export async function printBillAction(orderId: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const order = await getOrderById(orderId);
    if (!order) return { error: 'Order not found.' };

    const settings = await getSettings();

    const billData = generateBillReceiptText(order, settings);
    const ip = settings.bill_printer_ip || '127.0.0.1';
    const port = settings.bill_printer_port || 9100;

    await sendToPrinter(ip, port, billData, `${order.order_type.toLowerCase()}_bill_order_${orderId}`);

    if (order.order_type === 'Takeaway' && settings.enable_token_number) {
      const tokenData = generateTokenSlipText(order, settings);
      await sendToPrinter(ip, port, tokenData, `parcel_token_order_${orderId}`);
    }

    return { success: true, printed: `${order.order_type.toLowerCase()}_bill_on_bill_printer` };
  } catch (err: any) {
    return { error: err.message || 'Failed to print bill.' };
  }
}

export async function testPrinterAction(printerType: 'bill' | 'kot') {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    const settings = await getSettings();
    const isBill = printerType === 'bill';
    const ip = isBill ? (settings.bill_printer_ip || '127.0.0.1') : (settings.kot_printer_ip || '127.0.0.1');
    const port = isBill ? (settings.bill_printer_port || 9100) : (settings.kot_printer_port || 9100);
    const paperWidth = settings.paper_width || '80mm';
    const width = paperWidth === '80mm' ? 42 : 32;

    const line = '-'.repeat(width);
    const doubleLine = '='.repeat(width);

    let out = '';
    out += doubleLine + '\n';
    out += centerText('PRINTER TEST SLIP', width) + '\n';
    out += doubleLine + '\n';
    out += justifyText('Printer:', isBill ? 'BILL PRINTER' : 'KOT PRINTER', width) + '\n';
    out += justifyText('Target IP:', ip, width) + '\n';
    out += justifyText('Port:', port.toString(), width) + '\n';
    out += justifyText('Paper Width:', paperWidth, width) + '\n';
    out += line + '\n';
    out += centerText('If you see this ticket,', width) + '\n';
    out += centerText('your configuration is correct!', width) + '\n';
    out += line + '\n';
    out += centerText(new Date().toLocaleString(), width) + '\n';
    out += doubleLine + '\n';

    const success = await sendToPrinter(ip, port, out, `test_${printerType}_printer`);
    if (success) {
      return { success: true };
    } else {
      return { error: `Could not connect to printer at ${ip}:${port}. Check connection & network settings.` };
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to trigger test print.' };
  }
}
