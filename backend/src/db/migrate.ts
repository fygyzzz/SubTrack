import { pool } from './pool.js';

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50) NOT NULL DEFAULT 'folder'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
  period VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'yearly')),
  next_payment_date DATE NOT NULL,
  review_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  sent_at TIMESTAMP DEFAULT NOW(),
  type VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'browser'))
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  currency VARCHAR(3) PRIMARY KEY,
  rate DECIMAL(12,6) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO categories (name, icon) VALUES
  ('Стриминги', 'film'),
  ('ПО и сервисы', 'monitor'),
  ('ЖКХ и связь', 'home'),
  ('Кредиты и ипотека', 'credit-card'),
  ('Подписки', 'repeat'),
  ('Страхование', 'shield'),
  ('Другое', 'ellipsis')
ON CONFLICT DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_id VARCHAR(255) UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

DELETE FROM categories WHERE id NOT IN (SELECT MIN(id) FROM categories GROUP BY name);
`;

async function migrate() {
  try {
    await pool.query(sql);
    console.log('Migrate completed');
  } finally {
    await pool.end();
  }
}

migrate();
