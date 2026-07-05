import { createToken, hasAdminPassword, validateAdmin } from './lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasAdminPassword()) {
    return res.status(500).json({ error: 'Vercel 환경변수 ADMIN_PASSWORD가 설정되지 않았습니다.' });
  }

  const { id, password } = req.body || {};
  if (!validateAdmin(id, password)) return res.status(401).json({ error: '아이디 또는 패스워드가 올바르지 않습니다.' });

  return res.status(200).json({ token: createToken(id) });
}