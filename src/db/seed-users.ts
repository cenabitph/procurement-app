import { hash } from 'bcryptjs';
import { query } from './index';
import { randomUUID } from 'crypto';

const seedUsers = [
  { username: 'admin', password: 'admin', role: 'admin' },
  { username: 'officer', password: 'officer', role: 'officer' },
  { username: 'viewer', password: 'viewer', role: 'viewer' },
];

async function seed() {
  try {
    for (const user of seedUsers) {
      const exists = await query<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM users WHERE username = ?',
        [user.username]
      );

      if (exists[0]?.cnt === 0) {
        const passwordHash = await hash(user.password, 10);
        await query(
          'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
          [randomUUID(), user.username, passwordHash, user.role]
        );
        console.log(`✔  Created user: ${user.username} (${user.role})`);
      } else {
        console.log(`⊘  User already exists: ${user.username}`);
      }
    }
    console.log('✔  Seed users completed.');
  } catch (err) {
    console.error('Seed error:', err);
  }
}

seed();
