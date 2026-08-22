-- Otel yurtiçi/yurtdışı filtresi: listing_hotel_details.country_id (countries FK).
-- Semantik: country_id IS NULL => yurtiçi (TR) sayılır (bkz. collections_http.gleam hotel_scope filtresi).
-- Bu yüzden mevcut Türkiye-odaklı sağlayıcılar (wtatil, albatros, akasia, gezinomi, baransen,
-- tatilsepeti, akdenizvillam, airbnb, bravo_event) için backfill gerekmiyor.
ALTER TABLE listing_hotel_details ADD COLUMN IF NOT EXISTS country_id smallint REFERENCES countries(id);

CREATE INDEX IF NOT EXISTS idx_listing_hotel_details_country ON listing_hotel_details(country_id);

-- countries tablosunda yalnızca Türkiye vardı; Travelrobot/KPlus çok-ülkeli otel kataloğu
-- için "yurtdışı" oteller gerçek bir country_id'ye çözülebilsin diye ISO-3166-1 listesi eklenir.
-- Mevcut TR satırı id=1 ile elle eklenmişti (sequence nextval hiç ilerlememiş); INSERT
-- çakışmasını önlemek için sequence'i mevcut max(id)'ye senkronize et.
SELECT setval('countries_id_seq', COALESCE((SELECT max(id) FROM countries), 1));

INSERT INTO countries (iso2, name) VALUES
  ('AD', 'Andorra'), ('AE', 'Birlesik Arap Emirlikleri'), ('AF', 'Afganistan'),
  ('AG', 'Antigua ve Barbuda'), ('AI', 'Anguilla'), ('AL', 'Arnavutluk'),
  ('AM', 'Ermenistan'), ('AO', 'Angola'), ('AQ', 'Antarktika'), ('AR', 'Arjantin'),
  ('AS', 'Amerikan Samoasi'), ('AT', 'Avusturya'), ('AU', 'Avustralya'), ('AW', 'Aruba'),
  ('AX', 'Aland Adalari'), ('AZ', 'Azerbaycan'), ('BA', 'Bosna Hersek'), ('BB', 'Barbados'),
  ('BD', 'Banglades'), ('BE', 'Belcika'), ('BF', 'Burkina Faso'), ('BG', 'Bulgaristan'),
  ('BH', 'Bahreyn'), ('BI', 'Burundi'), ('BJ', 'Benin'), ('BL', 'Saint Barthelemy'),
  ('BM', 'Bermuda'), ('BN', 'Brunei'), ('BO', 'Bolivya'),
  ('BQ', 'Bonaire, Sint Eustatius ve Saba'), ('BR', 'Brezilya'), ('BS', 'Bahamalar'),
  ('BT', 'Bhutan'), ('BV', 'Bouvet Adasi'), ('BW', 'Botsvana'), ('BY', 'Belarus'),
  ('BZ', 'Belize'), ('CA', 'Kanada'), ('CC', 'Cocos (Keeling) Adalari'),
  ('CD', 'Kongo Demokratik Cumhuriyeti'), ('CF', 'Orta Afrika Cumhuriyeti'), ('CG', 'Kongo'),
  ('CH', 'Isvicre'), ('CI', 'Fildisi Sahili'), ('CK', 'Cook Adalari'), ('CL', 'Sili'),
  ('CM', 'Kamerun'), ('CN', 'Cin'), ('CO', 'Kolombiya'), ('CR', 'Kosta Rika'), ('CU', 'Kuba'),
  ('CV', 'Cabo Verde'), ('CW', 'Curacao'), ('CX', 'Christmas Adasi'), ('CY', 'Kibris'),
  ('CZ', 'Cekya'), ('DE', 'Almanya'), ('DJ', 'Cibuti'), ('DK', 'Danimarka'),
  ('DM', 'Dominika'), ('DO', 'Dominik Cumhuriyeti'), ('DZ', 'Cezayir'), ('EC', 'Ekvador'),
  ('EE', 'Estonya'), ('EG', 'Misir'), ('EH', 'Bati Sahra'), ('ER', 'Eritre'),
  ('ES', 'Ispanya'), ('ET', 'Etiyopya'), ('FI', 'Finlandiya'), ('FJ', 'Fiji'),
  ('FK', 'Falkland Adalari'), ('FM', 'Mikronezya'), ('FO', 'Faroe Adalari'), ('FR', 'Fransa'),
  ('GA', 'Gabon'), ('GB', 'Birlesik Krallik'), ('GD', 'Grenada'), ('GE', 'Gurcistan'),
  ('GF', 'Fransiz Guyanasi'), ('GG', 'Guernsey'), ('GH', 'Gana'), ('GI', 'Cebelitarik'),
  ('GL', 'Gronland'), ('GM', 'Gambiya'), ('GN', 'Gine'), ('GP', 'Guadeloupe'),
  ('GQ', 'Ekvator Ginesi'), ('GR', 'Yunanistan'),
  ('GS', 'Guney Georgia ve Guney Sandwich Adalari'), ('GT', 'Guatemala'), ('GU', 'Guam'),
  ('GW', 'Gine-Bissau'), ('GY', 'Guyana'), ('HK', 'Hong Kong'),
  ('HM', 'Heard Adasi ve McDonald Adalari'), ('HN', 'Honduras'), ('HR', 'Hirvatistan'),
  ('HT', 'Haiti'), ('HU', 'Macaristan'), ('ID', 'Endonezya'), ('IE', 'Irlanda'),
  ('IL', 'Israil'), ('IM', 'Man Adasi'), ('IN', 'Hindistan'),
  ('IO', 'Britanya Hint Okyanusu Topraklari'), ('IQ', 'Irak'), ('IR', 'Iran'),
  ('IS', 'Izlanda'), ('IT', 'Italya'), ('JE', 'Jersey'), ('JM', 'Jamaika'), ('JO', 'Urdun'),
  ('JP', 'Japonya'), ('KE', 'Kenya'), ('KG', 'Kirgizistan'), ('KH', 'Kamboçya'),
  ('KI', 'Kiribati'), ('KM', 'Komorlar'), ('KN', 'Saint Kitts ve Nevis'), ('KP', 'Kuzey Kore'),
  ('KR', 'Guney Kore'), ('KW', 'Kuveyt'), ('KY', 'Cayman Adalari'), ('KZ', 'Kazakistan'),
  ('LA', 'Laos'), ('LB', 'Lubnan'), ('LC', 'Saint Lucia'), ('LI', 'Lihtenstayn'),
  ('LK', 'Sri Lanka'), ('LR', 'Liberya'), ('LS', 'Lesotho'), ('LT', 'Litvanya'),
  ('LU', 'Luksemburg'), ('LV', 'Letonya'), ('LY', 'Libya'), ('MA', 'Fas'), ('MC', 'Monako'),
  ('MD', 'Moldova'), ('ME', 'Karadag'), ('MF', 'Saint Martin'), ('MG', 'Madagaskar'),
  ('MH', 'Marshall Adalari'), ('MK', 'Kuzey Makedonya'), ('ML', 'Mali'), ('MM', 'Myanmar'),
  ('MN', 'Mogolistan'), ('MO', 'Makao'), ('MP', 'Kuzey Mariana Adalari'), ('MQ', 'Martinik'),
  ('MR', 'Moritanya'), ('MS', 'Montserrat'), ('MT', 'Malta'), ('MU', 'Mauritius'),
  ('MV', 'Maldivler'), ('MW', 'Malavi'), ('MX', 'Meksika'), ('MY', 'Malezya'),
  ('MZ', 'Mozambik'), ('NA', 'Namibya'), ('NC', 'Yeni Kaledonya'), ('NE', 'Nijer'),
  ('NF', 'Norfolk Adasi'), ('NG', 'Nijerya'), ('NI', 'Nikaragua'), ('NL', 'Hollanda'),
  ('NO', 'Norvec'), ('NP', 'Nepal'), ('NR', 'Nauru'), ('NU', 'Niue'), ('NZ', 'Yeni Zelanda'),
  ('OM', 'Umman'), ('PA', 'Panama'), ('PE', 'Peru'), ('PF', 'Fransiz Polinezyasi'),
  ('PG', 'Papua Yeni Gine'), ('PH', 'Filipinler'), ('PK', 'Pakistan'), ('PL', 'Polonya'),
  ('PM', 'Saint Pierre ve Miquelon'), ('PN', 'Pitcairn Adalari'), ('PR', 'Porto Riko'),
  ('PS', 'Filistin'), ('PT', 'Portekiz'), ('PW', 'Palau'), ('PY', 'Paraguay'), ('QA', 'Katar'),
  ('RE', 'Reunion'), ('RO', 'Romanya'), ('RS', 'Sirbistan'), ('RU', 'Rusya'),
  ('RW', 'Ruanda'), ('SA', 'Suudi Arabistan'), ('SB', 'Solomon Adalari'), ('SC', 'Seyseller'),
  ('SD', 'Sudan'), ('SE', 'Isvec'), ('SG', 'Singapur'), ('SH', 'Saint Helena'),
  ('SI', 'Slovenya'), ('SJ', 'Svalbard ve Jan Mayen'), ('SK', 'Slovakya'),
  ('SL', 'Sierra Leone'), ('SM', 'San Marino'), ('SN', 'Senegal'), ('SO', 'Somali'),
  ('SR', 'Surinam'), ('SS', 'Guney Sudan'), ('ST', 'Sao Tome ve Principe'),
  ('SV', 'El Salvador'), ('SX', 'Sint Maarten'), ('SY', 'Suriye'), ('SZ', 'Esvatini'),
  ('TC', 'Turks ve Caicos Adalari'), ('TD', 'Cad'), ('TF', 'Fransiz Guney Topraklari'),
  ('TG', 'Togo'), ('TH', 'Tayland'), ('TJ', 'Tacikistan'), ('TK', 'Tokelau'),
  ('TL', 'Dogu Timor'), ('TM', 'Turkmenistan'), ('TN', 'Tunus'), ('TO', 'Tonga'),
  ('TT', 'Trinidad ve Tobago'), ('TV', 'Tuvalu'), ('TW', 'Tayvan'), ('TZ', 'Tanzanya'),
  ('UA', 'Ukrayna'), ('UG', 'Uganda'), ('UM', 'ABD Kucuk Dis Adalari'),
  ('US', 'Amerika Birlesik Devletleri'), ('UY', 'Uruguay'), ('UZ', 'Ozbekistan'),
  ('VA', 'Vatikan'), ('VC', 'Saint Vincent ve Grenadinler'), ('VE', 'Venezuela'),
  ('VG', 'Britanya Virjin Adalari'), ('VI', 'ABD Virjin Adalari'), ('VN', 'Vietnam'),
  ('VU', 'Vanuatu'), ('WF', 'Wallis ve Futuna'), ('WS', 'Samoa'), ('YE', 'Yemen'),
  ('YT', 'Mayotte'), ('ZA', 'Guney Afrika'), ('ZM', 'Zambiya'), ('ZW', 'Zimbabve')
ON CONFLICT (iso2) DO NOTHING;
