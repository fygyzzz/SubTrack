import { pool } from './pool.js';
import bcryptjs from 'bcryptjs';

async function seed() {
  const hash = await bcryptjs.hash('test123', 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
    ['test@test.ru', hash, 'Тест Тестов']
  );

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', ['test@test.ru']);
  const userId = rows[0].id;

  const catQuery = await pool.query('SELECT id, name FROM categories');
  const cats = catQuery.rows;

  const subs = [
    { name: 'Netflix', amount: 999, cat: 'Стриминги', currency: 'RUB', period: 'monthly', days: 15 },
    { name: 'Яндекс Плюс', amount: 299, cat: 'Стриминги', currency: 'RUB', period: 'monthly', days: 10 },
    { name: 'iCloud 200GB', amount: 149, cat: 'ПО и сервисы', currency: 'RUB', period: 'monthly', days: 5 },
    { name: 'Квартплата', amount: 4500, cat: 'ЖКХ и связь', currency: 'RUB', period: 'monthly', days: 1 },
    { name: 'Кредитная карта', amount: 5000, cat: 'Кредиты и ипотека', currency: 'RUB', period: 'monthly', days: 20 },
    { name: 'Telegram Premium', amount: 299, cat: 'Подписки', currency: 'RUB', period: 'monthly', days: 8 },
    { name: 'Spotify', amount: 11.99, cat: 'Стриминги', currency: 'USD', period: 'monthly', days: 12 },
    { name: 'GitHub Copilot', amount: 100, cat: 'ПО и сервисы', currency: 'USD', period: 'yearly', days: 180 },
  ];

  // удаляем старые подписки тестового пользователя
  await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);

  for (const sub of subs) {
    const cat = cats.find(c => c.name === sub.cat);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + sub.days);
    await pool.query(
      `INSERT INTO subscriptions (user_id, category_id, name, amount, currency, period, next_payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, cat.id, sub.name, sub.amount, sub.currency, sub.period, nextDate.toISOString().split('T')[0]]
    );
  }

  console.log('Seed completed');
  await pool.end();
}

seed();
