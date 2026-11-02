const crypto = globalThis.crypto;

const encoder = new TextEncoder();

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_pos_secret_jwt_key_2026_change_in_prod';

function arrayBufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * Signs a payload with HMAC SHA-256 using Web Crypto API.
 */
export async function signJWT(payload: Record<string, any>, expiresInSeconds: number = 7 * 24 * 60 * 60): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const enrichedPayload = { ...payload, exp };

  const encodedHeader = arrayBufferToBase64Url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = arrayBufferToBase64Url(encoder.encode(JSON.stringify(enrichedPayload)));
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${encodedHeader}.${encodedPayload}`)
  );
  
  const encodedSignature = arrayBufferToBase64Url(signature);
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies a JWT token with HMAC SHA-256 using Web Crypto API.
 */
export async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = base64UrlToArrayBuffer(encodedSignature);
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!isValid) return null;
    
    const decodedPayload = JSON.parse(
      new TextDecoder().decode(base64UrlToArrayBuffer(encodedPayload))
    );
    
    // Check token expiration
    if (decodedPayload.exp && Math.floor(Date.now() / 1000) >= decodedPayload.exp) {
      return null;
    }
    
    return decodedPayload;
  } catch (error) {
    return null;
  }
}
