# SMM Bot

Telegram orqali bir nechta loyiha va Instagram Professional akkauntlarini bitta joydan boshqaradigan mustaqil AI servis.

## Imkoniyatlar

- bir Telegram botda bir nechta loyiha va Instagram akkaunti;
- Instagram Direct va komment webhooklarini qabul qilish;
- OpenAI yordamida brend ohangida xavfsiz avtomatik javob;
- ishonchsiz yoki nozik xabarlarni odamga topshirish (`HANDOFF`);
- kunlik kontent g‘oyasi, ssenariy, caption va image prompt;
- OpenAI image generatsiyasi, Telegram tasdig‘i va Instagramga publish;
- Instagram OAuth, AES-256-GCM token shifrlash va retry navbatlari.

## Ishga tushirish

Talablar: Node.js 20+ va PostgreSQL. Public S3-compatible storage tavsiya qilinadi;
u sozlanmagan kichik loyihalarda rasmlar vaqtincha PostgreSQL orqali public URL'da beriladi.

```bash
npm install
copy .env.example .env
npm run db:deploy
npm run dev
```

`.env` ichida kamida `DATABASE_URL`, Telegram bot kalitlari, Meta App kalitlari, `OPENAI_API_KEY`, `SOCIAL_TOKEN_ENCRYPTION_KEY` va S3 sozlamalarini kiriting.

Token xarajatini kamaytirish uchun ikki bosqichli model routing ishlaydi:

- `AI_OPENAI_FAST_MODEL` — qisqa va oddiy DM/kommentlar (default: `gpt-5.6-luna`);
- `AI_OPENAI_SMART_MODEL` — uzun yoki tahliliy savollar va kontent rejalari (default: `gpt-5.6-terra`).

Routing alohida AI chaqiruvisiz, xabar uzunligi, suhbat konteksti va murakkablik belgilariga qarab tanlanadi.

Telegram botdan boshlash:

1. `/start`
2. `➕ Loyiha qo'shish`
3. loyiha nomi, brend faktlari va saytni kiriting
4. `🔗 Instagram ulash`
5. Meta OAuth orqali Professional akkauntga ruxsat bering
6. `/themes` bilan doimiy kontent mavzularini kiriting (masalan: arab tili grammatikasi, CEFR imtihon formati,
   kundalik iboralar, arab madaniyati)
7. `/channel @kanal` bilan Telegram kanalni ulang (bot kanalda admin bo'lishi shart)
8. `📝 Kontent yaratish` orqali draft oling va Telegramdan tasdiqlang

Tasdiqlangan kontent yoqilgan kanallarga joylanadi: Instagram (akkauntda `publishingEnabled` bo'lsa)
va Telegram kanal (`/channel` bilan ulangan bo'lsa). Ikkalasi mustaqil — faqat Telegram kanalga
joylash ham mumkin. Telegram rasm izohi 1024 belgi bilan cheklangani uchun uzun caption rasm ostiga
va davomi alohida xabarga bo'linadi.

Kontent turlari `/pillars` da ko'rinadi; `/content quiz` kabi buyruq bilan aniq turni so'rash mumkin.
Approval kartasidagi `🎲 Boshqa tur` tugmasi kontentni boshqa ustun bo'yicha qayta yaratadi.

Rasm 4:5 (1080x1350) Instagram feed formatiga keltiriladi: model 2:3 rasm qaytarsa, u markazdan
qirqib moslashtiriladi va image prompt ichida chekkalarda matn qoldirmaslik talabi beriladi.

## Webhook manzillari

- Telegram: `POST /api/social/telegram/webhook`
- Meta verify/callback: `GET /api/instagram/webhook`
- Meta events: `POST /api/instagram/webhook`
- Instagram OAuth: `GET /api/instagram/oauth/callback`
- Health: `GET /api/health`
- Privacy policy: `GET /privacy`
- Terms: `GET /terms`
- Data deletion instructions: `GET /data-deletion`

Bir kommentga bir nechta javob ketmasligi uchun uch qatlamli himoya bor: webhook'da akkauntning
o'z hodisalari (bot javoblari ham) tashlanadi, takroriy yetkazishlar 10 daqiqalik oynada filtrlanadi,
worker esa javob yuborilgach statusni qayta urinishlar bilan yozadi va bir mijozga qisqa vaqtdagi
javoblar sonini cheklaydi.

Meta webhook uchun `messages` va `comments` maydonlarini ulang. Direct va comment autojavobni real akkauntda yoqishdan oldin test akkauntda tekshiring.

## Xavfsizlik

- Instagram access tokenlari bazada ochiq saqlanmaydi.
- Telegram webhook secret header bilan tekshiriladi.
- Faqat `TELEGRAM_ADMIN_USER_IDS` dagi foydalanuvchilar botni boshqaradi.
- Webhook HMAC imzosi xom request body bo‘yicha tekshiriladi.
- Kontent uchun tasdiqlash default holatda majburiy; auto-publish alohida yoqiladi.

## Tekshiruv

```bash
npm run typecheck
npm test
npm run build
```

Arab Exam uchun dastlabki reklama va kontent namunasi `docs/arab-exam-campaign.md` da saqlangan. Servisning o‘zi hech bir brendga bog‘lanmagan.
