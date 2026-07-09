### 1. Клонировать и запустить БД
```bash
git clone git@github.com:fygyzzz/SubTrack.git
cd SubTrack
docker compose up -d
```
### 2. Запустить бэкенд
```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```
### 3. Запустить фронтенд (в новом терминале)
```bash
cd frontend
npm install
npm run dev
Открыть http://localhost:5173.
```

### Тестовый аккаунт
- Email: test@test.ru
- Пароль: test123
