-- Tatil evi tipi seçenekleri: villa, apart, daire, bungalov (6 dil etiket).

INSERT INTO site_settings (id, organization_id, key, value_json)
VALUES (
  gen_random_uuid(),
  NULL,
  'catalog.holiday_home_property_types',
  $json${
    "v": 2,
    "items": [
      {
        "slug": "villa",
        "labels": {
          "tr": "Villa",
          "en": "Villa",
          "de": "Villa",
          "ru": "Вилла",
          "zh": "别墅",
          "fr": "Villa"
        }
      },
      {
        "slug": "apart",
        "labels": {
          "tr": "Apart",
          "en": "Apart hotel",
          "de": "Apart",
          "ru": "Апарт",
          "zh": "公寓酒店",
          "fr": "Apart"
        }
      },
      {
        "slug": "daire",
        "labels": {
          "tr": "Daire",
          "en": "Apartment",
          "de": "Wohnung",
          "ru": "Квартира",
          "zh": "公寓",
          "fr": "Appartement"
        }
      },
      {
        "slug": "bungalov",
        "labels": {
          "tr": "Bungalov",
          "en": "Bungalow",
          "de": "Bungalow",
          "ru": "Бунгало",
          "zh": "平房",
          "fr": "Bungalow"
        }
      }
    ]
  }$json$::jsonb
)
ON CONFLICT (key) WHERE organization_id IS NULL
DO UPDATE SET value_json = EXCLUDED.value_json;
