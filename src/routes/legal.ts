import { Router } from "express";

export const legalRoutes = Router();

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Arab Exam SMM</title>
  <style>
    :root{color-scheme:light;font-family:Inter,system-ui,-apple-system,sans-serif;color:#172033;background:#f6f8fc}
    body{margin:0}.wrap{max-width:820px;margin:0 auto;padding:48px 24px 72px}
    article{background:#fff;border:1px solid #e4e9f2;border-radius:20px;padding:32px;box-shadow:0 12px 40px #1c31520d}
    h1{font-size:clamp(30px,5vw,46px);margin:0 0 8px;color:#0b376b}h2{margin-top:30px;color:#164f8c}
    p,li{line-height:1.7}a{color:#075db7}.muted{color:#637083}.links{display:flex;gap:16px;flex-wrap:wrap;margin-top:32px}
  </style>
</head>
<body><main class="wrap"><article><h1>${title}</h1><p class="muted">Oxirgi yangilanish: 13-avgust, 2026</p>${body}
<nav class="links"><a href="/privacy">Maxfiylik siyosati</a><a href="/terms">Foydalanish shartlari</a><a href="/data-deletion">Ma'lumotlarni o'chirish</a><a href="https://arabexam.uz">Arab Exam</a></nav>
</article></main></body></html>`;
}

legalRoutes.get("/privacy", (_req, res) => {
  res.type("html").send(page("Maxfiylik siyosati", `
<p>Ushbu siyosat Arab Exam'ning Instagram yordamchisi va Telegram boshqaruv servisida ma'lumotlar qanday ishlatilishini tushuntiradi.</p>
<h2>Yig'iladigan ma'lumotlar</h2>
<ul><li>ulangan Instagram Professional akkaunt IDsi, nomi va OAuth ruxsati;</li><li>botga yuborilgan Direct xabarlar va kommentlar hamda ularga berilgan javoblar;</li><li>xizmat ishlashi va xatolarni aniqlash uchun zarur texnik vaqt va holat ma'lumotlari.</li></ul>
<h2>Foydalanish maqsadi</h2>
<p>Ma'lumotlar faqat Instagram xabar va kommentlariga javob berish, tasdiqlangan kontentni joylash, Telegram orqali boshqarish, xavfsizlik va xizmat barqarorligini ta'minlash uchun ishlatiladi. Ma'lumotlar sotilmaydi.</p>
<h2>Saqlash va himoya</h2>
<p>OAuth tokenlari shifrlangan holda saqlanadi. Xabar hodisalari odatda 90 kungacha saqlanadi, qonun yoki xavfsizlik talabi bo'lmasa muddat tugagach o'chiriladi. Tashqi xizmatlar sifatida Meta, OpenAI, Railway va ma'lumotlar ombori provayderlari ishlatilishi mumkin.</p>
<h2>Foydalanuvchi huquqlari</h2>
<p>Ulanishni Instagram sozlamalaridan bekor qilish yoki <a href="/data-deletion">o'chirish yo'riqnomasi</a> orqali ma'lumotlarni o'chirishni so'rash mumkin. Savollar uchun <a href="https://arabexam.uz">Arab Exam sayti</a> orqali bog'laning.</p>`));
});

legalRoutes.get("/terms", (_req, res) => {
  res.type("html").send(page("Foydalanish shartlari", `
<p>Servis Arab Exam Instagram akkauntidagi xabarlar, kommentlar va kontentni boshqarishga yordam beradi.</p>
<h2>Ruxsat etilgan foydalanish</h2>
<p>Servisdan qonuniy, Meta platforma qoidalariga mos va foydalanuvchilarga zarar yetkazmaydigan maqsadlarda foydalanish kerak. Spam, aldov, maxfiy ma'lumotlarni talab qilish va ruxsatsiz avtomatlashtirish taqiqlanadi.</p>
<h2>AI javoblari</h2>
<p>AI javoblari ma'lumot beruvchi yordam sifatida taqdim etiladi va xato qilishi mumkin. To'lov, akkaunt muammosi, shikoyat yoki boshqa nozik masalalar inson operatoriga yo'naltiriladi.</p>
<h2>Xizmat holati</h2>
<p>Meta yoki boshqa provayderlardagi uzilishlar sabab xizmat vaqtincha ishlamasligi mumkin. Shartlar servis rivojlanishi bilan yangilanishi mumkin.</p>`));
});

legalRoutes.get("/data-deletion", (_req, res) => {
  res.type("html").send(page("Ma'lumotlarni o'chirish", `
<p>Instagram akkauntingizga tegishli SMM bot ma'lumotlarini o'chirish uchun:</p>
<ol><li>Instagram sozlamalarida <strong>Apps and Websites</strong> bo'limidan SMM Control Center ulanishini bekor qiling; yoki</li><li><a href="https://arabexam.uz">Arab Exam sayti</a> orqali Instagram username va o'chirish so'rovini yuboring.</li></ol>
<p>So'rov tekshirilgach, ulangan akkaunt tokeni va unga bog'liq bot ma'lumotlari o'chiriladi. Qonuniy yoki xavfsizlik majburiyati bo'lmasa, jarayon 30 kun ichida yakunlanadi.</p>`));
});
