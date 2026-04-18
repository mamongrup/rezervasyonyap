-- MODÜL: Emsal sözleşme çevirileri backfill (en, de, ru, fr, zh)
-- Önkoşul: 232_seed_sample_category_contracts.sql (eski sürüm yalnızca tr eklediyse bu dosyayı bir kez çalıştırın)
-- Idempotent: (contract_id, locale_id) zaten varsa eklemez. Güncel 232 tüm dilleri ekliyorsa ek satır üretmez.
-- NOT: category_contracts INSERT yok — yalnızca eksik çeviriler. Hukuki danışmanlık değildir.

-- ─── Genel site + satış koşulları (checkout öncesi) ─────────────────────────
INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Örnek: Site genel kullanım şartları (emsal)'
    WHEN 'en' THEN 'Sample: General terms of use (template)'
    WHEN 'de' THEN 'Muster: Allgemeine Nutzungsbedingungen (Vorlage)'
    WHEN 'ru' THEN 'Образец: Общие условия использования'
    WHEN 'fr' THEN 'Exemple : Conditions générales d''utilisation (modèle)'
    WHEN 'zh' THEN '示例：网站使用条款（范本）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ UYARI: Bu metin yalnızca emsal amaçlıdır; hukuki danışmanlık yerine geçmez.\n\n'
      || E'1. Taraflar\nPlatform işletmecisi ile ziyaretçi / üye arasındaki ilişki bu şartlara tabidir.\n\n'
      || E'2. Hizmetin kapsamı\nPlatform; üçüncü taraf tedarikçilerin (otel, tur, transfer vb.) ilanlarını listeler; '
      || E'asıl hizmet sözleşmesi ilgili tedarikçi ile müşteri arasında kurulur.\n\n'
      || E'3. Kişisel veriler\n6698 sayılı KVKK kapsamında aydınlatma metni ve açık rıza süreçleri uygulanır.\n\n'
      || E'4. Sorumluluk sınırı\nPlatform, tedarikçilerin fiillerinden doğrudan sorumlu tutulmaz; aracı rolündedir.\n\n'
      || E'5. Uyuşmazlık\nİstanbul (veya işletme merkeziniz) mahkemeleri ve icra daireleri yetkilidir.\n'
    WHEN 'en' THEN
      E'IMPORTANT: This text is for illustration only and is not legal advice.\n\n'
      || E'1. Parties\nThe relationship between the platform operator and the visitor/member is governed by these terms.\n\n'
      || E'2. Scope\nThe platform lists offers from third-party providers (hotels, tours, transfers, etc.); the underlying contract is between the provider and the customer.\n\n'
      || E'3. Personal data\nPrivacy notices and consent processes apply in line with applicable data protection law.\n\n'
      || E'4. Limitation of liability\nThe platform acts as an intermediary and is not directly liable for providers'' acts or omissions.\n\n'
      || E'5. Disputes\nCourts at the operator''s registered seat (e.g. Istanbul) shall have jurisdiction unless mandatory law provides otherwise.\n'
    WHEN 'de' THEN
      E'WICHTIG: Dieser Text dient nur als Muster und ersetzt keine Rechtsberatung.\n\n'
      || E'1. Parteien\nDas Verhältnis zwischen Plattformbetreiber und Besucher/Mitglied richtet sich nach diesen Bedingungen.\n\n'
      || E'2. Leistungsumfang\nDie Plattform listet Angebote Dritter (Hotels, Touren, Transfers usw.); der Leistungsvertrag kommt zwischen Anbieter und Kunde zustande.\n\n'
      || E'3. Personenbezogene Daten\nHinweise zur Datenverarbeitung und Einwilligungen richten sich nach geltendem Datenschutzrecht.\n\n'
      || E'4. Haftungsbeschränkung\nDie Plattform handelt als Vermittler und haftet nicht unmittelbar für das Verhalten der Anbieter.\n\n'
      || E'5. Streitigkeiten\nGerichtsstand ist der Sitz des Betreibers, soweit zulässig.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Текст приведён для примера и не является юридической консультацией.\n\n'
      || E'1. Стороны\nОтношения между оператором платформы и посетителем/участником регулируются настоящими условиями.\n\n'
      || E'2. Предмет\nПлатформа публикует предложения сторонних поставщиков (отели, туры, трансферы и т.д.); договор об оказании услуг заключается между поставщиком и клиентом.\n\n'
      || E'3. Персональные данные\nПрименяются уведомления о конфиденциальности и согласия в соответствии с применимым правом.\n\n'
      || E'4. Ограничение ответственности\nПлатформа выступает посредником и не несёт прямой ответственности за действия поставщиков.\n\n'
      || E'5. Споры\nПодсудность — по месту регистрации оператора, если иное не предписано императивными нормами.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Ce texte est fourni à titre d''exemple et ne constitue pas un conseil juridique.\n\n'
      || E'1. Parties\nLes relations entre l''exploitant de la plateforme et le visiteur/membre sont régies par les présentes conditions.\n\n'
      || E'2. Portée\nLa plateforme référence des offres de tiers (hôtels, circuits, transferts, etc.) ; le contrat de prestation lie le fournisseur et le client.\n\n'
      || E'3. Données personnelles\nLes mentions d''information et consentements s''appliquent conformément au droit applicable en matière de protection des données.\n\n'
      || E'4. Limitation de responsabilité\nLa plateforme agit en qualité d''intermédiaire et n''est pas directement responsable des manquements des fournisseurs.\n\n'
      || E'5. Litiges\nLes tribunaux du siège de l''exploitant sont compétents, sous réserve des règles impératives.\n'
    WHEN 'zh' THEN
      E'重要提示：本文仅为范本，不构成法律意见。\n\n'
      || E'1. 合同双方\n平台运营方与访客/会员之间的关系受本条款约束。\n\n'
      || E'2. 服务范围\n平台展示第三方供应商（酒店、旅游、接送等）的信息；具体服务合同由供应商与客户订立。\n\n'
      || E'3. 个人信息\n隐私告知与同意流程遵循适用的数据保护法律。\n\n'
      || E'4. 责任限制\n平台作为中介，对供应商的行为不承担直接责任。\n\n'
      || E'5. 争议解决\n除非强制性法律另有规定，争议由运营方所在地法院管辖。\n'
  END
FROM category_contracts cc
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.contract_scope = 'general' AND cc.code = 'platform_emsal_genel_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (
    SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id
  );

INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Örnek: Mesafeli satış / ön ödeme koşulları (emsal)'
    WHEN 'en' THEN 'Sample: Distance selling / prepayment terms (template)'
    WHEN 'de' THEN 'Muster: Fernabsatz / Vorauszahlung (Vorlage)'
    WHEN 'ru' THEN 'Образец: Дистанционная продажа / предоплата'
    WHEN 'fr' THEN 'Exemple : Vente à distance / prépaiement (modèle)'
    WHEN 'zh' THEN '示例：远程销售 / 预付款条款（范本）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ UYARI: Emsal metindir; ödeme ve cayma kurallarını iş modelinize göre güncelleyin.\n\n'
      || E'1. Sipariş ve ödeme\nRezervasyon onayı ile birlikte ön ödeme veya tam ödeme tahsil edilebilir.\n\n'
      || E'2. Cayma ve iptal\nMesafeli sözleşmeler yönetmeliği ve ilgili kategori iptal politikası birlikte uygulanır.\n\n'
      || E'3. Fiyat ve vergi\nGösterilen fiyatlara KDV ve harçlar (varsa) ayrıca yansıtılabilir.\n\n'
      || E'4. Tedarikçi sorumluluğu\nKonaklama, ulaşım veya tur hizmetinin ifası ilgili tedarikçiye aittir.\n'
    WHEN 'en' THEN
      E'IMPORTANT: Sample text only; align payment and withdrawal rules with your business model.\n\n'
      || E'1. Order and payment\nUpon booking confirmation, a deposit or full payment may be charged.\n\n'
      || E'2. Withdrawal and cancellation\nApplicable distance-selling rules and the category cancellation policy apply together.\n\n'
      || E'3. Price and tax\nVAT and fees (if any) may be added to displayed prices.\n\n'
      || E'4. Provider responsibility\nPerformance of accommodation, transport or tour services rests with the relevant provider.\n'
    WHEN 'de' THEN
      E'WICHTIG: Nur Muster; Zahlungs- und Widerrufsregeln an Ihr Geschäftsmodell anpassen.\n\n'
      || E'1. Bestellung und Zahlung\nNach Buchungsbestätigung kann Anzahlung oder Gesamtbetrag erhoben werden.\n\n'
      || E'2. Widerruf und Stornierung\nFernabsatzrecht und die Kategorie-Stornobedingungen gelten gemeinsam.\n\n'
      || E'3. Preis und Steuern\nMwSt. und Gebühren (falls zutreffend) können zusätzlich berechnet werden.\n\n'
      || E'4. Verantwortung des Anbieters\nErbringung von Unterkunft, Transport oder Touren liegt beim jeweiligen Anbieter.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Образец; правила оплаты и отмены приведите в соответствие с вашей моделью.\n\n'
      || E'1. Заказ и оплата\nПосле подтверждения бронирования может взиматься предоплата или полная оплата.\n\n'
      || E'2. Отказ и отмена\nПрименяются правила дистанционной продажи и политика отмены категории.\n\n'
      || E'3. Цена и налоги\nНДС и сборы (при наличии) могут добавляться к указанным ценам.\n\n'
      || E'4. Ответственность поставщика\nИсполнение проживания, перевозки или тура — у соответствующего поставщика.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Texte d''exemple ; adaptez les règles de paiement et de rétractation à votre modèle.\n\n'
      || E'1. Commande et paiement\nUn acompte ou le montant total peut être prélevé après confirmation de réservation.\n\n'
      || E'2. Rétractation et annulation\nLe droit de la vente à distance et la politique d''annulation de la catégorie s''appliquent conjointement.\n\n'
      || E'3. Prix et taxes\nTVA et frais éventuels peuvent s''ajouter aux prix affichés.\n\n'
      || E'4. Responsabilité du prestataire\nL''exécution de l''hébergement, du transport ou du circuit incombe au prestataire concerné.\n'
    WHEN 'zh' THEN
      E'重要提示：本文为范本；请按业务模式调整付款与撤销规则。\n\n'
      || E'1. 订单与付款\n预订确认后可收取定金或全款。\n\n'
      || E'2. 撤销与取消\n适用远程销售规则及该类别的取消政策。\n\n'
      || E'3. 价格与税费\n显示价格可能另加增值税及费用。\n\n'
      || E'4. 供应商责任\n住宿、交通或旅游服务的履行由相应供应商负责。\n'
  END
FROM category_contracts cc
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.contract_scope = 'sales' AND cc.code = 'platform_emsal_satis_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (
    SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id
  );

-- ─── Villa / kısa süreli konaklama — Airbnb tarzı emsal ───────────────────────
INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Kısa süreli konaklama / tatil evi kiralama (emsal — Airbnb tarzı yapı)'
    WHEN 'en' THEN 'Short-term stay / holiday home rental (template — marketplace style)'
    WHEN 'de' THEN 'Kurzzeitunterkunft / Ferienhaus (Muster — Marktplatzmodell)'
    WHEN 'ru' THEN 'Краткосрочное проживание / аренда дома (образец)'
    WHEN 'fr' THEN 'Séjour court / location saisonnière (modèle — type marketplace)'
    WHEN 'zh' THEN '短期住宿 / 度假屋租赁（范本）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ: Örnek metindir; yerel mevzuat ve KVKK için hukuki inceleme yapınız.\n\n'
      || E'1. Konu\nMisafir (Kiracı) ile ev sahibi veya yetkili aracı arasında kısa süreli konaklama hizmeti.\n\n'
      || E'2. Rezervasyon ve ödeme\nOnaylanan tarihler ve kişi sayısı sözleşmenin parçasıdır; ek misafir ücreti politikası ilan metninde belirtilir.\n\n'
      || E'3. Ev kuralları\nGürültü, sigara, evcil hayvan ve çöp kuralları ilanda ve tesiste duyurulur; ihlal hizmetin sonlandırılmasına yol açabilir.\n\n'
      || E'4. İptal ve iade\nİptal süreleri ve kesinti oranları ilan iptal politikasına tabidir (Airbnb benzeri katmanlı iptal).\n\n'
      || E'5. Depozito ve hasar\nTemizlik ve hasar bedelleri güvenlik depozitosundan veya ödeme aracılığıyla mahsup edilebilir.\n\n'
      || E'6. Sorumluluk\nTesisin güvenliği ve sigorta konusu tarafların yürürlükteki mevzuatına göre belirlenir.\n'
    WHEN 'en' THEN
      E'IMPORTANT: Sample only; obtain legal review for local law and privacy requirements.\n\n'
      || E'1. Subject\nShort-term accommodation between the guest (tenant) and the host or authorised intermediary.\n\n'
      || E'2. Booking and payment\nConfirmed dates and occupancy form part of the agreement; extra-guest fees are stated in the listing.\n\n'
      || E'3. House rules\nNoise, smoking, pets and waste rules are shown in the listing and on site; breach may lead to termination.\n\n'
      || E'4. Cancellation and refunds\nCancellation windows and fee tiers follow the listing policy (tiered model).\n\n'
      || E'5. Deposit and damage\nCleaning and damage charges may be offset from the security deposit or via the payment flow.\n\n'
      || E'6. Liability\nSafety and insurance are determined under applicable law between the parties.\n'
    WHEN 'de' THEN
      E'WICHTIG: Nur Muster; lokales Recht und Datenschutz prüfen lassen.\n\n'
      || E'1. Gegenstand\nKurzzeitunterkunft zwischen Gast und Eigentümer oder bevollmächtigtem Vermittler.\n\n'
      || E'2. Buchung und Zahlung\nBestätigte Daten und Belegung sind Vertragsbestandteil; Zusatzgästegebühren stehen im Inserat.\n\n'
      || E'3. Hausregeln\nLärm, Rauchen, Haustiere und Abfall sind ausgewiesen; Verstöße können zur Beendigung führen.\n\n'
      || E'4. Stornierung und Erstattung\nFristen und Staffeln folgen der Stornopolitik des Inserats.\n\n'
      || E'5. Kaution und Schäden\nReinigung und Schäden können von der Kaution oder über die Zahlung verrechnet werden.\n\n'
      || E'6. Haftung\nSicherheit und Versicherung richten nach geltendem Recht.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Образец; проверьте местное законодательство и защиту данных.\n\n'
      || E'1. Предмет\nКраткосрочное размещение между гостем и владельцем или уполномоченным посредником.\n\n'
      || E'2. Бронирование и оплата\nПодтверждённые даты и состав проживающих — часть договора; доплата за гостей — в объявлении.\n\n'
      || E'3. Правила проживания\nШум, курение, животные и мусор указаны в объявлении; нарушение может привести к расторжению.\n\n'
      || E'4. Отмена и возврат\nСроки и удержания по политике объявления (ступенчатая модель).\n\n'
      || E'5. Залог и ущерб\nУборка и ущерб могут удерживаться из залога или через платёж.\n\n'
      || E'6. Ответственность\nБезопасность и страхование — по применимому праву между сторонами.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Exemple uniquement ; faites valider le droit local et la confidentialité.\n\n'
      || E'1. Objet\nHébergement de courte durée entre l''invité et l''hôte ou l''intermédiaire habilité.\n\n'
      || E'2. Réservation et paiement\nDates et occupation confirmées font partie du contrat ; frais invités supplémentaires dans l''annonce.\n\n'
      || E'3. Règlement intérieur\nBruit, tabac, animaux et déchets sont affichés ; manquement pouvant entraîner la résiliation.\n\n'
      || E'4. Annulation et remboursement\nDélais et barèmes selon la politique d''annonce.\n\n'
      || E'5. Caution et dommages\nNettoyage et dommages peuvent être imputés sur la caution ou le flux de paiement.\n\n'
      || E'6. Responsabilité\nSécurité et assurance selon le droit applicable.\n'
    WHEN 'zh' THEN
      E'重要提示：本文为范本；请就当地法规与个人信息保护进行法律审核。\n\n'
      || E'1. 标的\n访客与房东或授权中介之间的短期住宿服务。\n\n'
      || E'2. 预订与付款\n确认日期与人数为合同内容；额外住客费用见房源说明。\n\n'
      || E'3. 房屋规则\n噪音、吸烟、宠物与垃圾规则在房源及现场公示；违约可终止服务。\n\n'
      || E'4. 取消与退款\n取消时限与扣费比例遵循房源取消政策（分层模式）。\n\n'
      || E'5. 押金与损坏\n清洁与损坏费用可从押金或支付流程中抵扣。\n\n'
      || E'6. 责任\n安全与保险依适用法律在双方之间确定。\n'
  END
FROM category_contracts cc
JOIN product_categories pc ON pc.id = cc.category_id AND pc.code = 'holiday_home'
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.code = 'emsal_airbnb_tarzi_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id);

-- ─── Yat charter — Vira Vira tarzı emsal ────────────────────────────────────
INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Yat kiralama / charter (emsal — charter platformları tarzı)'
    WHEN 'en' THEN 'Yacht charter (template — charter platform style)'
    WHEN 'de' THEN 'Yachtcharter (Muster — Charterplattform)'
    WHEN 'ru' THEN 'Аренда яхты / чартер (образец)'
    WHEN 'fr' THEN 'Location de yacht / charter (modèle)'
    WHEN 'zh' THEN '游艇租赁 / 包船（范本）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ: Örnek metindir; deniz ticareti ve sigorta için uzman görüşü alınız.\n\n'
      || E'1. Taraflar\nCharterer (kiracı) ile tekne işletmecisi / aracı arasında belirli süre ve rota için tekne devri.\n\n'
      || E'2. Mürettebat ve kaptan\nKaptanlı veya bareboat seçenekleri ilanda; bareboat için ehliyet ve deneyim şartları açıkça yazılır.\n\n'
      || E'3. Yakıt ve liman\nYakıt, transitlog, bağlama ve yiyecek-içecek kalemleri sözleşmede netleştirilir.\n\n'
      || E'4. Hava ve iptal\nMeteorolojik mücbir sebepler ve liman yasakları için erteleme / iade politikası tanımlanır.\n\n'
      || E'5. Güvenlik ve ekipman\nCan yeleği, raft ve iletişim ekipmanı tekne standartlarına uygundur.\n'
    WHEN 'en' THEN
      E'IMPORTANT: Sample only; seek specialist advice for maritime commerce and insurance.\n\n'
      || E'1. Parties\nCharterer and vessel operator/intermediary for defined duration and itinerary.\n\n'
      || E'2. Crew and skipper\nSkippered or bareboat options per listing; bareboat licence and experience requirements are stated clearly.\n\n'
      || E'3. Fuel and ports\nFuel, transitlog, mooring and provisions are specified in the contract.\n\n'
      || E'4. Weather and cancellation\nPolicy for weather force majeure and port closures defines postponement/refunds.\n\n'
      || E'5. Safety and equipment\nLife jackets, rafts and communications meet vessel standards.\n'
    WHEN 'de' THEN
      E'WICHTIG: Nur Muster; Seekommerz und Versicherung fachlich prüfen.\n\n'
      || E'1. Parteien\nCharterer und Betreiber/Vermittler für Dauer und Route.\n\n'
      || E'2. Besatzung und Skipper\nMit oder ohne Skipper laut Inserat; Bareboat-Voraussetzungen klar benannt.\n\n'
      || E'3. Kraftstoff und Häfen\nKraftstoff, Transitlog, Liegeplatz und Verpflegung im Vertrag geregelt.\n\n'
      || E'4. Wetter und Stornierung\nRegeln bei höherer Gewalt und Hafenschließungen.\n\n'
      || E'5. Sicherheit und Ausrüstung\nRettungswesten, Floß und Funk nach Bootsstandard.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Образец; проконсультируйтесь по морскому праву и страхованию.\n\n'
      || E'1. Стороны\nЧартерер и оператор/посредник на срок и маршрут.\n\n'
      || E'2. Экипаж и капитан\nС капитаном или bareboat по объявлению; требования к лицензии указаны.\n\n'
      || E'3. Топливо и порты\nТопливо, транзитлог, швартовка и провизия — в договоре.\n\n'
      || E'4. Погода и отмена\nПолитика при форс-мажоре и закрытии портов.\n\n'
      || E'5. Безопасность\nСпасжилеты, плот и связь по стандартам судна.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Exemple ; avis spécialisé pour commerce maritime et assurance.\n\n'
      || E'1. Parties\nAffréteur et exploitant/intermédiaire pour durée et itinéraire.\n\n'
      || E'2. Équipage et skipper\nAvec ou sans skipper selon l''annonce ; conditions bareboat explicites.\n\n'
      || E'3. Carburant et ports\nCarburant, transitlog, amarrage et provisions au contrat.\n\n'
      || E'4. Météo et annulation\nPolitique en cas de force majeure météo ou fermeture de port.\n\n'
      || E'5. Sécurité\nGilets, radeau et communications selon normes du navire.\n'
    WHEN 'zh' THEN
      E'重要提示：本文为范本；海事与保险请咨询专业人士。\n\n'
      || E'1. 合同双方\n租船人与船舶经营方/中介，约定期限与航线。\n\n'
      || E'2. 船员与船长\n按房源选择有船长或裸船；裸船资质与经验要求须明示。\n\n'
      || E'3. 燃油与港口\n燃油、过境文件、停泊及餐饮在合同中约定。\n\n'
      || E'4. 天气与取消\n恶劣天气与港口关闭时的延期/退款政策。\n\n'
      || E'5. 安全与设备\n救生衣、筏及通讯设备符合船舶标准。\n'
  END
FROM category_contracts cc
JOIN product_categories pc ON pc.id = cc.category_id AND pc.code = 'yacht_charter'
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.code = 'emsal_vira_tarzi_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id);

-- ─── Otel — OTA / paket satış (ETS, Tatilbudur tarzı yapı) ───────────────────
INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Otel konaklama ve paket satış (emsal — OTA / paket tur yapısı)'
    WHEN 'en' THEN 'Hotel stay and package sale (template — OTA / package model)'
    WHEN 'de' THEN 'Hotelaufenthalt und Paket (Muster — OTA/Paket)'
    WHEN 'ru' THEN 'Проживание в отеле и пакет (образец — OTA)'
    WHEN 'fr' THEN 'Séjour hôtel et forfait (modèle — OTA / package)'
    WHEN 'zh' THEN '酒店住宿与套餐销售（范本 — OTA）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ: Örnek metindir; TÜRSAB ve otel mevzuatına uyum için hukuki kontrol yapınız.\n\n'
      || E'1. Konu\nMisafirin seçtiği oda tipi, tarihler ve pansiyon tipi (RO/BB/HB/AI) rezervasyonun parçasıdır.\n\n'
      || E'2. Fiyat ve vergi\nKonaklama bedeline yasal vergiler ve belediye vergileri (varsa) eklenebilir.\n\n'
      || E'3. Check-in / check-out\nSaatler tesise göre değişir; geç çıkış ücretlendirmesi ilan koşullarında yer alır.\n\n'
      || E'4. İptal ve no-show\nErken iptal, son günlük iptal ve gelmeme (no-show) kuralları ilan politikası ile bağlayıcıdır.\n\n'
      || E'5. Çocuk ve ek yatak\nYaş dilimleri ve ek yatak ücretleri ilanda belirtilir.\n'
    WHEN 'en' THEN
      E'IMPORTANT: Sample only; have legal review for travel-agency and hotel regulations.\n\n'
      || E'1. Subject\nRoom type, dates and board basis (RO/BB/HB/AI) chosen by the guest form part of the booking.\n\n'
      || E'2. Price and tax\nStatutory taxes and local levies (if any) may be added to the room rate.\n\n'
      || E'3. Check-in / check-out\nTimes vary by property; late checkout fees appear in the offer terms.\n\n'
      || E'4. Cancellation and no-show\nEarly cancellation, last-minute cancellation and no-show rules follow the published policy.\n\n'
      || E'5. Children and extra beds\nAge brackets and extra bed fees are stated in the listing.\n'
    WHEN 'de' THEN
      E'WICHTIG: Nur Muster; Reiseveranstalter- und Hotelrecht prüfen.\n\n'
      || E'1. Gegenstand\nZimmertyp, Daten und Verpflegung (RO/BB/HB/AI) sind Buchungsbestandteil.\n\n'
      || E'2. Preis und Steuern\nGesetzliche Steuern und lokale Abgaben können hinzukommen.\n\n'
      || E'3. Check-in / Check-out\nZeiten je nach Objekt; spätes Auschecken gemäß Angebotsbedingungen.\n\n'
      || E'4. Stornierung und No-show\nRegeln für Vorab-, Last-Minute-Storno und Nichterscheinen laut Policy.\n\n'
      || E'5. Kinder und Zustellbetten\nAltersstaffel und Zuschläge im Inserat.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Образец; проверьте нормы турагентств и отелей.\n\n'
      || E'1. Предмет\nТип номера, даты и питание (RO/BB/HB/AI) — часть бронирования.\n\n'
      || E'2. Цена и налоги\nНалоги и сборы могут добавляться к тарифу.\n\n'
      || E'3. Заезд / выезд\nВремя зависит от объекта; поздний выезд — по условиям предложения.\n\n'
      || E'4. Отмена и no-show\nПравила ранней отмены, в последний момент и неявки — по политике.\n\n'
      || E'5. Дети и доп. кровати\nВозрастные группы и доплаты в объявлении.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Exemple ; validez conformité agences de voyages et hôtellerie.\n\n'
      || E'1. Objet\nType de chambre, dates et formule repas (RO/BB/HB/AI) font partie de la réservation.\n\n'
      || E'2. Prix et taxes\nTaxes légales et redevances locales peuvent s''ajouter.\n\n'
      || E'3. Arrivée / départ\nHoraires selon l''établissement ; départ tardif selon l''offre.\n\n'
      || E'4. Annulation et no-show\nRègles d''annulation anticipée, de dernière minute et de non-présentation selon la politique.\n\n'
      || E'5. Enfants et lits supplémentaires\nTranches d''âge et suppléments dans l''annonce.\n'
    WHEN 'zh' THEN
      E'重要提示：本文为范本；请核对旅行社与酒店法规。\n\n'
      || E'1. 标的\n房型、日期与餐食方案（RO/BB/HB/AI）为预订内容。\n\n'
      || E'2. 价格与税费\n法定税费及地方费可能另计。\n\n'
      || E'3. 入住 / 退房\n时间因酒店而异；延迟退房费用见报价条款。\n\n'
      || E'4. 取消与未入住\n提前取消、临近取消与未入住规则以公示政策为准。\n\n'
      || E'5. 儿童与加床\n年龄区间与加床费见房源说明。\n'
  END
FROM category_contracts cc
JOIN product_categories pc ON pc.id = cc.category_id AND pc.code = 'hotel'
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.code = 'emsal_ota_otel_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id);

-- ─── Tur — Gezinomi tarzı organize tur ───────────────────────────────────────
INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Organize tur ve paket program (emsal — tur platformu yapısı)'
    WHEN 'en' THEN 'Organised tour and package (template — tour platform model)'
    WHEN 'de' THEN 'Organisierte Reise und Paket (Muster — Tourplattform)'
    WHEN 'ru' THEN 'Организованный тур и пакет (образец)'
    WHEN 'fr' THEN 'Circuit organisé et forfait (modèle — plateforme tours)'
    WHEN 'zh' THEN '跟团游与打包行程（范本）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ: Örnek metindir; TÜRSAB mesafeli satış ve paket tur mevzuatına uyarlayınız.\n\n'
      || E'1. Program\nTur kapsamındaki ulaşım, konaklama, rehberlik ve müze girişleri program föyünde listelenir.\n\n'
      || E'2. Değişiklikler\nHava, trafik veya kapasite nedeniyle güzergâh / saat değişiklikleri mümkündür; eşdeğer hizmet sunulur.\n\n'
      || E'3. İptal\nKatılımcı iptali ve organizatör iptali için tarih dilimleri ve kesintiler ayrıca duyurulur.\n\n'
      || E'4. Sağlık ve uygunluk\nFiziksel zorluk içeren turlarda katılımcı sağlık beyanı ve yaş sınırları uygulanır.\n\n'
      || E'5. Bagaj ve kişisel eşya\nKayıp / hasar için sigorta ve kişisel sorumluluk kuralları geçerlidir.\n'
    WHEN 'en' THEN
      E'IMPORTANT: Sample only; align with travel-agency distance selling and package-tour rules.\n\n'
      || E'1. Programme\nTransport, accommodation, guiding and museum entries are listed in the itinerary.\n\n'
      || E'2. Changes\nRoute or timing may change due to weather, traffic or capacity; equivalent services are provided where possible.\n\n'
      || E'3. Cancellation\nWindows and deductions for participant or organiser cancellation are published separately.\n\n'
      || E'4. Health and fitness\nPhysically demanding tours may require health declarations and age limits.\n\n'
      || E'5. Baggage and belongings\nInsurance and personal liability rules apply to loss or damage.\n'
    WHEN 'de' THEN
      E'WICHTIG: Nur Muster; Fernabsatz- und Pauschalreise-Vorschriften beachten.\n\n'
      || E'1. Programm\nTransport, Unterkunft, Führung und Museen im Programmheft.\n\n'
      || E'2. Änderungen\nRoute/Zeiten können sich aus Wetter, Verkehr oder Kapazität ändern; gleichwertige Leistung wo möglich.\n\n'
      || E'3. Stornierung\nFristen und Abzüge für Teilnehmer/Veranstalter separat bekannt.\n\n'
      || E'4. Gesundheit und Eignung\nAnspruchsvolle Touren: Gesundheitserklärung und Altersgrenzen.\n\n'
      || E'5. Gepäck\nVersicherung und Haftung bei Verlust/Schaden nach Regeln.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Образец; приведите в соответствие с дистанционной продажей и пакетными турами.\n\n'
      || E'1. Программа\nТранспорт, проживание, гид и музеи — в программе.\n\n'
      || E'2. Изменения\nМаршрут/время из-за погоды, дорог или вместимости; эквивалент по возможности.\n\n'
      || E'3. Отмена\nСроки и удержания для участника и организатора публикуются отдельно.\n\n'
      || E'4. Здоровье\nДля сложных туров — заявления о здоровье и возрастные ограничения.\n\n'
      || E'5. Багаж\nСтрахование и ответственность при утрате/повреждении.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Exemple ; alignez vente à distance et voyages à forfait.\n\n'
      || E'1. Programme\nTransport, hébergement, guide et musées au descriptif.\n\n'
      || E'2. Modifications\nItinéraire/horaires selon météo, trafic ou capacité ; prestation équivalente si possible.\n\n'
      || E'3. Annulation\nDélais et retenues participant/organisateur publiés séparément.\n\n'
      || E'4. Santé et aptitude\nTours exigeants : déclaration santé et limites d''âge.\n\n'
      || E'5. Bagages\nAssurance et responsabilité en cas de perte ou dommage.\n'
    WHEN 'zh' THEN
      E'重要提示：本文为范本；请符合远程销售与包价旅游法规。\n\n'
      || E'1. 行程\n交通、住宿、讲解及博物馆等项目列于行程单。\n\n'
      || E'2. 变更\n因天气、交通或容量可调整路线/时间；尽可能提供同等服务。\n\n'
      || E'3. 取消\n参与者与组织方取消的时限与扣费另行公告。\n\n'
      || E'4. 健康与适应性\n体力要求高的行程可要求健康声明与年龄限制。\n\n'
      || E'5. 行李与个人物品\n遗失/损坏适用保险与个人责任规则。\n'
  END
FROM category_contracts cc
JOIN product_categories pc ON pc.id = cc.category_id AND pc.code = 'tour'
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.code = 'emsal_gezinomi_tarzi_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id);

-- ─── Uçuş / otobüs — bilet emsal ─────────────────────────────────────────────
INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Uçuş / otobüs bileti (emsal)'
    WHEN 'en' THEN 'Flight / bus ticket (template)'
    WHEN 'de' THEN 'Flug- / Busticket (Muster)'
    WHEN 'ru' THEN 'Авиа / автобусный билет (образец)'
    WHEN 'fr' THEN 'Billet avion / bus (modèle)'
    WHEN 'zh' THEN '机票 / 巴士票（范本）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ: Örnek metindir; taşıyıcı tarife ve IATA kuralları önceliklidir.\n\n'
      || E'1. Bilet\nSegmentler, sınıf ve bagaj hakkı biletle birlikte kesinleşir.\n\n'
      || E'2. İsim değişikliği ve iptal\nTaşıyıcı kurallarına tabi ücret ve ceza uygulanır.\n\n'
      || E'3. Check-in\nHavalimanı veya online check-in süreleri yolcunun takibindedir.\n'
    WHEN 'en' THEN
      E'IMPORTANT: Sample only; carrier tariffs and IATA rules take precedence.\n\n'
      || E'1. Ticket\nSegments, class and baggage allowance are fixed with the ticket.\n\n'
      || E'2. Name change and cancellation\nFees and penalties follow carrier rules.\n\n'
      || E'3. Check-in\nAirport or online check-in deadlines are the passenger''s responsibility.\n'
    WHEN 'de' THEN
      E'WICHTIG: Nur Muster; Beförderertarife und IATA-Regeln gehen vor.\n\n'
      || E'1. Ticket\nSegmente, Klasse und Freigepäck sind mit dem Ticket festgelegt.\n\n'
      || E'2. Namensänderung und Stornierung\nGebühren nach Befördererregeln.\n\n'
      || E'3. Check-in\nFristen am Flughafen oder online liegen beim Reisenden.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Образец; приоритет у тарифов перевозчика и правил IATA.\n\n'
      || E'1. Билет\nСегменты, класс и норма багажа фиксируются билетом.\n\n'
      || E'2. Смена имени и отмена\nСборы по правилам перевозчика.\n\n'
      || E'3. Регистрация\nСроки в аэропорту или онлайн — ответственность пассажира.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Exemple ; tarifs transporteur et règles IATA priment.\n\n'
      || E'1. Billet\nSegments, classe et franchise bagages fixés avec le billet.\n\n'
      || E'2. Changement de nom et annulation\nFrais selon règles du transporteur.\n\n'
      || E'3. Enregistrement\nDélais aéroport ou en ligne : responsabilité du passager.\n'
    WHEN 'zh' THEN
      E'重要提示：本文为范本；以承运人运价及 IATA 规则为准。\n\n'
      || E'1. 机票\n航段、舱位与行李额度以机票为准。\n\n'
      || E'2. 改名与取消\n费用与罚金依承运人规则。\n\n'
      || E'3. 值机\n机场或在线值机时限由旅客自行关注。\n'
  END
FROM category_contracts cc
JOIN product_categories pc ON pc.id = cc.category_id AND pc.code = 'flight'
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.code = 'emsal_ucus_bilet_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id);

-- ─── Diğer kategoriler — genel hizmet emsali (aktivite, transfer, feribot vb.) ─
INSERT INTO category_contract_translations (contract_id, locale_id, title, body_text)
SELECT cc.id, loc.id,
  CASE lower(loc.code)
    WHEN 'tr' THEN 'Hizmet / rezervasyon sözleşmesi (emsal — genel kategori)'
    WHEN 'en' THEN 'Service / reservation agreement (template — general category)'
    WHEN 'de' THEN 'Dienst-/Reservierungsvertrag (Muster — allgemein)'
    WHEN 'ru' THEN 'Услуга / бронирование (образец — общая категория)'
    WHEN 'fr' THEN 'Prestation / réservation (modèle — catégorie générale)'
    WHEN 'zh' THEN '服务 / 预订协议（范本 — 通用类别）'
  END,
  CASE lower(loc.code)
    WHEN 'tr' THEN
      E'ÖNEMLİ: Örnek metindir; kategoriye özel şartları ekleyin.\n\n'
      || E'1. Hizmetin tanımı\nSatın alınan hizmetin kapsamı ilan ve onay e-postasında özetlenir.\n\n'
      || E'2. Tarih ve yer\nHizmet yeri ve saati tedarikçi onayı ile kesinleşir.\n\n'
      || E'3. İptal\nİptal ve değişiklik ilan politikasına tabidir.\n\n'
      || E'4. Sorumluluk\nTedarikçi kendi hizmet alanında; platform aracı sıfatıyla sınırlı sorumludur.\n'
    WHEN 'en' THEN
      E'IMPORTANT: Sample only; add category-specific terms.\n\n'
      || E'1. Description of service\nThe scope is summarised in the listing and confirmation email.\n\n'
      || E'2. Time and place\nVenue and time are confirmed with the provider.\n\n'
      || E'3. Cancellation\nCancellation and changes follow the listing policy.\n\n'
      || E'4. Liability\nThe provider is responsible for its service; the platform acts as intermediary with limited liability.\n'
    WHEN 'de' THEN
      E'WICHTIG: Nur Muster; kategoriespezifische Bedingungen ergänzen.\n\n'
      || E'1. Leistungsbeschreibung\nUmfang in Inserat und Bestätigungsmail.\n\n'
      || E'2. Ort und Zeit\nMit Anbieter bestätigt.\n\n'
      || E'3. Stornierung\nNach Inseratsrichtlinie.\n\n'
      || E'4. Haftung\nAnbieter für seine Leistung; Plattform nur als Vermittler begrenzt haftend.\n'
    WHEN 'ru' THEN
      E'ВАЖНО: Образец; добавьте условия по категории.\n\n'
      || E'1. Описание услуги\nОбъём в объявлении и письме подтверждения.\n\n'
      || E'2. Время и место\nПодтверждаются с поставщиком.\n\n'
      || E'3. Отмена\nПо политике объявления.\n\n'
      || E'4. Ответственность\nПоставщик за свою услугу; платформа — посредник с ограниченной ответственностью.\n'
    WHEN 'fr' THEN
      E'IMPORTANT : Exemple ; ajoutez les conditions propres à la catégorie.\n\n'
      || E'1. Description\nÉtendue dans l''annonce et l''e-mail de confirmation.\n\n'
      || E'2. Lieu et heure\nConfirmés avec le prestataire.\n\n'
      || E'3. Annulation\nSelon la politique de l''annonce.\n\n'
      || E'4. Responsabilité\nLe prestataire pour sa prestation ; la plateforme intermédiaire à responsabilité limitée.\n'
    WHEN 'zh' THEN
      E'重要提示：本文为范本；请补充类别专用条款。\n\n'
      || E'1. 服务说明\n范围见房源与确认邮件。\n\n'
      || E'2. 时间与地点\n经供应商确认。\n\n'
      || E'3. 取消\n依房源政策。\n\n'
      || E'4. 责任\n供应商对其服务负责；平台为中介，责任有限。\n'
  END
FROM category_contracts cc
JOIN product_categories pc ON pc.id = cc.category_id
  AND pc.code IN (
    'activity', 'transfer', 'ferry', 'car_rental', 'cruise', 'hajj', 'visa',
    'beach_lounger', 'cinema_ticket', 'event', 'restaurant_table'
  )
CROSS JOIN locales loc
WHERE cc.organization_id IS NULL AND cc.code = 'emsal_genel_hizmet_v1'
  AND lower(loc.code) IN ('en', 'de', 'ru', 'fr', 'zh')
  AND coalesce(loc.is_active, true) = true
  AND NOT EXISTS (SELECT 1 FROM category_contract_translations t WHERE t.contract_id = cc.id AND t.locale_id = loc.id);
