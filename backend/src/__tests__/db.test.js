const { createDb } = require('../db');

describe('createDb', () => {
  it('creates the users table with a unique username constraint', () => {
    const db = createDb(':memory:');

    const insert = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    );
    insert.run('alice', 'hashed-password');

    const row = db.prepare('SELECT * FROM users WHERE username = ?').get('alice');
    expect(row).toMatchObject({ username: 'alice', password_hash: 'hashed-password' });

    expect(() => insert.run('alice', 'another-hash')).toThrow();

    db.close();
  });
});
