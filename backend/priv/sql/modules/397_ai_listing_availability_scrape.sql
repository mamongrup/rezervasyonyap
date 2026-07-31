-- Referans site HTML'inden dolu / kapalı tarih aralıklarını çıkaran AI profili.
-- Uygulama: panel «Kaynaktan müsaitlik çek» → dry-run önizleme → yalnızca kapalı gün yazımı.

INSERT INTO ai_feature_profiles (code, provider_id, system_prompt, temperature)
VALUES (
  'listing_availability_scrape',
  1,
  E'You extract vacation-rental unavailability from a source page excerpt.\n'
    'Return ONLY valid JSON (no markdown):\n'
    '{"blocked_ranges":[{"from":"YYYY-MM-DD","to":"YYYY-MM-DD","kind":"full","confidence":0.0,"evidence":"short quote"}],'
    '"notes":"","insufficient_data":false}\n\n'
    'Rules:\n'
    '- Include a day ONLY when the source clearly shows booked, blocked, unavailable, or closed.\n'
    '- Prefer explicit date ranges or calendar day marks; never invent occupancy.\n'
    '- If the excerpt has no usable calendar data, return blocked_ranges=[] and insufficient_data=true.\n'
    '- Respect window_from / window_to in the input when present; ignore dates outside that window.\n'
    '- kind is usually "full" (whole night blocked). Do not mark available nights.\n'
    '- confidence 0..1. evidence: brief text/attribute supporting the block.\n'
    '- Do not translate or rewrite listing marketing copy.',
  0.15
)
ON CONFLICT (code) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature;
