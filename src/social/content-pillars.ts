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
    label: "📚 Mini dars",
    goal: "Auditoriya bugun darhol qo'llay oladigan bitta aniq qoida yoki namunani o'rgatish.",
    scriptGuide: "Bitta qoida yoki jumla qolipini tushuntiring va 2-3 ta qisqa misol bering. Nazariyani cho'zmang.",
    captionGuide: "Qoidani qisqa takrorlang, yana 1-2 misol bering va izohda o'z misolini yozishga taklif qiling.",
    imageStyle: "Toza o'quv kartochkasi: yuqorida mavzu sarlavhasi, o'rtada katta harflardagi asosiy qoida yoki jumla, pastda bitta qisqa misol.",
    promotional: false,
  },
  {
    key: "vocabulary",
    label: "🔤 So'z boyligi",
    goal: "3-5 ta foydali so'z yoki iborani talaffuzi va ma'nosi bilan berish.",
    scriptGuide: "Har bir so'z uchun: asl yozuv, talaffuz, tarjima va bitta juda qisqa jumla.",
    captionGuide: "So'zlar ro'yxatini takrorlang va qaysi biri yangi bo'lganini so'rang.",
    imageStyle: "So'zlar kartochkasi: 3-4 qatorli ro'yxat, har qatorda katta asl so'z va pastida kichikroq tarjima. Ortiqcha bezaksiz.",
    promotional: false,
  },
  {
    key: "fact",
    label: "💡 Qiziqarli fakt",
    goal: "Mavzuga oid kutilmagan, esda qoladigan va tekshirilgan fakt aytish.",
    scriptGuide: "Faktni bitta kuchli jumlada bering, keyin 2-3 jumlada nima uchun qiziqligini tushuntiring. Manbasi noaniq raqamlarni ishlatmang.",
    captionGuide: "Faktni takrorlang va odamlardan shunga o'xshash misol so'rang.",
    imageStyle: "Bitta kuchli iqtibos uslubidagi poster: markazda katta shriftdagi fakt jumlasi, atrofida sokin fon.",
    promotional: false,
  },
  {
    key: "mistake",
    label: "⚠️ Ko'p uchraydigan xato",
    goal: "Boshlovchilar qiladigan tipik xatoni ko'rsatib, to'g'ri variantni o'rgatish.",
    scriptGuide: "«Noto'g'ri → To'g'ri» ko'rinishida 2-3 juftlik bering va nega xato ekanini bir jumlada ayting.",
    captionGuide: "Xatoni qisqa takrorlang va «siz ham shunday yozganmisiz?» tarzida savol bering.",
    imageStyle: "Ikki ustunli taqqoslash kartasi: chapda qizil belgili noto'g'ri variant, o'ngda yashil belgili to'g'ri variant, katta o'qiladigan shrift.",
    promotional: false,
  },
  {
    key: "exam",
    label: "🎯 Imtihon maslahati",
    goal: "Imtihon formati yoki baholash mezoni bo'yicha amaliy maslahat berish.",
    scriptGuide: "Imtihonning bitta qismini tushuntiring va unga tayyorlanishning 2-3 aniq qadamini bering. Faqat tasdiqlangan faktlarga tayaning.",
    captionGuide: "Maslahatni umumlashtiring va qaysi qism qiyinroq ekanini so'rang.",
    imageStyle: "Tartibli checklist posteri: sarlavha va 3 ta belgili qator. Har qator 3-6 so'zdan oshmasin.",
    promotional: false,
  },
  {
    key: "quiz",
    label: "❓ Mini test",
    goal: "Auditoriyani izohda javob yozishga undaydigan bitta savol berish.",
    scriptGuide: "Bitta savol va A/B/C variantlarini bering. To'g'ri javobni ssenariy oxirida ayting.",
    captionGuide: "Savolni takrorlang, izohda javob yozishga chaqiring va to'g'ri javob ertaga e'lon qilinishini ayting.",
    imageStyle: "Test kartasi: yuqorida savol, pastida A, B, C variantlari alohida qatorlarda. Javob ko'rsatilmasin.",
    promotional: false,
  },
  {
    key: "method",
    label: "🧠 O'rganish metodikasi",
    goal: "Kunlik amaliyot yoki eslab qolish texnikasini ulashish.",
    scriptGuide: "Bitta texnikani tushuntiring va uni 10-15 daqiqalik kunlik rejimga qanday joylashni ko'rsating.",
    captionGuide: "Texnikani qisqa bayon qiling va bugun sinab ko'rishga taklif qiling.",
    imageStyle: "Uch qadamli sxema posteri: 1-2-3 raqamlangan qisqa qadamlar, sodda ikonalar.",
    promotional: false,
  },
  {
    key: "faq",
    label: "💬 Savol-javob",
    goal: "Auditoriyadan tez-tez keladigan haqiqiy savolga aniq javob berish.",
    scriptGuide: "Savolni aynan keltiring va unga halol, aniq javob bering. Kafolat bermang.",
    captionGuide: "Javobni qisqartirib takrorlang va boshqa savollarni izohda kutayotganingizni ayting.",
    imageStyle: "Savol-javob kartasi: yuqorida qo'shtirnoqdagi savol, pastida qisqa javob jumlasi.",
    promotional: false,
  },
  {
    key: "roadmap",
    label: "🗺 Yo'l xaritasi",
    goal: "Maqsadga borish bosqichlarini real muddatlar bilan ko'rsatish.",
    scriptGuide: "Bosqichlarni ketma-ket bering va har biriga real vaqt ayting. Uydirma natija va kafolat yo'q.",
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
export const PROMO_EVERY = 6;

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
