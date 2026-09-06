// Utility for Asymmetric Elliptic Curve Cryptography (ECDSA P-256)

// 1. Generate a new Public/Private Keypair
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
  return keyPair;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// 2. Export Public Key to Base64
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

// 3. Export Private Key to Base64
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
}

// 4. Import Private Key from Base64
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(pem);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"]
  );
}

// 5. Sign the Transaction Payload using the Private Key
export async function signTransaction(privateKeyPem: string, payload: any): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyPem);
  
  const encoder = new TextEncoder();
  const dataToSign = encoder.encode(JSON.stringify(payload));

  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    dataToSign
  );

  return arrayBufferToBase64(signatureBuffer);
}
