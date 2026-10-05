# Карта развития проекта Receipt Splitter Backend

## Текущий статус: реализованы авторизация, друзья, группы, сессии, OCR (Gemini) и история

Фактически выполнено сверх изначального плана: друзья (`/friends`), группы (`/groups`),
сессии со сканированием чека через Gemini и финализацией (`/sessions`), история сессий
(`SessionHistoryEntry`), загрузка аватаров в R2 (`/uploads`). Разделы «Неделя 3–5» ниже
сохранены как исходный план; их пункты в основном выполнены.

### Выполненные этапы:

#### ✅ Неделя 1: Основы

- [x] Настроен проект и структура папок (TypeScript + Express + ESM)
- [x] Подключена база данных PostgreSQL через Prisma ORM
- [x] Созданы основные таблицы (User)
- [x] Создан простой endpoint GET /health для проверки работоспособности
- [x] Настроен CORS с кэшированием preflight запросов на 24 часа

#### ✅ Неделя 2: Авторизация

- [x] Endpoint регистрации с шифрованием паролей (/auth/register)
- [x] Endpoint входа (/auth/login)
- [x] JWT токены с 7-дневным сроком действия
- [x] Middleware для проверки токена
- [x] Endpoint для получения информации о текущем пользователе (/auth/me)
- [x] Документация API через Swagger UI (/api-docs)
- [x] Валидация данных и надежная обработка ошибок

### Следующие этапы:

#### ✅ Неделя 3: Друзья (Выполнено)

- [x] Получение списка друзей
- [x] Поиск по uniqueId
- [x] Отправка запроса в друзья
- [x] Принятие/отклонение запросов

#### ✅ Неделя 4: Сессии и группы (Выполнено)

- [x] CRUD для групп
- [x] Создание сессии
- [x] Добавление участников
- [x] Сохранение товаров

#### ✅ Неделя 5: OCR и расчеты (Выполнено)

- [x] Прием изображений
- [x] Интеграция с OCR API
- [x] Логика распределения
- [x] Расчет долгов

#### 🔄 Неделя 6: Деплой и документация (Частично выполнено)

- [x] Настройка Swagger
- [ ] Деплой на Render.com
- [ ] Финальное тестирование
- [ ] Передача URL фронтенду

## Качество выполненных этапов

### Авторизация (высокое качество)

- ✅ Безопасность: пароли хешируются с bcrypt
- ✅ Валидация входных данных с понятными сообщениями об ошибках
- ✅ Нормализация email (trim, toLowerCase)
- ✅ Проверка формата email и минимальной длины пароля
- ✅ Правильные HTTP коды состояния (200, 400, 401, 409, 415, 500)
- ✅ JWT токены с разумным сроком действия (7 дней)
- ✅ Обработка различных типов входных данных (мягкая коррекция типов)
- ✅ Документация API через Swagger UI

### CORS (высокое качество)

- ✅ Настроена поддержка разных режимов (development/production)
- ✅ Кэширование preflight запросов на 24 часа
- ✅ Гибкое управление через переменные окружения
- ✅ Подробная документация по настройке и отладке

### Prisma (хорошее качество)

- ✅ Правильная интеграция с базой данных
- ✅ Базовая модель User
- ✅ Реализованы модели Friendship, Group, GroupMember, Session, SessionParticipant, ReceiptItem, ItemAssignment

### Документация (хорошее качество)

- ✅ Swagger UI для API
- ✅ README.md с основной информацией
- ✅ Документация по CORS
- ✅ Roadmap.md (в процессе)
- ❓ Не хватает примеров использования API для фронтенд-разработчиков

## Рекомендации по дальнейшей работе

1. **Расширить схему базы данных**:

   - [x] Добавить модели Friendship, Group, GroupMember, Session, etc. в schema.prisma
   - [x] Создать и применить миграции (`prisma/migrations`)

2. **Добавить эндпоинты для работы с друзьями**:

   - GET /friends (список)
   - POST /friends/request (отправить запрос)
   - PATCH /friends/accept (принять запрос)
   - PATCH /friends/reject (отклонить запрос)

3. **Улучшить безопасность**:

   - Добавить rate limiting для авторизации
   - Настроить более точные ограничения CORS для production
   - Добавить проверку сложности пароля

4. **Подготовиться к деплою**:

   - Настроить скрипты для production build
   - Создать документацию по деплою на Render.com
   - Подготовить переменные окружения для production

5. **Расширить тестирование**:
   - [x] Unit-тесты для расчёта долей (`npm test`, `tests/money.test.ts`)
   - Добавить unit-тесты для остальных функций
   - Создать интеграционные тесты для API
   - Настроить автоматическое тестирование
     🛠 Настройка окружения
     Вариант 1: Node.js + Express (если знаешь JavaScript)

# Установи Node.js с официального сайта

# Затем создай папку проекта

mkdir receipt-splitter-backend
cd receipt-splitter-backend

# Инициализируй проект

npm init -y

# Установи нужные библиотеки

npm install express # фреймворк для сервера
npm install cors # разрешает запросы от фронтенда
npm install dotenv # для секретных ключей
npm install bcrypt # для шифрования паролей
npm install jsonwebtoken # для токенов авторизации
npm install pg # для работы с PostgreSQL
npm install multer # для загрузки изображений
npm install nodemon --save-dev # автоперезапуск при изменениях
Вариант 2: Python + FastAPI (если знаешь Python)

# Установи Python 3.8+

# Создай виртуальное окружение

python -m venv venv
source venv/bin/activate # на Windows: venv\Scripts\activate

# Установи библиотеки

pip install fastapi # фреймворк
pip install uvicorn # сервер
pip install python-jose # для JWT токенов
pip install passlib # для паролей
pip install bcrypt # шифрование
pip install sqlalchemy # для базы данных
pip install psycopg2-binary # для PostgreSQL
pip install python-multipart # для файлов
📁 Структура проекта
receipt-splitter-backend/
├── src/
│ ├── routes/ # Маршруты (endpoints)
│ │ ├── auth.js # Регистрация, вход
│ │ ├── friends.js # Работа с друзьями
│ │ ├── groups.js # Группы
│ │ └── sessions.js # Сессии
│ ├── controllers/ # Логика обработки
│ ├── models/ # Модели данных
│ ├── middleware/ # Проверка токенов
│ └── utils/ # Вспомогательные функции
├── .env # Секретные ключи (НЕ ЗАГРУЖАТЬ В GIT!)
├── .gitignore # Что не загружать в git
├── package.json # Зависимости (для Node.js)
└── server.js # Главный файл
🗄 База данных (PostgreSQL)
Шаг 1: Установи PostgreSQL
Windows/Mac: скачай с postgresql.org
Или используй облачную БД бесплатно: ElephantSQL
Шаг 2: Создай таблицы
-- Таблица пользователей
CREATE TABLE users (
id SERIAL PRIMARY KEY,
email VARCHAR(255) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL, -- Зашифрованный!
username VARCHAR(100) NOT NULL,
unique_id VARCHAR(20) UNIQUE NOT NULL, -- Например: USER#1234
created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица дружбы
CREATE TABLE friendships (
id SERIAL PRIMARY KEY,
requester_id INTEGER REFERENCES users(id),
receiver_id INTEGER REFERENCES users(id),
status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица групп
CREATE TABLE groups (
id SERIAL PRIMARY KEY,
name VARCHAR(100) NOT NULL,
owner_id INTEGER REFERENCES users(id),
created_at TIMESTAMP DEFAULT NOW()
);

-- Участники групп
CREATE TABLE group_members (
group_id INTEGER REFERENCES groups(id),
user_id INTEGER REFERENCES users(id),
PRIMARY KEY (group_id, user_id)
);

-- Таблица сессий
CREATE TABLE sessions (
id SERIAL PRIMARY KEY,
creator_id INTEGER REFERENCES users(id),
receipt_image_url TEXT,
service_fee DECIMAL(10, 2) DEFAULT 0,
total DECIMAL(10, 2) DEFAULT 0,
status VARCHAR(20) DEFAULT 'active',
created_at TIMESTAMP DEFAULT NOW()
);

-- Участники сессий
CREATE TABLE session_participants (
session_id INTEGER REFERENCES sessions(id),
user_id INTEGER REFERENCES users(id),
amount_owed DECIMAL(10, 2) DEFAULT 0,
PRIMARY KEY (session_id, user_id)
);

-- Товары в чеке
CREATE TABLE receipt_items (
id SERIAL PRIMARY KEY,
session_id INTEGER REFERENCES sessions(id),
name VARCHAR(255) NOT NULL,
price DECIMAL(10, 2) NOT NULL
);

-- Кому принадлежит товар
CREATE TABLE item_assignments (
item_id INTEGER REFERENCES receipt_items(id),
user_id INTEGER REFERENCES users(id),
PRIMARY KEY (item_id, user_id)
);
🔐 Безопасность - ОЧЕНЬ ВАЖНО!
Никогда не делай так:
// ❌ ПЛОХО - пароль в открытом виде
const user = {
email: "user@mail.com",
password: "123456" // НИКОГДА ТАК НЕ ДЕЛАЙ!
};
Делай так:
// ✅ ХОРОШО - пароль зашифрован
const bcrypt = require('bcrypt');

// При регистрации
const hashedPassword = await bcrypt.hash(password, 10);
// Сохраняем hashedPassword в базу

// При входе
const isValidPassword = await bcrypt.compare(password, hashedPassword);
📡 API Endpoints - что нужно создать

1.  Авторизация
    // POST /auth/register - Регистрация
    app.post('/auth/register', async (req, res) => {
    const { email, password, username } = req.body;
    // 1. Проверь что email не занят
    // 2. Зашифруй пароль
    // 3. Сгенерируй unique_id (например USER#1234)
    // 4. Сохрани в базу
    // 5. Создай JWT токен
    // 6. Верни токен и данные пользователя

        res.json({
            token: "jwt_token_here",
            user: {
                id: 1,
                email: "user@mail.com",
                username: "Вася",
                uniqueId: "USER#1234"
            }
        });

    });

// POST /auth/login - Вход
app.post('/auth/login', async (req, res) => {
const { email, password } = req.body;

    // 1. Найди пользователя по email
    // 2. Проверь пароль
    // 3. Создай JWT токен
    // 4. Верни токен

}); 2. Работа с друзьями
// GET /friends - Список друзей
app.get('/friends', authenticateToken, async (req, res) => {
// authenticateToken - это middleware который проверяет токен
const userId = req.user.id;

    // Получи из базы всех друзей этого пользователя
    res.json([
        { id: 2, username: "Петя", uniqueId: "USER#5678" },
        { id: 3, username: "Маша", uniqueId: "USER#9012" }
    ]);

});

// POST /friends/request - Отправить запрос
app.post('/friends/request', authenticateToken, async (req, res) => {
const { uniqueId } = req.body; // ID друга

    // 1. Найди пользователя по uniqueId
    // 2. Создай запись в friendships со status='pending'
    // 3. Верни успех

}); 3. Middleware для проверки токена
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
// Получаем токен из заголовка
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Нет токена' });
    }

    // Проверяем токен
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }

        req.user = user;  // Сохраняем данные пользователя
        next();  // Продолжаем обработку запроса
    });

}
🚀 Деплой - как выложить сервер в интернет
Почему нужен деплой?
Чтобы мобильное приложение могло работать на любом телефоне
Чтобы учитель мог проверить в любое время
Чтобы все данные сохранялись
Куда деплоить (бесплатные варианты):

1. Render.com (РЕКОМЕНДУЮ)

# 1. Зарегистрируйся на render.com

# 2. Подключи GitHub репозиторий

# 3. Выбери "Web Service"

# 4. Настрой:

# - Build Command: npm install

# - Start Command: node server.js

# 5. Добавь переменные окружения (из .env)

# 6. Деплой автоматический при push в GitHub!

2. Railway.app
   Похоже на Render
   $5 бесплатных кредитов
   PostgreSQL база включена
3. Heroku (если есть студенческая лицензия)
   Бесплатно для студентов
   Нужна кредитная карта
   После деплоя получишь URL типа:
   https://your-app.onrender.com
   Этот URL нужно дать фронтенд-разработчику!
   📝 Документация API (Swagger)
   Для Node.js:
   // Установи
   npm install swagger-ui-express swagger-jsdoc

// Добавь в server.js
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
definition: {
openapi: '3.0.0',
info: {
title: 'Receipt Splitter API',
version: '1.0.0',
},
},
apis: ['./src/routes/*.js'], // Путь к файлам с endpoints
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Теперь документация доступна по адресу: http://localhost:3000/api-docs
Для Python FastAPI:

# Swagger уже встроен!

# Просто запусти сервер и открой:

# http://localhost:8000/docs

🧪 Тестирование API
Используй Postman:
Скачай Postman (бесплатно)
Создай коллекцию "Receipt Splitter"
Добавь запросы для каждого endpoint
Тестируй перед передачей фронтенду
Пример тестирования в Postman:
POST http://localhost:3000/auth/register
Headers: Content-Type: application/json
Body:
{
"email": "test@mail.com",
"password": "123456",
"username": "Test User"
}
📋 План работы по неделям
Неделя 1: Основы
[ ] Настрой проект и структуру папок
[ ] Подключи базу данных
[ ] Создай таблицы
[ ] Сделай простой endpoint GET /health
Неделя 2: Авторизация
[ ] Endpoint регистрации с шифрованием паролей
[ ] Endpoint входа
[ ] JWT токены
[ ] Middleware для проверки токена
Неделя 3: Друзья
[ ] Получение списка друзей
[ ] Поиск по unique_id
[ ] Отправка запроса в друзья
[ ] Принятие/отклонение запросов
Неделя 4: Сессии и группы
[ ] CRUD для групп
[ ] Создание сессии
[ ] Добавление участников
[ ] Сохранение товаров
Неделя 5: OCR и расчеты
[ ] Прием изображений
[ ] Интеграция с OCR (Google Vision API)
[ ] Логика распределения
[ ] Расчет долгов
Неделя 6: Деплой и документация
[ ] Деплой на Render.com
[ ] Настройка Swagger
[ ] Финальное тестирование
[ ] Передача URL фронтенду
⚠️ Частые ошибки новичков

1. CORS ошибки
   // Добавь это в начало server.js
   const cors = require('cors');
   app.use(cors());
2. Забыл async/await
   // ❌ Плохо
   app.get('/users', (req, res) => {
   const users = db.query('SELECT \* FROM users'); // Не будет работать!
   });

// ✅ Хорошо
app.get('/users', async (req, res) => {
const users = await db.query('SELECT \* FROM users');
}); 3. Секреты в коде
// ❌ НИКОГДА не пиши секреты прямо в коде
const JWT_SECRET = "my-secret-key";

// ✅ Используй .env файл
const JWT_SECRET = process.env.JWT_SECRET;
🔧 Переменные окружения (.env файл)

# .env

PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/receipt_splitter
JWT_SECRET=your-super-secret-key-change-this
ВАЖНО: Добавь .env в .gitignore!
💡 Полезные ресурсы
Для изучения:
Express.js Tutorial
FastAPI Tutorial
JWT объяснение
PostgreSQL Crash Course
Инструменты:
Postman - тестирование API
TablePlus - просмотр базы данных
Render.com - деплой
🤝 Работа с командой
Что нужно дать фронтенду:
URL развернутого сервера
Список всех endpoints
Формат запросов и ответов
Токен для тестирования
Пример документации для фронтенда:

## Регистрация

POST https://your-app.onrender.com/auth/register

Request:
{
"email": "user@mail.com",
"password": "123456",
"username": "Вася"
}

Response:
{
"token": "eyJhbGc...",
"user": {
"id": 1,
"uniqueId": "USER#1234"
}
}

Твои первые шаги:
Выбери язык (Node.js или Python)
Создай проект и установи библиотеки
Настрой базу данных (локально или ElephantSQL)
Создай первый endpoint: GET /health
Покажи команде что сервер работает
Продолжай по плану неделя за неделей
Помни: Лучше простой работающий бэкенд, чем сложный но сломанный!
