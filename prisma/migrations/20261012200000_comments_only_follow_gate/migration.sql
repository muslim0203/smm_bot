-- @ilmiyxizmat: bot faqat kommentlarga javob beradi, oddiy DM'larga egasi o'zi yozadi.
-- Kalit so'z (MAQOLA) DM'lari bundan mustaqil ishlaydi.
UPDATE instagram_accounts SET dm_replies_enabled = false, updated_at = CURRENT_TIMESTAMP
WHERE project_id IN (SELECT id FROM social_projects WHERE key = 'ilmiyxizmat');

-- Endi obuna bo'lmaganlarga ro'yxat o'rniga obuna so'rovi ketadi: ochiq javob ikkalasiga ham to'g'ri bo'lsin.
UPDATE instagram_keyword_triggers SET comment_reply = $f$DM'ga yozdim, xabarlarni tekshiring ✅$f$, updated_at = CURRENT_TIMESTAMP
WHERE keyword = 'MAQOLA' AND comment_reply = $f$Ro‘yxatni DM'ga yubordim, xabarlarni tekshiring ✅$f$;
