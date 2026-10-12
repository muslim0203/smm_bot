/**
 * Kommentdagi kalit so'zni aniqlash. Odamlar bir so'zni har xil yozadi:
 * "MAQOLA", "maqola!", "Мақола", "maqola 🙏" — barchasi bitta trigger bo'lishi kerak.
 */

// O'zbek kirill → lotin. Tutuq va o'/g' belgilari normalizatsiyada baribir olib tashlanadi.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ў: "o", ф: "f", х: "x", ҳ: "h", ц: "s", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Kichik harf, lotin yozuvi, faqat harf va raqam. */
export function normalizeKeyword(value: string): string {
  return [...value.toLowerCase()]
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

/** Matnni so'zlarga bo'lib, har birini normalizatsiya qiladi. */
function normalizedTokens(message: string): string[] {
  return message
    .split(/[\s,.;:!?()"«»\-—–/\\]+/u)
    .map(normalizeKeyword)
    .filter(Boolean);
}

/**
 * Kommentda trigger so'zi alohida so'z sifatida bo'lsa, o'sha triggerni qaytaradi.
 * "maqolalar" yoki "maqolam" mos kelmaydi: bu oddiy savol bo'lishi mumkin, AI javob beradi.
 */
export function matchKeywordTrigger<T extends { keyword: string }>(message: string, triggers: T[]): T | undefined {
  const tokens = new Set(normalizedTokens(message));
  return triggers.find((trigger) => tokens.has(normalizeKeyword(trigger.keyword)));
}
