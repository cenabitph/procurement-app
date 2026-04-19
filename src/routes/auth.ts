import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';
import { query, queryOne } from '../db/index';

const app = new Hono();

// POST /auth/register - Register new user
app.post('/register', async (c) => {
  const { username, password, role } = await c.req.json() as {
    username: string;
    password: string;
    role?: string;
  };

  if (!username || !password) {
    return c.json({ error: 'Username and password required' }, 400);
  }

  try {
    // Check if user exists
    const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return c.json({ error: 'User already exists' }, 409);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hash(password, 10);
    const userRole = (role === 'admin' || role === 'viewer') ? role : 'officer';

    await query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [id, username, passwordHash, userRole]
    );

    return c.json({ success: true, id, username, role: userRole }, 201);
  } catch (err) {
    console.error('Register error:', err);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// POST /auth/login - Login user
app.post('/login', async (c) => {
  const { username, password } = await c.req.json() as {
    username: string;
    password: string;
  };

  if (!username || !password) {
    return c.json({ error: 'Username and password required' }, 400);
  }

  try {
    const user = await queryOne<any>(
      'SELECT id, username, password_hash, role, active FROM users WHERE username = ?',
      [username]
    );

    if (!user || !user.active) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const validPassword = await compare(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET ?? 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Set cookie header manually
    const maxAge = 7 * 24 * 60 * 60;
    const cookieValue = `auth_token=${token}; Max-Age=${maxAge}; Path=/; HttpOnly${process.env.NODE_ENV === 'production' ? '; Secure' : ''}; SameSite=Lax`;
    c.header('Set-Cookie', cookieValue);

    return c.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// POST /auth/logout - Logout user
app.post('/logout', (c) => {
  c.header('Set-Cookie', 'auth_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
  return c.json({ success: true });
  return c.json({ success: true });
});

export default app;
