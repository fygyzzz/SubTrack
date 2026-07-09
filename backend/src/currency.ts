import { pool } from './db/pool.js';
import { XMLParser } from 'fast-xml-parser';

let cache: Record<string, number> = {};
let cacheTime = 0;
let loading: Promise<void> | null = null;

export async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cacheTime && now - cacheTime < 3600000) return cache;

  if (loading) {
    await loading;
    return cache;
  }

  loading = loadRates();
  await loading;
  loading = null;
  return cache;
}

async function loadRates() {
  // 1. пробуем CBR (XML)
  if (await tryCbrXml()) return;
  // 2. пробуем jsDelivr (JSON)
  if (await tryJsDelivr()) return;
  // 3. пробуем БД
  if (await tryDb()) return;
  if (!cacheTime) {
    console.warn('[RATES] All sources failed - no rates available');
    cache = { RUB: 1 };
    cacheTime = Date.now();
  }
}

async function tryCbrXml(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://www.cbr.ru/scripts/XML_daily.asp', {
      signal: controller.signal,
      headers: { 'Accept': 'application/xml' },
    });
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xml);
    const valutes = data.ValCurs.Valute;
    const rates: Record<string, number> = { RUB: 1 };
    for (const v of valutes) {
      const value = parseFloat(v.Value.replace(',', '.'));
      const nominal = parseInt(v.Nominal, 10);
      rates[v.CharCode] = value / nominal;
    }
    cache = rates;
    cacheTime = Date.now();
    await saveToDb(rates);
    console.log('[RATES] CBR XML updated:', Object.keys(rates).length, 'currencies');
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryJsDelivr(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/rub.json',
      { signal: controller.signal }
    );
    const data: any = await res.json();
    const rub = data.rub;
    const rates: Record<string, number> = { RUB: 1 };
    if (rub.usd) rates.USD = 1 / rub.usd;
    if (rub.eur) rates.EUR = 1 / rub.eur;
    if (rub.kzt) rates.KZT = 1 / rub.kzt;
    if (rub.cny) rates.CNY = 1 / rub.cny;
    if (rub.gbp) rates.GBP = 1 / rub.gbp;
    cache = rates;
    cacheTime = Date.now();
    await saveToDb(rates);
    console.log('[RATES] jsDelivr updated');
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryDb(): Promise<boolean> {
  try {
    const { rows } = await pool.query('SELECT currency, rate FROM exchange_rates ORDER BY updated_at DESC LIMIT 20');
    if (rows.length > 0) {
      const rates: Record<string, number> = { RUB: 1 };
      const cutoff = Date.now() - 86400000;
      const fresh = rows.some((r: any) => new Date(r.updated_at).getTime() > cutoff);
      for (const r of rows) {
        rates[r.currency] = parseFloat(r.rate);
      }
      cache = rates;
      cacheTime = fresh ? Date.now() : Date.now() - 3600000;
      console.log('[RATES] Loaded from DB, fresh:', fresh);
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

async function saveToDb(rates: Record<string, number>) {
  try {
    for (const [currency, rate] of Object.entries(rates)) {
      if (currency === 'RUB') continue;
      await pool.query(
        `INSERT INTO exchange_rates (currency, rate, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (currency) DO UPDATE SET rate = $2, updated_at = NOW()`,
        [currency, rate.toFixed(6)]
      );
    }
  } catch { /* ignore */ }
}
