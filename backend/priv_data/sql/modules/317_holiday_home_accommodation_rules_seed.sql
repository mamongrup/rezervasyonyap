-- Tatil evi konaklama kuralları şablonu (Bravo import + panel seçimi ile uyumlu sabit id'ler)
-- Giriş/çıkış saati burada tanımlanmaz — vitrin listing_meta.check_in/out ile gösterilir.

INSERT INTO category_accommodation_rule_sets (organization_id, category_code, rules_json, updated_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'holiday_home',
  '[
    {"id":"hh-rule-child-friendly","severity":"ok","labels":{"tr":"Çocuklara uygun","en":"Child-friendly","de":"Kinderfreundlich","ru":"Подходит для детей","zh":"适合儿童","fr":"Adapté aux enfants"}},
    {"id":"hh-rule-no-pets","severity":"warn","labels":{"tr":"Evcil hayvan kabul edilmez","en":"Pets not allowed","de":"Haustiere nicht erlaubt","ru":"Домашние животные не допускаются","zh":"不允许携带宠物","fr":"Animaux non acceptés"}},
    {"id":"hh-rule-pets-allowed","severity":"ok","labels":{"tr":"Evcil hayvan kabul edilir","en":"Pets allowed","de":"Haustiere erlaubt","ru":"Домашние животные допускаются","zh":"允许携带宠物","fr":"Animaux acceptés"}},
    {"id":"hh-rule-events-allowed","severity":"ok","labels":{"tr":"Etkinliklere uygun","en":"Suitable for events","de":"Für Veranstaltungen geeignet","ru":"Подходит для мероприятий","zh":"适合举办活动","fr":"Convient aux événements"}},
    {"id":"hh-rule-no-smoking","severity":"warn","labels":{"tr":"İç mekanda sigara içilmez","en":"No smoking indoors","de":"Rauchen innen verboten","ru":"Курение в помещении запрещено","zh":"室内禁止吸烟","fr":"Interdiction de fumer à l''intérieur"}},
    {"id":"hh-rule-no-parties","severity":"warn","labels":{"tr":"Parti ve etkinlik düzenlenemez","en":"No parties or events","de":"Keine Partys oder Veranstaltungen","ru":"Вечеринки и мероприятия запрещены","zh":"禁止聚会或活动","fr":"Pas de fêtes ni d''événements"}}
  ]'::jsonb,
  now()
)
ON CONFLICT (organization_id, category_code) DO UPDATE SET
  rules_json = CASE
    WHEN coalesce(jsonb_array_length(category_accommodation_rule_sets.rules_json), 0) = 0
      THEN EXCLUDED.rules_json
    ELSE category_accommodation_rule_sets.rules_json
  END,
  updated_at = now();
