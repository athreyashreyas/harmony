// Web Push from a Cloudflare Worker, implemented with the Web Crypto API only.
// The `web-push` npm package relies on Node's crypto.createECDH, which isn't
// available in the Workers runtime, so we build the VAPID auth header (RFC 8292)
// and the aes128gcm encrypted payload (RFC 8291) ourselves with SubtleCrypto.

export interface VapidConfig {
  publicKey: string; // base64url of the 65-byte uncompressed P-256 point
  privateKey: string; // base64url of the 32-byte private scalar
  subject: string; // mailto: or https: contact
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string; // base64url, recipient public key (65 bytes)
  auth: string; // base64url, auth secret (16 bytes)
}

export interface PushPayload {
  title: string;
  body: string;
  areaId?: string;
  url?: string;
}

const enc = new TextEncoder();

// TS 5.7 types Uint8Array as generic over ArrayBufferLike, which it won't widen
// to the BufferSource that SubtleCrypto expects. Our arrays are always plain
// ArrayBuffer-backed at runtime, so cast at the boundary.
const bs = (b: Uint8Array): BufferSource => b as unknown as BufferSource;

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function uint32be(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', bs(ikm), 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: bs(salt), info: bs(info) },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// VAPID "Authorization: vapid t=<JWT>, k=<publicKey>" header for one endpoint.
async function vapidAuthHeader(endpoint: string, vapid: VapidConfig): Promise<string> {
  const pub = b64urlToBytes(vapid.publicKey); // 0x04 || x(32) || y(32)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    d: bytesToB64url(b64urlToBytes(vapid.privateKey)),
    ext: true,
  };
  const signingKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: vapid.subject,
      }),
    ),
  );
  const signingInput = `${header}.${payload}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, bs(enc.encode(signingInput)));
  const jwt = `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
  return `vapid t=${jwt}, k=${vapid.publicKey}`;
}

// Encrypt the payload for one subscription using aes128gcm (RFC 8291).
async function encryptPayload(plaintext: Uint8Array, sub: StoredSubscription): Promise<Uint8Array> {
  const recipientPub = b64urlToBytes(sub.p256dh); // 65 bytes
  const authSecret = b64urlToBytes(sub.auth); // 16 bytes

  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const ephemeralPub = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey)); // 65 bytes

  const recipientKey = await crypto.subtle.importKey('raw', bs(recipientPub), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: recipientKey }, ephemeral.privateKey, 256),
  );

  // IKM from the shared secret, keyed by the auth secret (RFC 8291 section 3.4).
  const ikmInfo = concat(enc.encode('WebPush: info\0'), recipientPub, ephemeralPub);
  const ikm = await hkdf(authSecret, shared, ikmInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // Single record: plaintext followed by the 0x02 last-record delimiter.
  const record = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', bs(cek), { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(nonce) }, aesKey, bs(record)),
  );

  // aes128gcm header: salt(16) || record size(4) || keyid length(1) || keyid.
  const header = concat(salt, uint32be(4096), new Uint8Array([ephemeralPub.length]), ephemeralPub);
  return concat(header, ciphertext);
}

// Returns the push service's HTTP status. 404 and 410 mean the subscription is
// gone and the caller should delete it.
export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload,
  vapid: VapidConfig,
): Promise<number> {
  const body = await encryptPayload(enc.encode(JSON.stringify(payload)), subscription);
  const authorization = await vapidAuthHeader(subscription.endpoint, vapid);

  // A hung push endpoint must never stall the minute's whole pass. Abort after
  // 10s; the caller treats a throw as "not delivered" and retries next run.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(12 * 60 * 60),
      },
      // Workers fetch accepts a typed array at runtime; the lib's BodyInit type
      // omits it, so cast.
      body: body as unknown as BodyInit,
      signal: controller.signal,
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}
