import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import PDFDocument from 'pdfkit';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getRates } from '../currency.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = resolve(__dirname, '../../node_modules/inter-font/ttf');

const fmtRub = (n: number): string =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);

function toRub(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'RUB') return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  return amount * rate;
}

function buildWhere(userId: number, startDate?: string, endDate?: string) {
  const params: any[] = [userId];
  const clauses: string[] = ['s.user_id = $1'];

  if (startDate) {
    clauses.push(`s.next_payment_date >= $${params.length + 1}`);
    params.push(startDate);
  }
  if (endDate) {
    clauses.push(`s.next_payment_date <= $${params.length + 1}`);
    params.push(endDate);
  }

  return { where: clauses.join(' AND '), params };
}

export async function exportRoutes(app: FastifyInstance) {
  app.get('/csv', {
    schema: {
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date', description: 'Начало периода (YYYY-MM-DD)' },
          endDate: { type: 'string', format: 'date', description: 'Конец периода (YYYY-MM-DD)' },
        },
      },
    },
    onRequest: [app.authenticate],
  }, async (request: any, reply: any) => {
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
    const { where, params } = buildWhere(request.user.id, startDate, endDate);

    const { rows } = await pool.query(
      `SELECT s.*, c.name as category_name
       FROM subscriptions s LEFT JOIN categories c ON c.id = s.category_id
       WHERE ${where} ORDER BY s.next_payment_date ASC`,
      params
    );

    const rates = await getRates();
    const fmtDate = (d: any): string => {
      if (!d) return '';
      const date = typeof d === 'string' ? new Date(d) : d;
      return date.toLocaleDateString('ru-RU');
    };

    const esc = (v: any): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const periodLabel = (p: string): string => p === 'monthly' ? 'ежемесячно' : 'ежегодно';

    const bom = '\ufeff';
    const csv = bom + [
      ['Название', 'Сумма', 'Период', 'Дата списания', 'Категория', 'Пересмотреть'].join(';'),
      ...rows.map((s: any) => {
        const rub = toRub(Number(s.amount), s.currency, rates);
        return [
          esc(s.name),
          esc(fmtRub(rub)),
          esc(periodLabel(s.period)),
          esc(fmtDate(s.next_payment_date)),
          esc(s.category_name || ''),
          esc(s.review_flag ? 'да' : 'нет'),
        ].join(';');
      }),
    ].join('\r\n');

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename=subscriptions${startDate ? '_' + startDate : ''}.csv`);
    return csv;
  });

  app.get('/pdf', {
    schema: {
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date', description: 'Начало периода (YYYY-MM-DD)' },
          endDate: { type: 'string', format: 'date', description: 'Конец периода (YYYY-MM-DD)' },
        },
      },
    },
    onRequest: [app.authenticate],
  }, async (request: any, reply: any) => {
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
    const { where, params } = buildWhere(request.user.id, startDate, endDate);

    const { rows } = await pool.query(
      `SELECT s.*, c.name as category_name
       FROM subscriptions s LEFT JOIN categories c ON c.id = s.category_id
        WHERE ${where} ORDER BY s.next_payment_date ASC`,
      params
    );

    const rates = await getRates();
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    doc.registerFont('Inter', resolve(fontsDir, 'Inter-Regular.ttf'));
    doc.registerFont('Inter-Bold', resolve(fontsDir, 'Inter-Bold.ttf'));

    doc.font('Inter-Bold').fontSize(22).text('SubTrack - Мои подписки', { align: 'center' });
    if (startDate || endDate) {
      const range = [startDate, endDate].filter((s): s is string => !!s).map(s => new Date(s).toLocaleDateString('ru-RU')).join(' - ');
      doc.font('Inter').fontSize(11).fillColor('#666').text(`Период: ${range}`, { align: 'center' });
      doc.fillColor('#000');
    }
    doc.moveDown();

    for (const s of rows) {
      const rub = toRub(Number(s.amount), s.currency, rates);
      const period = s.period === 'monthly' ? 'мес' : 'год';

      doc
        .font('Inter')
        .fontSize(14)
        .text(s.name, { continued: true })
        .font('Inter')
        .fontSize(12)
        .text(`  ${fmtRub(rub)} / ${period}`, { align: 'right' });
      doc
        .font('Inter')
        .fontSize(10)
        .fillColor('#666')
        .text(`${s.category_name || 'Без категории'}  |  ${new Date(s.next_payment_date).toLocaleDateString('ru-RU')}`);
      doc.fillColor('#000').moveDown(0.5);
    }

    const pdf = await new Promise<Buffer>((resolvePdf) => {
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolvePdf(Buffer.concat(buffers)));
      doc.end();
    });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename=subscriptions${startDate ? '_' + startDate : ''}.pdf`);
    reply.send(pdf);
  });
}
