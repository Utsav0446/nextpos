/**
 * Zero-dependency Offline QR Code Generator for POS Slips & Invoices.
 * Produces crisp, standalone SVG strings that render instantly without any network calls.
 */

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

// GF(256) tables for Reed-Solomon Error Correction
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP_TABLE[i] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function glog(n: number): number {
  if (n < 1) throw new Error(`glog(${n})`);
  return LOG_TABLE[n];
}

function gexp(n: number): number {
  let val = n;
  while (val < 0) val += 255;
  while (val >= 255) val -= 255;
  return EXP_TABLE[val];
}

class QRPolynomial {
  num: Uint8Array;
  constructor(num: number[] | Uint8Array, shift = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Uint8Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[offset + i];
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Uint8Array(this.getLength() + e.getLength() - 1);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      }
    }
    return new QRPolynomial(num);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = glog(this.get(0)) - glog(e.get(0));
    const num = new Uint8Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
    return new QRPolynomial(num).mod(e);
  }
}

function getErrorCorrectionPolynomial(ecLength: number): QRPolynomial {
  let a = new QRPolynomial([1]);
  for (let i = 0; i < ecLength; i++) {
    a = a.multiply(new QRPolynomial([1, gexp(i)]));
  }
  return a;
}

// Version capacities with Medium (M) Error Correction (15%)
const VERSION_SPECS: Record<number, { totalCodewords: number; dataCodewords: number; ecCodewords: number }> = {
  1: { totalCodewords: 26, dataCodewords: 16, ecCodewords: 10 },
  2: { totalCodewords: 44, dataCodewords: 28, ecCodewords: 16 },
  3: { totalCodewords: 70, dataCodewords: 44, ecCodewords: 26 },
  4: { totalCodewords: 100, dataCodewords: 64, ecCodewords: 36 },
  5: { totalCodewords: 134, dataCodewords: 86, ecCodewords: 48 },
};

/**
 * Generates an offline vector SVG string for any text (Invoice ID, URL, UPI, etc.)
 */
export function generateQRCodeSVG(text: string, size = 90): string {
  if (!text) text = 'POS';
  const textBytes = new TextEncoder().encode(text);
  
  let version = 1;
  while (version <= 5) {
    const spec = VERSION_SPECS[version];
    if (textBytes.length + 2 <= spec.dataCodewords) break;
    version++;
  }
  if (version > 5) version = 5;

  const spec = VERSION_SPECS[version];
  const moduleCount = version * 4 + 17;

  // 1. Bit Stream
  const buffer = new QRBitBuffer();
  buffer.put(0x4, 4); // 8-bit byte mode
  buffer.put(textBytes.length, 8); // character count indicator
  for (let i = 0; i < textBytes.length; i++) {
    buffer.put(textBytes[i], 8);
  }

  // Terminator (up to 4 zeroes)
  const totalDataBits = spec.dataCodewords * 8;
  const paddingLength = Math.min(4, totalDataBits - buffer.length);
  buffer.put(0, paddingLength);
  while (buffer.length % 8 !== 0) {
    buffer.putBit(false);
  }

  // Padding bytes alternating 0xEC, 0x11
  let padByte = 0xec;
  while (buffer.length < totalDataBits) {
    buffer.put(padByte, 8);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  // Codewords
  const dataCodewords = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < spec.dataCodewords; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      if (buffer.get(i * 8 + j)) b |= 1 << (7 - j);
    }
    dataCodewords[i] = b;
  }

  // RS Error Correction
  const rsPoly = getErrorCorrectionPolynomial(spec.ecCodewords);
  const dataPoly = new QRPolynomial(dataCodewords, spec.ecCodewords);
  const remainder = dataPoly.mod(rsPoly);

  const finalCodewords = new Uint8Array(spec.totalCodewords);
  finalCodewords.set(dataCodewords, 0);
  for (let i = 0; i < spec.ecCodewords; i++) {
    finalCodewords[spec.dataCodewords + i] = remainder.get(i);
  }

  // Matrix construction
  const matrix: (boolean | null)[][] = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(null));

  // Finder Patterns (7x7) + 1-module separators
  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= moduleCount || mc < 0 || mc >= moduleCount) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[mr][mc] = true;
        } else {
          matrix[mr][mc] = false;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, moduleCount - 7);
  placeFinder(moduleCount - 7, 0);

  // Alignment Pattern for Version >= 2
  if (version >= 2) {
    const alignPos = version * 4 + 10;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const mr = alignPos + r;
        const mc = alignPos + c;
        if (matrix[mr][mc] === null) {
          if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
            matrix[mr][mc] = true;
          } else {
            matrix[mr][mc] = false;
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < moduleCount - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[moduleCount - 8][8] = true;

  // Reserve format info modules
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = moduleCount - 8; i < moduleCount; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }

  // Data Placement (zig-zag 2 columns at a time)
  let bitIndex = 0;
  const totalBits = spec.totalCodewords * 8;
  for (let right = moduleCount - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip vertical timing line
    for (let vert = 0; vert < moduleCount; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? moduleCount - 1 - vert : vert;

        if (matrix[r][c] === null) {
          let bit = false;
          if (bitIndex < totalBits) {
            const byteIdx = Math.floor(bitIndex / 8);
            const bitOffset = 7 - (bitIndex % 8);
            bit = ((finalCodewords[byteIdx] >>> bitOffset) & 1) === 1;
            bitIndex++;
          }
          // Mask 0: (row + col) % 2 == 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? !bit : bit;
        }
      }
    }
  }

  // Format Information (EC Level M = 00, Mask 0 = 000)
  // 15-bit format polynomial: 0x5412 = 101010000010010
  const FORMAT_INFO = 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = ((FORMAT_INFO >>> i) & 1) === 1;

    // Around top-left finder
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Split across bottom-left and top-right finders
    if (i < 8) matrix[moduleCount - 1 - i][8] = bit;
    else matrix[8][moduleCount - 15 + i] = bit;
  }

  // Generate crisp SVG path
  let pathD = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        pathD += `M${c},${r}h1v1h-1z `;
      }
    }
  }

  // Margin around QR (quiet zone: 2 modules for thermal receipts)
  const quietZone = 2;
  const viewBoxSize = moduleCount + quietZone * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#ffffff"/>
    <g transform="translate(${quietZone}, ${quietZone})">
      <path d="${pathD.trim()}" fill="#000000"/>
    </g>
  </svg>`;
}

/**
 * Returns a data-URI suitable for <img src="...">
 */
export function generateQRCodeDataUrl(text: string, size = 90): string {
  const svg = generateQRCodeSVG(text, size);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

