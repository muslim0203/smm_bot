-- Arab Exam loyihasi yopildi: ilmiyxizmat Instagram akkaunti ulangan loyiha Ilmiy Xizmat'ga o'tkaziladi.
-- Nishon: username'i ilmiyxizmat bo'lgan akkauntning loyihasi; bunday akkaunt bo'lmasa va bazada bitta loyiha bo'lsa — o'sha.
CREATE TEMP TABLE _target AS
SELECT DISTINCT a.project_id AS id FROM instagram_accounts a WHERE lower(a.username) = 'ilmiyxizmat';

INSERT INTO _target (id)
SELECT p.id FROM social_projects p
WHERE NOT EXISTS (SELECT 1 FROM _target) AND (SELECT count(*) FROM social_projects) = 1;

UPDATE social_projects SET
  name = 'Ilmiy Xizmat',
  website_url = 'https://ilmiyxizmat.uz',
  brand_voice = $f$Samimiy, aniq va professional; ilmiy muharrir ohangi. Faqat o'zbek tili, lotin yozuvi. Kafolat va uydirma raqam yo'q.$f$,
  brand_facts = $f$Ilmiy Xizmat (ilmiyxizmat.uz, Instagram @ilmiyxizmat) — ilmiy ishlar bo'yicha yordam platformasi.
Auditoriya: OTM o'qituvchilari (attestatsiya va o'quv adabiyoti), magistrantlar, bakalavr bitiruvchilari, doktorantlar.
Xizmatlar va boshlang'ich narxlar ("...dan", 2026-10-12 holatiga):
- Ilmiy maqola yozish — 100 000 so'mdan
- OAK jurnalga chiqarish — 350 000 so'mdan
- Konferensiyaga chiqarish — 100 000 so'mdan
- Annotatsiya yozish — 50 000 so'mdan
- Antiplagiat tekshirish — 50 000 so'mdan
- Tahrir va korrektura — 100 000 so'mdan
- APA-7 yoki GOST formatlash — 150 000 so'mdan
- Ilmiy ish yozish — 200 000 so'mdan
- Kurs ishi — 300 000 so'mdan
- BMI (bitiruv malakaviy ishi) — 800 000 so'mdan
- Magistrlik dissertatsiyasi — 2 000 000 so'mdan
- O'quv qo'llanma — 2 500 000 so'mdan; darslik — 2 500 000 so'mdan
- Monografiya — 3 000 000 so'mdan
- Doktorlik dissertatsiyasi bo'yicha yordam — 5 000 000 so'mdan
Aniq narx ish hajmi va muddatga qarab belgilanadi. Shoshilinch buyurtma 24 soatdan boshlab.
Bepul tuzatishlar va qayta ishlash. Bo'lib to'lash imkoniyati bor.
Aloqa: Telegram @zarifjon0203, telefon +998 97 007 33 96, info@ilmiyxizmat.uz.
Narxlar: https://ilmiyxizmat.uz/narxlar · Buyurtma: https://ilmiyxizmat.uz/buyurtma$f$,
  content_themes = $f$OAK jurnaliga maqola, annotatsiya va kalit so'zlar, iqtibos va GOST/APA formatlash, antiplagiat, BMI va magistrlik dissertatsiyasi, o'quv qo'llanma va darslik ekspertizasi, monografiya, OTM o'qituvchilari attestatsiyasi$f$,
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM _target);

UPDATE social_projects SET key = 'ilmiyxizmat'
WHERE id IN (SELECT id FROM _target)
  AND NOT EXISTS (SELECT 1 FROM social_projects WHERE key = 'ilmiyxizmat');

-- carousel-03 lid magniti: izohda MAQOLA yozganlarga tekshiruv ro'yxati DM'da.
INSERT INTO instagram_keyword_triggers (id, project_id, keyword, dm_text, comment_reply, is_active, created_at, updated_at)
SELECT 'kw' || substr(md5(random()::text || t.id), 1, 23), t.id, 'MAQOLA',
  $f$Salom! Mana va'da qilingan ro‘yxat 👇

OAK jurnaliga yuborishdan oldin 10 ta tekshiruv

Jurnal:
1. Ixtisoslik shifringizni ilmiy rahbar bilan aniqlang.
2. Jurnal AMALDAGI OAK ro‘yxatida bormi?
3. Aynan sizning shifringiz bo‘yicha kiritilganmi?
4. Nomi va ISSN ro‘yxatdagi bilan birma-bir mosmi?
5. Chop etilish sanasi jurnal ro‘yxatda bo‘lgan davrga to‘g‘ri keladimi?

Maqola:
6. F.I.O, ish joyi, lavozim va ORCID to‘g‘ri yozilganmi?
7. Annotatsiya o‘zbek, rus va ingliz tilida, 200–250 so‘z: mohiyat, maqsad, xulosa.
8. Kalit so‘zlar bor.
9. Originallik kamida 75% (antiplagiat).
10. Iqtiboslar odatda GOST bo‘yicha, so‘nggi 5 yil adabiyoti tavsiya etiladi.

UDK, hajm va tuzilma har jurnalda har xil — jurnal talablarini alohida o‘qing.

Jurnal tanlash yoki maqolani tekshirishda yordam kerak bo‘lsa, shu yerga yozing. ilmiyxizmat.uz$f$,
  $f$Ro‘yxatni DM'ga yubordim, xabarlarni tekshiring ✅$f$,
  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM _target t
ON CONFLICT (project_id, keyword) DO NOTHING;

DROP TABLE _target;
