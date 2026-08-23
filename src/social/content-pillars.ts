export type ContentPillar = {
  key: string;
  label: string;
  goal: string;
  scriptGuide: string;
  captionGuide: string;
  imageStyle: string;
  promotional: boolean;
};

/**
 * Kontent ustunlari (content pillars). Har kungi post shu ro'yxatdan navbat bilan tanlanadi,
 * shuning uchun lenta faqat reklamadan iborat bo'lib qolmaydi: darslar, faktlar, testlar,
 * xatolar tahlili va h.k. aralashib turadi. Reklama alohida ustun va u kamdan-kam chiqadi.
 */
export const CONTENT_PILLARS: ContentPillar[] = [
  {
    key: "lesson",
    label: "📚 B2 mini dars",
    goal: "B2 o'quvchiga murakkab gap tuzish, uslub yoki grammatik noziklik bo'yicha darhol qo'llanadigan bilim berish.",
    scriptGuide: "B2 darajadagi bitta mavzuni tanlang: bog'lovchilar, shart/maqsad/sabab ifodasi, ismiy-fe'liy gap nozikligi, masdar, sifatdosh yoki rasmiy-uslubiy qolip. Qoidani ixcham tushuntirib, 2-3 kontekstli misol va bitta transformatsiya bering.",
    captionGuide: "Qoidaning imtihon yoki real muloqotdagi foydasini ayting va o'quvchidan murakkabroq o'z misolini yozishni so'rang.",
    imageStyle: "B2 o'quv infografikasi: yuqorida aniq mavzu, o'rtada formula yoki taqqoslash, pastda bitta kontekstli arabcha misol. Maktabgacha uslub yoki bolalarcha ikonalar yo'q.",
    promotional: false,
  },
  {
    key: "vocabulary",
    label: "🔤 B2 lug'at va kollokatsiya",
    goal: "CEFR B2 matn va nutqda kerak bo'ladigan akademik so'zlar, kollokatsiyalar va sinonimik ifodalarni o'rgatish.",
    scriptGuide: "4-5 ta o'zaro bog'liq B2 birlik bering: arabcha so'z/ibora, aniq o'zbekcha ma'no, odatiy kollokatsiya yoki sinonim va tabiiy kontekstli gap. Alohida juda sodda so'zlar ro'yxatini bermang.",
    captionGuide: "Birliklarning writing/speakingdagi vazifasini ko'rsating va bittasi bilan B2 darajadagi gap tuzishni so'rang.",
    imageStyle: "Zamonaviy B2 lug'at infografikasi: 3-4 kollokatsiya yoki bog'lovchi, arabcha birlik yirik, o'zbekcha ma'no ixcham. Professional editorial dizayn.",
    promotional: false,
  },
  {
    key: "fact",
    label: "💡 Qiziqarli fakt",
    goal: "B2 o'quvchiga arab tili registri, matn tuzilishi yoki ma'no nozikligiga oid tekshirilgan insight berish.",
    scriptGuide: "Bitta til hodisasini kuchli jumlada bering, keyin uning formal/norasmiy nutq, reading yoki writingdagi ta'sirini 2-3 jumlada misol bilan tushuntiring. Manbasi noaniq raqamlarni ishlatmang.",
    captionGuide: "Faktni takrorlang va odamlardan shunga o'xshash misol so'rang.",
    imageStyle: "Bitta kuchli iqtibos uslubidagi poster: markazda katta shriftdagi fakt jumlasi, atrofida sokin fon.",
    promotional: false,
  },
  {
    key: "mistake",
    label: "⚠️ Ko'p uchraydigan xato",
    goal: "B1-B2 o'quvchilar writing yoki speakingda qiladigan tipik xatoni ko'rsatib, B2 variantini o'rgatish.",
    scriptGuide: "«Oddiy/xato → B2 va to'g'riroq» ko'rinishida 2-3 juftlik bering; registr, bog'lovchi, moslashuv yoki so'z birikmasidagi farqni bir jumlada izohlang.",
    captionGuide: "Xatoni qisqa takrorlang va «siz ham shunday yozganmisiz?» tarzida savol bering.",
    imageStyle: "Ikki ustunli taqqoslash kartasi: chapda qizil belgili noto'g'ri variant, o'ngda yashil belgili to'g'ri variant, katta o'qiladigan shrift.",
    promotional: false,
  },
  {
    key: "exam",
    label: "🎯 Imtihon maslahati",
    goal: "CEFR B2 imtihonining reading, listening, writing, speaking yoki grammar qismi uchun amaliy kalit berish.",
    scriptGuide: "Bitta B2 ko'nikmasini tanlang va vaqt boshqaruvi, savolni tahlil qilish, kalit so'z/parafrazni topish, javobni tuzish yoki o'zini tekshirish bo'yicha 3 aniq qadam bering. Rasmiy format noma'lum bo'lsa uydirmang; universal CEFR ko'nikma strategiyasini bering.",
    captionGuide: "Maslahatni qisqa cheklistga aylantiring va qaysi B2 ko'nikmasi qiyinligini so'rang.",
    imageStyle: "Tartibli checklist posteri: sarlavha va 3 ta belgili qator. Har qator 3-6 so'zdan oshmasin.",
    promotional: false,
  },
  {
    key: "quiz",
    label: "❓ Mini test",
    goal: "B2 darajadagi kontekst, parafraz, bog'lovchi yoki grammatik noziklikni tekshiradigan savol berish.",
    scriptGuide: "B2 darajadagi bitta kontekstli savol va chalg'ituvchi, lekin mantiqli A/B/C variantlarini bering. To'g'ri javobni ssenariy oxirida qisqa izoh bilan ayting.",
    captionGuide: "Savolni takrorlang, izohda javob yozishga chaqiring va to'g'ri javob ertaga e'lon qilinishini ayting.",
    imageStyle: "Test kartasi: yuqorida savol, pastida A, B, C variantlari alohida qatorlarda. Javob ko'rsatilmasin.",
    promotional: false,
  },
  {
    key: "method",
    label: "🧠 O'rganish metodikasi",
    goal: "B1 dan B2 ga chiqish uchun reading, listening, writing yoki speakingni chuqurlashtiradigan texnika ulashish.",
    scriptGuide: "Bitta texnikani tushuntiring: shadowing, active recall, paraphrase bank, error log, timed reading yoki speaking recording. Uni 15-25 daqiqalik rejimda 3 aniq qadam bilan ko'rsating.",
    captionGuide: "Texnikani qisqa bayon qiling va bugun sinab ko'rishga taklif qiling.",
    imageStyle: "Uch qadamli sxema posteri: 1-2-3 raqamlangan qisqa qadamlar, sodda ikonalar.",
    promotional: false,
  },
  {
    key: "faq",
    label: "💬 Savol-javob",
    goal: "B2 daraja, CEFR ko'nikmalari, imtihon tayyorgarligi yoki diagnostika haqida tez-tez keladigan savolga aniq javob berish.",
    scriptGuide: "Savolni aynan keltiring va unga halol, aniq javob bering. Kafolat bermang.",
    captionGuide: "Javobni qisqartirib takrorlang va boshqa savollarni izohda kutayotganingizni ayting.",
    imageStyle: "Savol-javob kartasi: yuqorida qo'shtirnoqdagi savol, pastida qisqa javob jumlasi.",
    promotional: false,
  },
  {
    key: "roadmap",
    label: "🗺 Yo'l xaritasi",
    goal: "B1 dan B2 ga yoki B2 imtihon tayyorgarligiga borish bosqichlarini ko'rsatish.",
    scriptGuide: "Ko'nikma diagnostikasi → zaif joy ustida mashq → timed practice → tahlil kabi 4 bosqich bering. Individual tezlik farq qilishini ayting; uydirma muddat, natija va kafolat yo'q.",
    captionGuide: "Bosqichlarni sanang va odamdan hozir qaysi bosqichda ekanini so'rang.",
    imageStyle: "Vertikal timeline posteri: 3-4 ta bosqich nuqtasi, har birida qisqa sarlavha.",
    promotional: false,
  },
  {
    key: "promo",
    label: "📣 Xizmat taklifi",
    goal: "Xizmatning aniq foydasini ko'rsatib, bitta aniq harakatga chaqirish.",
    scriptGuide: "Auditoriya muammosini ayting, xizmat uni qanday hal qilishini tasdiqlangan faktlar asosida tushuntiring va bitta CTA bering.",
    captionGuide: "Foydani qisqa sanang va bitta aniq CTA (havola yoki DM) qoldiring.",
    imageStyle: "Premium marketing posteri: kuchli sarlavha, bitta foyda jumlasi va aniq CTA tugma ko'rinishi.",
    promotional: true,
  },
];

const PILLARS_BY_KEY = new Map(CONTENT_PILLARS.map((pillar) => [pillar.key, pillar]));

/** Reklama posti har necha kontentda ko'pi bilan bir marta chiqishi. */
export const PROMO_EVERY = 8;

export function findPillar(key?: string | null): ContentPillar | undefined {
  return key ? PILLARS_BY_KEY.get(key.trim().toLowerCase()) : undefined;
}

export function pillarLabel(key?: string | null): string {
  return findPillar(key)?.label ?? key ?? "—";
}

/**
 * Oxirgi kontentlar ro'yxatiga (yangisidan eskisiga) qarab keyingi ustunni tanlaydi:
 * eng uzoq vaqt ishlatilmagani olinadi, reklama esa faqat PROMO_EVERY oralig'ida bir marta.
 */
export function selectPillar(recentPillarKeys: Array<string | null>, override?: string | null): ContentPillar {
  const forced = findPillar(override);
  if (forced) return forced;

  const recent = recentPillarKeys.map((key) => key ?? "");
  const promoWindow = recent.slice(0, PROMO_EVERY - 1);
  const promoDue = recent.length >= PROMO_EVERY - 1 && !promoWindow.includes("promo");
  if (promoDue) return PILLARS_BY_KEY.get("promo")!;

  const candidates = CONTENT_PILLARS.filter((pillar) => !pillar.promotional);
  let best = candidates[0];
  let bestDistance = -1;
  for (const pillar of candidates) {
    const lastUsed = recent.indexOf(pillar.key);
    const distance = lastUsed === -1 ? Number.POSITIVE_INFINITY : lastUsed;
    if (distance > bestDistance) {
      best = pillar;
      bestDistance = distance;
    }
  }
  return best;
}
