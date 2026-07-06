const pad = (value: number) => String(value).padStart(2, '0');

function randomHex6(): string {
  const bytes = new Uint8Array(3);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  return Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
}

export function createLocalOrderId(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}-${randomHex6()}`;
}