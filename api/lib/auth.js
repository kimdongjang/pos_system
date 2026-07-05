import crypto from 'node:crypto';

const getAdminId = () => process.env.ADMIN_ID || process.env.ADMIN_USERNAME || 'admin';
const getAdminPassword = () => process.env.ADMIN_PASSWORD || '';
const getAuthSecret = () => process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'dev-pos-secret';

export function hasAdminPassword() {
  return Boolean(getAdminPassword());
}

export function validateAdmin(id, password) {
  return id === getAdminId() && Boolean(password) && password === getAdminPassword();
}

export function createToken(id) {
  const payload = Buffer.from(JSON.stringify({ id, iat: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed?.id === getAdminId();
  } catch {
    return false;
  }
}

export function requireAuth(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (verifyToken(token)) return true;
  res.status(401).json({ error: '인증이 필요합니다.' });
  return false;
}