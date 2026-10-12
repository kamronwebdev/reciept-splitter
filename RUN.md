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

Ikki terminalda ishlatish uchun. Ikkalasi ham loyiha papkasidan (`reciept-splitter`) boshlanadi.

1-terminal, backend:

```bash
git pull && cd splitter-backend && npm install && npx prisma migrate deploy && npm run dev
```

2-terminal, frontend:

```bash
cd splitter-frontend && npm install && npx expo start -c
```

Kod bloklarini aynan shu holicha nusxa ko'chiring. Mac terminali (zsh) `#` bilan boshlanadigan izohni buyruqning bir qismi deb o'qiydi va xato beradi.

## Faqat birinchi marta

Backend sozlamalari:

```bash
cd splitter-backend
cp .env.example .env
```

Keyin `.env` ichida `DATABASE_URL` va `JWT_SECRET` ni to'ldiring.

Frontend sozlamalari (ixtiyoriy), loyiha papkasidan:

```bash
cd splitter-frontend
cp .env.example .env
```

PostgreSQL Docker orqali ishlasa, `splitter-backend` papkasida:

```bash
docker compose up -d postgres
```

## Tekshirish (ixtiyoriy)

Loyiha papkasidan:

```bash
cd splitter-frontend && npm run typecheck && npm test && cd ..
cd splitter-backend && npm test && cd ..
```

## Muammo bo'lsa

- **`cd: no such file or directory: splitter-backend`:** siz allaqachon `splitter-backend` ichidasiz. `cd ..` qiling yoki `cd` qatorini o'tkazib yuboring.
- **`zsh: number expected` yoki `zsh: no matches found`:** buyruq bilan birga `#` izoh ham nusxa ko'chirilgan. Faqat buyruqning o'zini qo'ying.

- **Port band (3001):** oldingi backend hali ishlayapti. Uning terminalini yoping yoki `Ctrl + C` bosing.
- **Telefon backendga ulanmayapti:** telefon brauzerida `http://192.168.x.x:3001/health` ni oching (IP backend konsolida chiqadi).
- **G'alati xatolar yangilangandan keyin:** `npx expo start -c` (kesh tozalanadi).
