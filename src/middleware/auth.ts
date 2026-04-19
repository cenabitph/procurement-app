import { verify } from 'jsonwebtoken';
import type { Context, Next } from 'hono';

export interface JWTPayload {
  id: string;
  username: string;
  role: 'admin' | 'officer' | 'viewer';
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    // Check cookie as fallback (parse from Cookie header)
    const cookieHeader = c.req.header('Cookie') || '';
    const cookieMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const cookieToken = cookieMatch?.[1];

    if (!cookieToken) {
      return c.redirect('/login');
    }
    try {
      const payload = verify(cookieToken, process.env.JWT_SECRET ?? 'your-secret-key') as JWTPayload;
      c.set('user', payload);
    } catch {
      return c.redirect('/login');
    }
  } else {
    try {
      const payload = verify(token, process.env.JWT_SECRET ?? 'your-secret-key') as JWTPayload;
      c.set('user', payload);
    } catch {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  await next();
}

export function getUser(c: Context): JWTPayload | null {
  return c.get('user') ?? null;
}
