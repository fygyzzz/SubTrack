import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '../.env') });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://subtrack:subtrack_secret@localhost:5432/subtrack',
  JWT_SECRET: process.env.JWT_SECRET || 'subtrack_jwt_secret_2026',
  PORT: Number(process.env.PORT) || 3001,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CBR_DAILY_URL: process.env.CBR_DAILY_URL || 'https://www.cbr.ru/scripts/XML_daily.asp',

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.yandex.ru',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 465,
  SMTP_SECURE: process.env.SMTP_SECURE !== 'false',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@mail.ru',
};
