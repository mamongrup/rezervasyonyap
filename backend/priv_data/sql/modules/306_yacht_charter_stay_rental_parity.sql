-- Yat kiralama: tatil evi ile aynı konaklama çekirdeği (tema, kurallar, iCal, tip kataloğu, SSS).

ALTER TABLE listing_yacht_details
  ADD COLUMN IF NOT EXISTS theme_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rule_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ical_managed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE product_categories
SET is_active = TRUE,
    allows_manual_source = TRUE,
    allows_api_source = TRUE
WHERE code = 'yacht_charter';

INSERT INTO site_settings (id, organization_id, key, value_json)
VALUES (
  gen_random_uuid(),
  NULL,
  'catalog.yacht_charter_property_types',
  $json${
    "v": 2,
    "items": [
      {
        "slug": "gulet",
        "labels": {
          "tr": "Gulet",
          "en": "Gulet",
          "de": "Gulet",
          "ru": "Гулет",
          "zh": "古莱特船",
          "fr": "Goélette"
        }
      },
      {
        "slug": "motor_yat",
        "labels": {
          "tr": "Motor Yat",
          "en": "Motor yacht",
          "de": "Motoryacht",
          "ru": "Моторная яхта",
          "zh": "机动游艇",
          "fr": "Yacht à moteur"
        }
      },
      {
        "slug": "katamaran",
        "labels": {
          "tr": "Katamaran",
          "en": "Catamaran",
          "de": "Katamaran",
          "ru": "Катамаран",
          "zh": "双体船",
          "fr": "Catamaran"
        }
      },
      {
        "slug": "yelkenli",
        "labels": {
          "tr": "Yelkenli",
          "en": "Sailing yacht",
          "de": "Segelyacht",
          "ru": "Парусная яхта",
          "zh": "帆船",
          "fr": "Voilier"
        }
      },
      {
        "slug": "bareboat",
        "labels": {
          "tr": "Bareboat",
          "en": "Bareboat charter",
          "de": "Bareboat",
          "ru": "Барбот",
          "zh": "裸船租赁",
          "fr": "Location sans équipage"
        }
      }
    ]
  }$json$::jsonb
)
ON CONFLICT (key) WHERE organization_id IS NULL
DO UPDATE SET value_json = EXCLUDED.value_json;

INSERT INTO site_settings (id, organization_id, key, value_json)
SELECT gen_random_uuid(),
       NULL,
       'catalog.yacht_charter_default_faq',
       $faq${
  "items": [
    {
      "id": "faq_yc_01",
      "question": {"tr": "Kaptan ve mürettebat dahil mi?"},
      "answer": {"tr": "Her ilanda kaptan, mürettebat ve hizmet kapsamı ayrı belirtilir. Bareboat kiralamada genelde kaptan dahil değildir; mavi tur ve gulet paketlerinde çoğunlukla dahildir."}
    },
    {
      "id": "faq_yc_02",
      "question": {"tr": "Yakıt ve liman masrafları kime ait?"},
      "answer": {"tr": "Yakıt, transit log, liman ve marina ücretleri ilan veya sözleşmede yazan modele göre değişir. Rezervasyon öncesi dahil/hariç kalemlerini kontrol edin."}
    },
    {
      "id": "faq_yc_03",
      "question": {"tr": "Minimum kiralama süresi nedir?"},
      "answer": {"tr": "Minimum charter süresi tekne tipine ve sezona göre değişir; çoğu ilanda haftalık (7 gece) veya günlük minimum geçerlidir. İlan detayında minimum gece bilgisi yer alır."}
    },
    {
      "id": "faq_yc_04",
      "question": {"tr": "İptal ve hava koşulları nasıl işler?"},
      "answer": {"tr": "İptal koşulları ilan bazında tanımlanır. Fırtına veya liman yasağı gibi mücbir hallerde rota veya tarih değişikliği operatör politikasına göre değerlendirilir."}
    },
    {
      "id": "faq_yc_05",
      "question": {"tr": "Biniş ve iniş limanı / saati nasıl belirlenir?"},
      "answer": {"tr": "Kalkış ve dönüş limanı ilan sayfasında gösterilir. Check-in ve check-out saatleri tekne hazırlığına göre operatörle teyit edilir; erken biniş talep üzerine mümkün olabilir."}
    }
  ]
}$faq$::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings
  WHERE organization_id IS NULL AND key = 'catalog.yacht_charter_default_faq'
);
