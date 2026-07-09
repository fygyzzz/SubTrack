# API Описание — SubTrack

Базовый URL: `http://localhost:3001/api`

## Аутентификация

### POST /auth/register
```json
// Request
{ "email": "user@test.ru", "password": "123456", "name": "Иван" }
// Response 201
{ "token": "jwt...", "user": { "id": 1, "email": "...", "name": "..." } }
```

### POST /auth/login
```json
// Request
{ "email": "user@test.ru", "password": "123456" }
// Response 200
{ "token": "jwt...", "user": { "id": 1, "email": "...", "name": "..." } }
```

### GET /auth/me
_Header: Authorization: Bearer \<token\>_
```json
// Response 200
{ "id": 1, "email": "user@test.ru", "name": "Иван" }
```

## Категории

### GET /categories
```json
// Response 200
[
  { "id": 1, "name": "Стриминги", "icon": "film" },
  { "id": 2, "name": "ПО и сервисы", "icon": "monitor" }
]
```

## Подписки (требуют JWT)

### GET /subscriptions
Список всех подписок пользователя.

### POST /subscriptions
```json
// Request
{
  "name": "Netflix",
  "amount": 999,
  "currency": "RUB",
  "period": "monthly",
  "next_payment_date": "2026-08-01",
  "category_id": 1
}
```

### PUT /subscriptions/:id
Обновление подписки (все поля опциональны).

### DELETE /subscriptions/:id
Удаление.

### PATCH /subscriptions/:id/review
Переключение флага `review_flag`.

## Дашборд

### GET /dashboard
```json
// Response 200
{
  "monthlyTotal": 7500,
  "yearlyTotal": 90000,
  "upcomingPayments": [...],
  "categoryBreakdown": { "Стриминги": 2500, "ЖКХ": 4500 },
  "totalSubscriptions": 8
}
```

## Экспорт

### GET /export/csv
Скачивание CSV-файла со всеми подписками.

### GET /export/pdf
Скачивание PDF-отчёта.

## Уведомления

### GET /notifications/upcoming
Список подписок с датой списания = завтра.

### POST /notifications/test-email
Тестовая отправка email (заглушка).
