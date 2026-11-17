// Web Crypto PBKDF2-SHA512 helper matching server/auth.ts Node pbkdf2Sync(password, salt, 10000, 64, 'sha512')

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPasswordWeb(password: string): Promise<{ salt: string; hash: string }> {
  const randomBytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 16; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  const salt = bytesToHex(randomBytes);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 10000,
        hash: 'SHA-512',
      },
      keyMaterial,
      512
    );
    return {
      salt,
      hash: bytesToHex(new Uint8Array(derivedBits)),
    };
  }

  // Fallback for environments without crypto.subtle
  return { salt: 'plain', hash: password };
}

export async function verifyPasswordWeb(
  password: string,
  salt?: string | null,
  hash?: string | null
): Promise<boolean> {
  if (!password || !hash) return false;
  if (salt === 'plain') {
    return password === hash;
  }
  if (!salt) return false;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 10000,
          hash: 'SHA-512',
        },
        keyMaterial,
        512
      );
      const computed = bytesToHex(new Uint8Array(derivedBits));
      return computed.toLowerCase() === String(hash).toLowerCase();
    }
    return false;
  } catch {
    return false;
  }
}
