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
    label: "📚 Ilmiy yozish darsi",
    goal: "Ilmiy ish muallifiga maqola, dissertatsiya yoki o'quv qo'llanmaning bitta qismini to'g'ri yozishni o'rgatish.",
    scriptGuide: "Bitta qismni tanlang: mavzu dolzarbligi, maqsad va vazifalar, ilmiy yangilik, annotatsiya, adabiyotlar tahlili, xulosa yoki tavsiyalar. Qanday yozilishini 3 qadamda tushuntiring va bitta qisqa namuna jumla bering (namuna ekanini ayting, haqiqiy manbaga o'xshatmang).",
    captionGuide: "Qismning nima uchun muhimligini ayting va o'quvchidan o'z ishidagi shu qismni tekshirib ko'rishni so'rang.",
    imageStyle: "Akademik editorial infografika: yuqorida qism nomi, o'rtada 3 ta raqamlangan qadam, pastda bitta namuna jumla.",
    promotional: false,
  },
  {
    key: "vocabulary",
    label: "📖 Ilmiy atama",
    goal: "Ilmiy ish va attestatsiyada uchraydigan atamalarni (ixtisoslik shifri, ISSN, UDK, impakt-faktor, Scopus, ORCID, h-indeks) sodda tushuntirish.",
    scriptGuide: "Bitta atamani tanlang: u nima, qayerda kerak bo'ladi, qanday tekshiriladi. 3-4 qisqa jumla va bitta amaliy maslahat. Faktlarni faqat tasdiqlangan ma'lumot asosida bering.",
    captionGuide: "Atamani bir jumlada takrorlang va izohda boshqa tushunarsiz atamalarni so'rang.",
    imageStyle: "Lug'at kartasi: yirik atama, ostida bir jumlali ta'rif va bitta misol.",
    promotional: false,
  },
  {
    key: "fact",
    label: "💡 Bilasizmi",
    goal: "Ilmiy nashr, attestatsiya yoki dissertatsiya jarayoniga oid kam ma'lum, lekin foydali faktni ulashish.",
    scriptGuide: "Bitta faktni kuchli jumlada bering va uning muallif uchun amaliy oqibatini 2-3 jumlada tushuntiring. Manbasi noaniq raqam, qaror yoki talabni ishlatmang.",
    captionGuide: "Faktni takrorlang va odamlardan shunga duch kelganmi, so'rang.",
    imageStyle: "Bitta kuchli jumlali poster: markazda katta shriftdagi fakt, atrofida sokin fon.",
    promotional: false,
  },
  {
    key: "mistake",
    label: "⚠️ Ko'p uchraydigan xato",
    goal: "Maqola, dissertatsiya yoki o'quv qo'llanma mualliflari qiladigan tipik xatoni ko'rsatib, to'g'ri variantini berish.",
    scriptGuide: "«Odatda → To'g'risi» ko'rinishida 2-3 juftlik bering: annotatsiya, iqtibos, formatlash, mavzu tanlash yoki jurnal tanlashdagi xato. Farqni bir jumlada izohlang.",
    captionGuide: "Xatoni qisqa takrorlang va «siz ham shunday qilganmisiz?» tarzida savol bering.",
    imageStyle: "Tahrir kartasi: chapda ustidan chizilgan noto'g'ri variant, o'ngda to'g'ri variant, katta o'qiladigan shrift.",
    promotional: false,
  },
  {
    key: "exam",
    label: "📋 Talab va mezon",
    goal: "OAK jurnali, attestatsiya, o'quv adabiyoti ekspertizasi yoki himoya uchun qo'yiladigan talablarni aniq ko'rsatish.",
    scriptGuide: "Bitta jarayonni tanlang va 3-5 ta aniq talabni sanang. Faqat tasdiqlangan faktlardan foydalaning; rasmiy talab noma'lum bo'lsa uydirmang, «jurnal yoki muassasa talabini tekshiring» deb yozing.",
    captionGuide: "Talablarni qisqa cheklistga aylantiring va saqlab qo'yishni taklif qiling.",
    imageStyle: "Tartibli checklist posteri: sarlavha va 3-5 ta belgili qator. Har qator 3-6 so'zdan oshmasin.",
    promotional: false,
  },
  {
    key: "quiz",
    label: "❓ Mini test",
    goal: "Ilmiy yozish yoki nashr qoidalari bo'yicha bilimni tekshiradigan savol berish.",
    scriptGuide: "Bitta amaliy savol va mantiqli A/B/C variantlarini bering (masalan: annotatsiya hajmi, iqtibos uslubi, jurnalni tekshirish tartibi). To'g'ri javobni ssenariy oxirida qisqa izoh bilan ayting.",
    captionGuide: "Savolni takrorlang, izohda javob yozishga chaqiring va to'g'ri javob ertaga e'lon qilinishini ayting.",
    imageStyle: "Test kartasi: yuqorida savol, pastida A, B, C variantlari alohida qatorlarda. Javob ko'rsatilmasin.",
    promotional: false,
  },
  {
    key: "method",
    label: "🧠 Ish uslubi",
    goal: "Ilmiy ishni tezroq va sifatliroq yozishga yordam beradigan amaliy usulni ulashish.",
    scriptGuide: "Bitta usulni tushuntiring: adabiyotlar jadvali, reja-skelet, kunlik 300 so'z, manbalarni boshqarish (Zotero), ilmiy rahbar bilan uchrashuvga tayyorlanish. 3 aniq qadam bering.",
    captionGuide: "Usulni qisqa bayon qiling va bugun sinab ko'rishga taklif qiling.",
    imageStyle: "Uch qadamli sxema posteri: 1-2-3 raqamlangan qisqa qadamlar.",
    promotional: false,
  },
  {
    key: "faq",
    label: "💬 Savol-javob",
    goal: "Maqola nashri, dissertatsiya, BMI, o'quv qo'llanma yoki antiplagiat haqida tez-tez beriladigan savolga aniq javob berish.",
    scriptGuide: "Savolni aynan keltiring va unga halol, aniq javob bering. Natija yoki nashrni kafolatlamang.",
    captionGuide: "Javobni qisqartirib takrorlang va boshqa savollarni izohda kutayotganingizni ayting.",
    imageStyle: "Savol-javob kartasi: yuqorida qo'shtirnoqdagi savol, pastida qisqa javob jumlasi.",
    promotional: false,
  },
  {
    key: "roadmap",
    label: "🗺 Bosqichlar",
    goal: "Maqola nashri, dissertatsiya himoyasi yoki o'quv qo'llanma ekspertizasi yo'lini bosqichma-bosqich ko'rsatish.",
    scriptGuide: "4 bosqich bering (masalan: mavzu va reja → yozish → tekshiruv va antiplagiat → yuborish yoki ekspertiza). Har bir ish va muassasada muddat farq qilishini ayting; uydirma muddat yoki kafolat yo'q.",
    captionGuide: "Bosqichlarni sanang va odamdan hozir qaysi bosqichda ekanini so'rang.",
    imageStyle: "Vertikal timeline posteri: 4 ta bosqich nuqtasi, har birida qisqa sarlavha.",
    promotional: false,
  },
  {
    key: "promo",
    label: "📣 Xizmat taklifi",
    goal: "Xizmatning aniq foydasini ko'rsatib, bitta aniq harakatga chaqirish.",
    scriptGuide: "Auditoriya muammosini ayting, xizmat uni qanday hal qilishini tasdiqlangan faktlar asosida tushuntiring va bitta CTA bering. Narx faqat faktlardagi «...dan» ko'rinishida.",
    captionGuide: "Foydani qisqa sanang va bitta aniq CTA (havola yoki DM) qoldiring.",
    imageStyle: "Premium editorial poster: kuchli sarlavha, bitta foyda jumlasi va aniq CTA.",
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
