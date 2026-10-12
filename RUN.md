# Ishga tushirish va yangilash

Har safar qidirmaslik uchun: quyidagi buyruqlarni terminalga nusxa ko'chirib qo'ying.
Barcha buyruqlar loyiha papkasidan (`reciept-splitter`) bajariladi.

## 1. Kodni yangilash (har safar boshlashdan oldin)

```bash
git pull
```

Boshqa branchga o'tish kerak bo'lsa:

```bash
git fetch
git checkout BRANCH_NOMI
git pull
```

## 2. Backend (1-terminal)

```bash
cd splitter-backend
npm install
npx prisma migrate deploy
npm run dev
```

- `npm install`: yangi paketlarni o'rnatadi (Prisma client ham yangilanadi).
- `npx prisma migrate deploy`: bazaga yangi migratsiyalarni qo'llaydi.
- `npm run dev`: serverni ishga tushiradi (kod o'zgarsa o'zi qayta ishga tushadi). Konsolda `LAN: http://192.168.x.x:3001` chiqadi.

## 3. Frontend (2-terminal)

```bash
cd splitter-frontend
npm install
npx expo start -c
```

- `-c`: keshni tozalaydi (yangilangandan keyin eski kod qolib ketmasligi uchun).
- Telefonda Expo Go orqali QR kodni skanerlang. Kompyuter va telefon bir xil Wi-Fi tarmog'ida bo'lishi kerak.

## Hammasi bitta qatorda

Ikki terminalda ishlatish uchun:

```bash
# 1-terminal: backend
git pull && cd splitter-backend && npm install && npx prisma migrate deploy && npm run dev
```

```bash
# 2-terminal: frontend
cd splitter-frontend && npm install && npx expo start -c
```

## Faqat birinchi marta

```bash
# backend sozlamalari
cd splitter-backend
cp .env.example .env
# .env ichida DATABASE_URL va JWT_SECRET ni to'ldiring

# frontend sozlamalari (ixtiyoriy)
cd ../splitter-frontend
cp .env.example .env
```

PostgreSQL Docker orqali ishlasa, `splitter-backend` papkasida:

```bash
docker compose up -d postgres
```

## Tekshirish (ixtiyoriy)

```bash
cd splitter-frontend && npm run typecheck && npm test
cd splitter-backend && npm test
```

## Muammo bo'lsa

- **Port band (3001):** oldingi backend hali ishlayapti. Uning terminalini yoping yoki `Ctrl + C` bosing.
- **Telefon backendga ulanmayapti:** telefon brauzerida `http://192.168.x.x:3001/health` ni oching (IP backend konsolida chiqadi).
- **G'alati xatolar yangilangandan keyin:** `npx expo start -c` (kesh tozalanadi).
