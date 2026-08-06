-- Türkçe charset onarımı — kalan vitrin alanları (amenities / iptal / havuz / POI)
-- Üret: node scripts/generate-repair-remaining-turkish-ascii-fields-sql.mjs
-- 412–422 sonrası: imported_* label, cancellation, pool, nearby title, hotel rooms, meta owner address

BEGIN;

CREATE TEMP TABLE _turkish_ascii_repair_pairs (
  ord integer PRIMARY KEY,
  broken text NOT NULL,
  fixed text NOT NULL
) ON COMMIT DROP;

INSERT INTO _turkish_ascii_repair_pairs (ord, broken, fixed) VALUES
  (1, 'ihtiya&ccedil;larınızı?', 'ihtiya&ccedil;larınızı'),
  (2, '&uuml;rl&uuml;?&uuml;', '&uuml;rl&uuml;ğ&uuml;'),
  (3, 'g&ouml;z&uuml;kmedi?i', 'g&ouml;z&uuml;kmediği'),
  (4, 'ihtiya&ccedil;lar?n?z', 'ihtiya&ccedil;larınızı'),
  (5, 'ge&ccedil;irece?iniz', 'ge&ccedil;ireceğiniz'),
  (6, 'ihtiya&ccedil;lar?n?', 'ihtiya&ccedil;larını'),
  (7, 'd&uuml;zenlenmi?tir', 'd&uuml;zenlenmiştir'),
  (8, '&ccedil;e?itlili?i', '&ccedil;eşitliliği'),
  (9, 'd&ouml;n&uuml;?ler', 'd&ouml;n&uuml;şler'),
  (10, 'se&ccedil;ilmi?tir', 'se&ccedil;ilmiştir'),
  (11, 'villalar?m?zdand?r', 'villalarımızdandır'),
  (12, 'hi&ccedil;bir ?ey', 'hi&ccedil;bir şey'),
  (13, 'ka&ccedil;?r?lmaz', 'ka&ccedil;ırılmaz'),
  (14, 'ihtiyaçlarınızı?', 'ihtiyaçlarınızı'),
  (15, 'arkadaşlar?n?zla', 'arkadaşlarınızla'),
  (16, 'başlang?&ccedil;', 'başlangı&ccedil;'),
  (17, 'ihtiyaçlar?n?zı', 'ihtiyaçlarınızı'),
  (18, 'olamayaca??m?z?', 'olamayacağımızı'),
  (19, 'r&uuml;y&uuml;?', 'r&uuml;y&uuml;ş'),
  (20, 'se&ccedil;ene?i', 'se&ccedil;eneği'),
  (21, 'sunabilece?iniz', 'sunabileceğiniz'),
  (22, 'ula?abilirsiniz', 'ulaşabilirsiniz'),
  (23, 'yapabilece?iniz', 'yapabileceğiniz'),
  (24, 'konuklarım?zın', 'konuklarımızın'),
  (25, 'Konuklarım?zın', 'Konuklarımızın'),
  (26, 'Villa ?im?e?in', 'Villa Şimşeğin'),
  (27, 'Villa ?imıeğin', 'Villa Şimşeğin'),
  (28, 'Villa ?imşeğin', 'Villa Şimşeğin'),
  (29, 'tasarlanmı?tır', 'tasarlanmıştır'),
  (30, 'Tasarlanm?şt?r', 'Tasarlanmıştır'),
  (31, 'TASARLANM?ŞT?R', 'TASARLANMIŞTIR'),
  (32, '&ccedil;?kar?n', '&ccedil;ıkarın'),
  (33, '&ccedil;ama??r', '&ccedil;amaşır'),
  (34, 'g&uuml;venli?i', 'g&uuml;venliği'),
  (35, 'getirdi?imizde', 'getirdiğimizde'),
  (36, 'haz?rlanm??t?r', 'hazırlanmıştır'),
  (37, 'haz?rlanm?şt?r', 'hazırlanmıştır'),
  (38, 'ihtiyaçlar?n?z', 'ihtiyaçlarınızı'),
  (39, 'tamamlanm??t?r', 'tamamlanmıştır'),
  (40, 'tamamlanm?şt?r', 'tamamlanmıştır'),
  (41, 'tasarlanm??t?r', 'tasarlanmıştır'),
  (42, 'tasarlanm?şt?r', 'tasarlanmıştır'),
  (43, 'villalar?m?zda', 'villalarımızda'),
  (44, 'yaşayacaks?n?z', 'yaşayacaksınız'),
  (45, '?&ccedil;ecek', 'İ&ccedil;ecek'),
  (46, '&ccedil;ar?af', '&ccedil;arşaf'),
  (47, 'anlataca??n?z', 'anlatacağınız'),
  (48, 'bulunmaktad?r', 'bulunmaktadır'),
  (49, 'dalg?&ccedil;', 'dalgı&ccedil;'),
  (50, 'donat?lm??t?r', 'donatılmıştır'),
  (51, 'ihtiyaçlar?n?', 'ihtiyaçlarını'),
  (52, 'sunulmaktad?r', 'sunulmaktadır'),
  (53, 'villalar?m?za', 'villalarımıza'),
  (54, 'yap?lmaktad?r', 'yapılmaktadır'),
  (55, 'Kaş&rsquo;?n', 'Kaş&rsquo;ın'),
  (56, 'KAŞ&RSQUO;?N', 'KAŞ&RSQUO;IN'),
  (57, 'konnumlanm??', 'konumlanmış'),
  (58, 'Konnumlanm??', 'Konumlanmış'),
  (59, 'kar??layacak', 'karşılayacak'),
  (60, 'Kar??layacak', 'Karşılayacak'),
  (61, 'çocuklar?n?z', 'çocuklarınız'),
  (62, 'çocuklar?nız', 'çocuklarınız'),
  (63, 'a?r?lamaktan', 'ağırlamaktan'),
  (64, 'a??rlamaktan', 'ağırlamaktan'),
  (65, '&ccedil;?k??', '&ccedil;ıkış'),
  (66, '&Ccedil;?k??', '&Ccedil;ıkış'),
  (67, '&ccedil;?kar', '&ccedil;ıkar'),
  (68, '&Ccedil;al??', '&Ccedil;alış'),
  (69, '&ccedil;e?it', '&ccedil;eşit'),
  (70, '&ouml;?leden', '&ouml;ğleden'),
  (71, 'al?nmaktad?r', 'alınmaktadır'),
  (72, 'bulacaks?n?z', 'bulacaksınız'),
  (73, 'd&uuml;nyas?', 'd&uuml;nyası'),
  (74, 'getirdi?imiz', 'getirdiğimiz'),
  (75, 'girildi?inde', 'girildiğinde'),
  (76, 'Korunakl?l?k', 'Korunaklılık'),
  (77, 'uzakl?ktad?r', 'uzaklıktadır'),
  (78, 'villalar?m?z', 'villalarımız'),
  (79, 'Villalar?m?z', 'Villalarımız'),
  (80, 'yan?tlanmas?', 'yanıtlanması'),
  (81, 'yemek masas?', 'yemek masası'),
  (82, 'yorgunlu?unu', 'yorgunluğunu'),
  (83, 'Kaş&apos;?n', 'Kaş&apos;ın'),
  (84, 'yak?n?ndaki', 'yakınındaki'),
  (85, 'yakın?ndaki', 'yakınındaki'),
  (86, 'yak?nındaki', 'yakınındaki'),
  (87, 'YAK?N?NDAKİ', 'YAKININDAKİ'),
  (88, '?&ccedil;in', 'İ&ccedil;in'),
  (89, 'a&ccedil;?k', 'a&ccedil;ık'),
  (90, 'A&ccedil;?k', 'A&ccedil;ık'),
  (91, 'ayr?nt?s?na', 'ayrıntısına'),
  (92, 'ekipmanlar?', 'ekipmanları'),
  (93, 'gizlili?ine', 'gizliliğine'),
  (94, 'haz?rlanm??', 'hazırlanmış'),
  (95, 'ihtiyac?n?z', 'ihtiyacınız'),
  (96, 'konumlanm??', 'konumlanmış'),
  (97, 'manzaralar?', 'manzaraları'),
  (98, 'manzaras?n?', 'manzarasını'),
  (99, 'mobilyalar?', 'mobilyaları'),
  (100, 'rahatlamas?', 'rahatlaması'),
  (101, 'sa? tarafta', 'sağ tarafta'),
  (102, 'seçilmi?tir', 'seçilmiştir'),
  (103, 'sunmaktad?r', 'sunmaktadır'),
  (104, 'tamamlanm??', 'tamamlanmış'),
  (105, 'tasar?m?yla', 'tasarımıyla'),
  (106, 'tasarlanm??', 'tasarlanmış'),
  (107, 'temizli?ini', 'temizliğini'),
  (108, 'yap?lm??t?r', 'yapılmıştır'),
  (109, 'yap?lm?şt?r', 'yapılmıştır'),
  (110, 'yeti?kinler', 'yetişkinler'),
  (111, 'Kaş&#39;?n', 'Kaş&#39;ın'),
  (112, 'ta? barbek', 'taş barbek'),
  (113, 'Ta? barbek', 'Taş barbek'),
  (114, 'bah?esinde', 'bahçesinde'),
  (115, 'Bah?esinde', 'Bahçesinde'),
  (116, 'Villamız?n', 'Villamızın'),
  (117, 'Villam?z?n', 'Villamızın'),
  (118, 'Villam?zın', 'Villamızın'),
  (119, 'VILLAMIZ?N', 'VILLAMIZIN'),
  (120, 'güne?lenme', 'güneşlenme'),
  (121, 'Güne?lenme', 'Güneşlenme'),
  (122, 'g?nübirlik', 'günübirlik'),
  (123, 'G?nübirlik', 'Günübirlik'),
  (124, '?ezlonglar', 'Şezlonglar'),
  (125, '&Ouml;?ren', '&Ouml;ğren'),
  (126, 'almaktad?r', 'almaktadır'),
  (127, 'ayr?l??tan', 'ayrılıştan'),
  (128, 'donat?lm??', 'donatılmış'),
  (129, 'edilmi?tir', 'edilmiştir'),
  (130, 'fırsatlar?', 'fırsatları'),
  (131, 'g&uuml;ne?', 'g&uuml;neş'),
  (132, 'kar??lamak', 'karşılamak'),
  (133, 'kullan??l?', 'kullanışlı'),
  (134, 'kullanmay?', 'kullanmayı'),
  (135, 'oldu?undan', 'olduğundan'),
  (136, 'sa?layacak', 'sağlayacak'),
  (137, 'taraf?ndan', 'tarafından'),
  (138, 'Taraf?ndan', 'Tarafından'),
  (139, 'tasarlanm?', 'tasarlanmı'),
  (140, 'tutkunlar?', 'tutkunları'),
  (141, 'villam?z?n', 'villamızın'),
  (142, 'Villam?z?n', 'Villamızın'),
  (143, 'villam?zda', 'villamızda'),
  (144, 'villamız?n', 'villamızın'),
  (145, 'Villamız?n', 'Villamızın'),
  (146, 'yaşaman?z?', 'yaşamanızı'),
  (147, 'donan?ml?', 'donanımlı'),
  (148, 'donanıml?', 'donanımlı'),
  (149, 'donan?mlı', 'donanımlı'),
  (150, 'denizk?y?', 'denizkıyı'),
  (151, 'denizkıy?', 'denizkıyı'),
  (152, 'denizk?yı', 'denizkıyı'),
  (153, '&ouml;?le', '&ouml;ğle'),
  (154, '&Ouml;?le', '&Ouml;ğle'),
  (155, 'alt?ndaki', 'altındaki'),
  (156, 'aylar?nda', 'aylarında'),
  (157, 'Ba?lang??', 'Başlangıç'),
  (158, 'buzdolab?', 'buzdolabı'),
  (159, 'civar?nda', 'civarında'),
  (160, 'd??ar?dan', 'dışarıdan'),
  (161, 'detaylar?', 'detayları'),
  (162, 'Detaylar?', 'Detayları'),
  (163, 'ileti?ime', 'iletişime'),
  (164, 'iste?iniz', 'isteğiniz'),
  (165, 'kat?l?mc?', 'katılımcı'),
  (166, 'Kat?l?mc?', 'Katılımcı'),
  (167, 'kenar?nda', 'kenarında'),
  (168, 'korunakl?', 'korunaklı'),
  (169, 'korunmas?', 'korunması'),
  (170, 'kullan?m?', 'kullanımı'),
  (171, 'kurallar?', 'kuralları'),
  (172, 'maceran?z', 'maceranız'),
  (173, 'Maceran?z', 'Maceranız'),
  (174, 'manzaral?', 'manzaralı'),
  (175, 'Manzaral?', 'Manzaralı'),
  (176, 'manzaras?', 'manzarası'),
  (177, 'noktalar?', 'noktaları'),
  (178, 'olacakt?r', 'olacaktır'),
  (179, 'olacaktir', 'olacaktır'),
  (180, 's?ras?nda', 'sırasında'),
  (181, 'sa?larken', 'sağlarken'),
  (182, 'Sakl?kent', 'Saklıkent'),
  (183, 'sıcakl???', 'sıcaklığı'),
  (184, 'sigortas?', 'sigortası'),
  (185, 'Sigortas?', 'Sigortası'),
  (186, 'temizli?i', 'temizliği'),
  (187, 'villam?za', 'villamıza'),
  (188, 'yap?la?ma', 'yapılaşma'),
  (189, 'yap?ld???', 'yapıldığı'),
  (190, 'm?stakil', 'müstakil'),
  (191, 'M?stakil', 'Müstakil'),
  (192, 'M?STAKİL', 'MÜSTAKİL'),
  (193, '?zerinde', 'üzerinde'),
  (194, 'a?ıklama', 'açıklama'),
  (195, 'A?ıklama', 'Açıklama'),
  (196, 'A?IKLAMA', 'AÇIKLAMA'),
  (197, '?l?deniz', 'Ölüdeniz'),
  (198, '?lm??t?r', 'ılmıştır'),
  (199, '?renmeye', 'ğrenmeye'),
  (200, '?slamlar', 'İslamlar'),
  (201, 'anlam?na', 'anlamına'),
  (202, 'aras?nda', 'arasında'),
  (203, 'ard?ndan', 'ardından'),
  (204, 'ba?ar?l?', 'başarılı'),
  (205, 'Ba?l?yor', 'Başlıyor'),
  (206, 'Ba?lang?', 'Başlangı'),
  (207, 'ba?layan', 'başlayan'),
  (208, 'bay?nd?r', 'bayındır'),
  (209, 'Bay?nd?r', 'Bayındır'),
  (210, 'de?ildir', 'değildir'),
  (211, 'doyas?ya', 'doyasıya'),
  (212, 'edilmi? ', 'edilmiş '),
  (213, 'foto?raf', 'fotoğraf'),
  (214, 'Foto?raf', 'Fotoğraf'),
  (215, 'gruplar?', 'grupları'),
  (216, 'hakk?nda', 'hakkında'),
  (217, 'haz?rlan', 'hazırlan'),
  (218, 'ilmi?tir', 'ilmiştir'),
  (219, 'K?z?lta?', 'Kızıltaş'),
  (220, 'kar??la?', 'karşılaş'),
  (221, 'kolayd?r', 'kolaydır'),
  (222, 'kurslar?', 'kursları'),
  (223, 'Kurslar?', 'Kursları'),
  (224, 'lar?n?zı', 'larınızı'),
  (225, 'ler?n?zı', 'lerinizi'),
  (226, 'makinas?', 'makinası'),
  (227, 'muhte?em', 'muhteşem'),
  (228, 'Muhte?em', 'Muhteşem'),
  (229, 'oldu?unu', 'olduğunu'),
  (230, 'olmad???', 'olmadığı'),
  (231, 'sa?lan?r', 'sağlanır'),
  (232, 'sal?ncak', 'salıncak'),
  (233, 'seçilmi?', 'seçilmiş'),
  (234, 'sporlar?', 'sporları'),
  (235, 'Sporlar?', 'Sporları'),
  (236, 'tasar?m?', 'tasarımı'),
  (237, 'teras?na', 'terasına'),
  (238, 'tti?inde', 'ttiğinde'),
  (239, 'uzakl???', 'uzaklığı'),
  (240, 'Villa ?n', 'Villa İn'),
  (241, 'villad?r', 'villadır'),
  (242, 'villam?z', 'villamız'),
  (243, 'Villam?z', 'Villamız'),
  (244, 'yakla??k', 'yaklaşık'),
  (245, 'Yakla??k', 'Yaklaşık'),
  (246, 'yap?lm??', 'yapılmış'),
  (247, 'yapman?z', 'yapmanız'),
  (248, 'yard?mc?', 'yardımcı'),
  (249, 'alıcıs?', 'alıcısı'),
  (250, 'Alıcıs?', 'Alıcısı'),
  (251, 'ALICIS?', 'ALICISI'),
  (252, 'mutfa??', 'mutfağı'),
  (253, 'Mutfa??', 'Mutfağı'),
  (254, 'g?rünüm', 'görünüm'),
  (255, 'G?rünüm', 'Görünüm'),
  (256, 'pop?ler', 'popüler'),
  (257, 'Pop?ler', 'Popüler'),
  (258, 'POP?LER', 'POPÜLER'),
  (259, 'barbek?', 'barbekü'),
  (260, 'Barbek?', 'Barbekü'),
  (261, 'BARBEK?', 'BARBEKÜ'),
  (262, '?zellik', 'özellik'),
  (263, '?ZELLİK', 'ÖZELLİK'),
  (264, '?emsiye', 'şemsiye'),
  (265, '?ezlong', 'şezlong'),
  (266, 'Ka??''?n', 'Kaş''ın'),
  (267, 'Ka??''ın', 'Kaş''ın'),
  (268, 'duyar?z', 'duyarız'),
  (269, 'DUYAR?Z', 'DUYARIZ'),
  (270, '?ekilde', 'şekilde'),
  (271, '?emsiye', 'Şemsiye'),
  (272, '?ezlong', 'Şezlong'),
  (273, '?imizde', 'ımızde'),
  (274, '?norkel', 'şnorkel'),
  (275, 'Adalar?', 'Adaları'),
  (276, 'arkada?', 'arkadaş'),
  (277, 'ayr?lma', 'ayrılma'),
  (278, 'ba?lang', 'başlang'),
  (279, 'bir ?ey', 'bir şey'),
  (280, 'bula??k', 'bulaşık'),
  (281, 'Bulvar?', 'Bulvarı'),
  (282, 'detayl?', 'detaylı'),
  (283, 'di?imiz', 'diğimiz'),
  (284, 'di?inde', 'diğinde'),
  (285, 'Do?an?n', 'Doğanın'),
  (286, 'do?anın', 'doğanın'),
  (287, 'e?itmen', 'eğitmen'),
  (288, 'e?lence', 'eğlence'),
  (289, 'E?lence', 'Eğlence'),
  (290, 'edilmi?', 'edilmiş'),
  (291, 'fırsat?', 'fırsatı'),
  (292, 'Gelemi?', 'Gelemiş'),
  (293, 'giri?te', 'girişte'),
  (294, 'her ?ey', 'her şey'),
  (295, 'in?aas?', 'inşaası'),
  (296, 'K?z?lta', 'Kızılta'),
  (297, 'Kaputa?', 'Kaputaş'),
  (298, 'Kayak?y', 'Kayaköy'),
  (299, 'ki?ilik', 'kişilik'),
  (300, 'ki?isel', 'kişisel'),
  (301, 'Ki?isel', 'Kişisel'),
  (302, 'kiral?k', 'kiralık'),
  (303, 'koylar?', 'koyları'),
  (304, 'lar?n?z', 'larınız'),
  (305, 'ler?n?z', 'leriniz'),
  (306, 'lm??t?r', 'lmıştır'),
  (307, 'merakl?', 'meraklı'),
  (308, 'noktas?', 'noktası'),
  (309, 'Odalar?', 'Odaları'),
  (310, 'plaj?na', 'plajına'),
  (311, 'sak?nma', 'sakınma'),
  (312, 'sonras?', 'sonrası'),
  (313, 'sundu?u', 'sunduğu'),
  (314, 'T?rkiye', 'Türkiye'),
  (315, 'Tahanc?', 'Tahancı'),
  (316, 'tonlar?', 'tonları'),
  (317, 'turlar?', 'turları'),
  (318, 'Turlar?', 'Turları'),
  (319, 'uzakl?k', 'uzaklık'),
  (320, 'villas?', 'villası'),
  (321, 'Villas?', 'Villası'),
  (322, 'y?l?nda', 'yılında'),
  (323, 'ya?amak', 'yaşamak'),
  (324, 'yan?nda', 'yanında'),
  (325, 'yap?l?r', 'yapılır'),
  (326, 'Yap?l?r', 'Yapılır'),
  (327, 'yap?lan', 'yapılan'),
  (328, 'yap?lm?', 'yapılmı'),
  (329, 'g?nlük', 'günlük'),
  (330, 'G?nlük', 'Günlük'),
  (331, 'g?rsel', 'görsel'),
  (332, 'G?rsel', 'Görsel'),
  (333, '?nemli', 'önemli'),
  (334, '?NEMLİ', 'ÖNEMLİ'),
  (335, 'i?erik', 'içerik'),
  (336, 'İ?erik', 'İçerik'),
  (337, 'd??arı', 'dışarı'),
  (338, 'D??arı', 'Dışarı'),
  (339, 'D??ARI', 'DIŞARI'),
  (340, 'd??ar?', 'dışarı'),
  (341, '?eviri', 'çeviri'),
  (342, '?EVİRİ', 'ÇEVİRİ'),
  (343, '?irket', 'şirket'),
  (344, '?İRKET', 'ŞİRKET'),
  (345, '?imşek', 'şimşek'),
  (346, '?im?ek', 'şimşek'),
  (347, 'şim?ek', 'şimşek'),
  (348, '?İMŞEK', 'ŞİMŞEK'),
  (349, '?İM?EK', 'ŞİMŞEK'),
  (350, 'Kaş''?n', 'Kaş''ın'),
  (351, 'Kaş''?N', 'Kaş''ın'),
  (352, 'KAŞ''?N', 'KAŞ''IN'),
  (353, 'Ka?''?n', 'Kaş''ın'),
  (354, 'f?rsat', 'fırsat'),
  (355, 'F?rsat', 'Fırsat'),
  (356, 'F?RSAT', 'FIRSAT'),
  (357, '?avd?r', 'Çavdır'),
  (358, '?i?e?i', 'Çiçeği'),
  (359, '?im?ek', 'Şimşek'),
  (360, '?imiz ', 'ımız '),
  (361, 'an?lar', 'anılar'),
  (362, 'aynas?', 'aynası'),
  (363, 'ayr?ca', 'ayrıca'),
  (364, 'Ayr?ca', 'Ayrıca'),
  (365, 'ba?lar', 'başlar'),
  (366, 'bak?m?', 'bakımı'),
  (367, 'Bak?m?', 'Bakımı'),
  (368, 'balay?', 'balayı'),
  (369, 'Balay?', 'Balayı'),
  (370, 'd?şar?', 'dışarı'),
  (371, 'Dalış?', 'Dalışı'),
  (372, 'do?as?', 'doğası'),
  (373, 'dolab?', 'dolabı'),
  (374, 'e?itim', 'eğitim'),
  (375, 'E?itim', 'Eğitim'),
  (376, 'e?li?i', 'eşliği'),
  (377, 'f?rsat', 'fırsat'),
  (378, 'farkl?', 'farklı'),
  (379, 'her?ey', 'her şey'),
  (380, 'ilmi? ', 'ilmiş '),
  (381, 'imkan?', 'imkanı'),
  (382, 'k?l?f?', 'kılıfı'),
  (383, 'Ka?''?n', 'Kaş''ın'),
  (384, 'Kaş''?n', 'Kaş''ın'),
  (385, 'kaya??', 'kayaşı'),
  (386, 'ke?fet', 'keşfet'),
  (387, 'lar?n?', 'larını'),
  (388, 'ler?n?', 'lerini'),
  (389, 'li?ini', 'liğini'),
  (390, 'Liman?', 'Limanı'),
  (391, 'm??t?r', 'mıştır'),
  (392, 'm?şt?r', 'mıştır'),
  (393, 'masas?', 'masası'),
  (394, 'molas?', 'molası'),
  (395, 'n?şt?r', 'mıştır'),
  (396, 'ola?an', 'olağan'),
  (397, 'oldu?u', 'olduğu'),
  (398, 'olmas?', 'olması'),
  (399, 'Ovac?k', 'Ovacık'),
  (400, 'r?nda ', 'rında '),
  (401, 'r?nda,', 'rında,'),
  (402, 'r?nda.', 'rında.'),
  (403, 'ra?men', 'rağmen'),
  (404, 's?rada', 'sırada'),
  (405, 'sa?da ', 'sağda '),
  (406, 'sa?l?k', 'sağlık'),
  (407, 'sa?lam', 'sağlam'),
  (408, 'sa?lar', 'sağlar'),
  (409, 'say?s?', 'sayısı'),
  (410, 'Say?s?', 'Sayısı'),
  (411, 'sualt?', 'sualtı'),
  (412, 'sular?', 'suları'),
  (413, 'tad?n?', 'tadını'),
  (414, 'tak?m?', 'takımı'),
  (415, 'Teras?', 'Terası'),
  (416, 'ula??m', 'ulaşım'),
  (417, 'Ula??m', 'Ulaşım'),
  (418, 'vard?r', 'vardır'),
  (419, 'y?ld?z', 'yıldız'),
  (420, 'yap?da', 'yapıda'),
  (421, 'yast?k', 'yastık'),
  (422, 'Ye?ilk', 'Yeşilk'),
  (423, 'yele?i', 'yeleği'),
  (424, 'yeme?i', 'yemeği'),
  (425, 'Yeme?i', 'Yemeği'),
  (426, 'yukar?', 'yukarı'),
  (427, 'g?zel', 'güzel'),
  (428, 'G?zel', 'Güzel'),
  (429, 'G?ZEL', 'GÜZEL'),
  (430, 'g?neş', 'güneş'),
  (431, 'G?neş', 'Güneş'),
  (432, 'G?NEŞ', 'GÜNEŞ'),
  (433, 'g?ne?', 'güneş'),
  (434, '?cret', 'ücret'),
  (435, '?CRET', 'ÜCRET'),
  (436, '?zere', 'üzere'),
  (437, '?rnek', 'örnek'),
  (438, '?RNEK', 'ÖRNEK'),
  (439, 'ö?ren', 'öğren'),
  (440, 'Ö?ren', 'Öğren'),
  (441, 'Ö?REN', 'ÖĞREN'),
  (442, '??ren', 'öğren'),
  (443, 'ç?k??', 'çıkış'),
  (444, 'Ç?k??', 'Çıkış'),
  (445, 'Ç?KI?', 'ÇIKIŞ'),
  (446, 'ÇIKI?', 'ÇIKIŞ'),
  (447, 'd?şün', 'düşün'),
  (448, 'D?şün', 'Düşün'),
  (449, 'D?Ş?N', 'DÜŞÜN'),
  (450, 'bah?e', 'bahçe'),
  (451, 'Bah?e', 'Bahçe'),
  (452, 'BAH?E', 'BAHÇE'),
  (453, '?ocuk', 'çocuk'),
  (454, '?OCUK', 'ÇOCUK'),
  (455, '?alış', 'çalış'),
  (456, 'çal?ş', 'çalış'),
  (457, '?AL?Ş', 'ÇALIŞ'),
  (458, '?ehir', 'şehir'),
  (459, '?EHİR', 'ŞEHİR'),
  (460, 'kaç?ş', 'kaçış'),
  (461, 'Kaç?ş', 'Kaçış'),
  (462, 'KAÇ?Ş', 'KAÇIŞ'),
  (463, '?al??', 'Çalış'),
  (464, '?ehir', 'Şehir'),
  (465, '?irin', 'Şirin'),
  (466, '?leri', 'İleri'),
  (467, '?n?z ', 'ınız '),
  (468, '?n?z,', 'ınız,'),
  (469, '?n?z.', 'ınız.'),
  (470, '?n?zı', 'ınızı'),
  (471, '?nda ', 'ında '),
  (472, '?nda.', 'ında.'),
  (473, '?nın ', 'ının '),
  (474, '?ster', 'İster'),
  (475, '''?na ', '''ına '),
  (476, '''?nın', '''ının'),
  (477, 'a?a??', 'aşağı'),
  (478, 'Adas?', 'Adası'),
  (479, 'al?? ', 'alış '),
  (480, 'al?c?', 'alıcı'),
  (481, 'alan?', 'alanı'),
  (482, 'ba?l?', 'bağlı'),
  (483, 'Ba?l?', 'Bağlı'),
  (484, 'Bak?m', 'Bakım'),
  (485, 'bal?k', 'balık'),
  (486, 'Cal??', 'Çalış'),
  (487, 'canl?', 'canlı'),
  (488, 'ç?k??', 'çıkış'),
  (489, 'Ç?k??', 'Çıkış'),
  (490, 'dal??', 'dalış'),
  (491, 'Dal??', 'Dalış'),
  (492, 'dalg?', 'dalgı'),
  (493, 'de?il', 'değil'),
  (494, 'di?i ', 'diği '),
  (495, 'do?al', 'doğal'),
  (496, 'do?ru', 'doğru'),
  (497, 'e?li?', 'eşli'),
  (498, 'e?siz', 'eşsiz'),
  (499, 'E?siz', 'Eşsiz'),
  (500, 'f?r?n', 'fırın'),
  (501, 'geni?', 'geniş'),
  (502, 'Geni?', 'Geniş'),
  (503, 'giri?', 'giriş'),
  (504, 'Giri?', 'Giriş'),
  (505, 'k?r?k', 'kırık'),
  (506, 'K?sem', 'Kösem'),
  (507, 'kat?l', 'katıl'),
  (508, 'kay?p', 'kayıp'),
  (509, 'Ke?if', 'Keşif'),
  (510, 'li?i ', 'liği '),
  (511, 'li?i,', 'liği,'),
  (512, 'li?i.', 'liği.'),
  (513, 'May?s', 'Mayıs'),
  (514, 'Mu?la', 'Muğla'),
  (515, 'n?nda', 'nında'),
  (516, 'nas?l', 'nasıl'),
  (517, 'Nas?l', 'Nasıl'),
  (518, 'odal?', 'odalı'),
  (519, 'Odal?', 'Odalı'),
  (520, 'odas?', 'odası'),
  (521, 'Odas?', 'Odası'),
  (522, 'olu?u', 'oluşu'),
  (523, 'Plaj?', 'Plajı'),
  (524, 's?cak', 'sıcak'),
  (525, 's?nda', 'sında'),
  (526, 's?ra ', 'sıra '),
  (527, 'S?sla', 'Sısla'),
  (528, 'tan??', 'tanı'),
  (529, 'tan?r', 'tanır'),
  (530, 'y?l?n', 'yılın'),
  (531, 'yak?n', 'yakın'),
  (532, 'Yak?n', 'Yakın'),
  (533, 'yan? ', 'yanı '),
  (534, 'Yap?l', 'Yapıl'),
  (535, 'ye?il', 'yeşil'),
  (536, 'Ye?il', 'Yeşil'),
  (537, '?lke', 'ülke'),
  (538, '?LKE', 'ÜLKE'),
  (539, '?rün', 'ürün'),
  (540, '?RÜN', 'ÜRÜN'),
  (541, 'ö?le', 'öğle'),
  (542, 'Ö?le', 'Öğle'),
  (543, 'Ö?LE', 'ÖĞLE'),
  (544, '??le', 'öğle'),
  (545, '??LE', 'ÖĞLE'),
  (546, 'i?in', 'için'),
  (547, 'İ?in', 'İçin'),
  (548, 'İ?İN', 'İÇİN'),
  (549, '??k ', 'şık '),
  (550, '??k,', 'şık,'),
  (551, '??k.', 'şık.'),
  (552, '??k;', 'şık;'),
  (553, '??k!', 'şık!'),
  (554, '??k)', 'şık)'),
  (555, '(??k', '(şık'),
  (556, '??K ', 'ŞIK '),
  (557, '??k ', 'şık '),
  (558, '??k,', 'şık,'),
  (559, '??k.', 'şık.'),
  (560, '??te', 'İşte'),
  (561, '?ato', 'Şato'),
  (562, '?ay?', 'Çayı'),
  (563, '?ey ', 'şey '),
  (564, '?eye', 'şeye'),
  (565, '?n? ', 'ını '),
  (566, '?nı ', 'ını '),
  (567, '''?n ', '''ın '),
  (568, '''?nı', '''ını'),
  (569, '''n?n', '''nın'),
  (570, 'ad?m', 'adım'),
  (571, 'alt?', 'altı'),
  (572, 'ayn?', 'aynı'),
  (573, 'ç?k?', 'çıkı'),
  (574, 'Ç?k?', 'Çıkı'),
  (575, 'd?r ', 'dır '),
  (576, 'd?r.', 'dır.'),
  (577, 'do?a', 'doğa'),
  (578, 'Do?a', 'Doğa'),
  (579, 'e?er', 'eğer'),
  (580, 'E?er', 'Eğer'),
  (581, 'Fo?a', 'Foça'),
  (582, 'in?a', 'inşa'),
  (583, 'k?sa', 'kısa'),
  (584, 'ki?i', 'kişi'),
  (585, 'n?n ', 'nın '),
  (586, 'pay?', 'payı'),
  (587, 'S?la', 'Sıla'),
  (588, 's?rt', 'sırt'),
  (589, 'ş?n ', 'şın '),
  (590, 't?r ', 'tır '),
  (591, 't?r,', 'tır,'),
  (592, 't?r.', 'tır.'),
  (593, 'ya?a', 'yaşa'),
  (594, 'z?n ', 'zın '),
  (595, 'z?n,', 'zın,'),
  (596, 'z?n.', 'zın.'),
  (597, '?ki', 'İki'),
  (598, '?lk', 'İlk'),
  (599, 'd??', 'dış'),
  (600, 'h?z', 'hız'),
  (601, 'H?z', 'Hız'),
  (602, 'Ka?', 'Kaş'),
  (603, 'ya?', 'yaş'),
  (604, 'Ya?', 'Yaş');

CREATE OR REPLACE FUNCTION pg_temp.repair_listing_turkish_ascii(input_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text := input_text;
  pair_row record;
BEGIN
  IF input_text IS NULL OR position('?' IN input_text) = 0 THEN
    RETURN input_text;
  END IF;

  FOR pair_row IN
    SELECT broken, fixed
    FROM _turkish_ascii_repair_pairs
    ORDER BY ord
  LOOP
    IF position(pair_row.broken IN result_text) > 0 THEN
      result_text := replace(result_text, pair_row.broken, pair_row.fixed);
    END IF;
  END LOOP;

  result_text := regexp_replace(result_text, '(^|[^[:alpha:]])\?zel', '\1özel', 'g');
  result_text := regexp_replace(result_text, '(^|[^[:alpha:]])\?ZEL', '\1ÖZEL', 'g');

  RETURN result_text;
END;
$$;

-- 1) Bravo olanak / dahil / hariç etiketleri
UPDATE listing_attributes la
SET value_json = (
  CASE
    WHEN jsonb_typeof(la.value_json) = 'object' THEN
      la.value_json
      || jsonb_strip_nulls(jsonb_build_object(
           'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(la.value_json->>'label', ''))), ''),
           'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(la.value_json->>'name', ''))), '')
         ))
    ELSE la.value_json
  END
)
WHERE la.group_code IN ('imported_amenity', 'imported_included', 'imported_excluded')
  AND (
    coalesce(la.value_json->>'label', '') LIKE '%?%'
    OR coalesce(la.value_json->>'name', '') LIKE '%?%'
  );

-- 2) İptal metni + havuz etiketi
UPDATE listings
SET
  cancellation_policy_text = pg_temp.repair_listing_turkish_ascii(cancellation_policy_text),
  pool_size_label = nullif(trim(pg_temp.repair_listing_turkish_ascii(pool_size_label)), ''),
  updated_at = now()
WHERE coalesce(cancellation_policy_text, '') LIKE '%?%'
   OR coalesce(pool_size_label, '') LIKE '%?%';

-- 3) nearby_pois_json — title/summary/name/address/label
WITH poi_src AS (
  SELECT
    l.ctid AS row_ctid,
    l.nearby_pois_json AS pois
  FROM listings l
  WHERE jsonb_typeof(l.nearby_pois_json) = 'array'
    AND l.nearby_pois_json::text LIKE '%?%'
),
poi_fixed AS (
  SELECT
    s.row_ctid,
    s.pois,
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem || jsonb_strip_nulls(jsonb_build_object(
              'title', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'title', ''))), ''),
              'summary', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'summary', ''))), ''),
              'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'name', ''))), ''),
              'address', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'address', ''))), ''),
              'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'label', ''))), '')
            ))
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(s.pois) WITH ORDINALITY AS t(elem, ord)
    ) AS new_pois
  FROM poi_src s
)
UPDATE listings l
SET
  nearby_pois_json = f.new_pois,
  updated_at = now()
FROM poi_fixed f
WHERE l.ctid = f.row_ctid
  AND f.new_pois IS NOT NULL
  AND f.new_pois IS DISTINCT FROM f.pois;

-- 4) amenities_pois_json / transport_pois_json label
WITH amenity_src AS (
  SELECT l.ctid AS row_ctid, l.amenities_pois_json AS pois
  FROM listings l
  WHERE jsonb_typeof(l.amenities_pois_json) = 'array'
    AND l.amenities_pois_json::text LIKE '%?%'
),
amenity_fixed AS (
  SELECT
    s.row_ctid,
    s.pois,
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem || jsonb_strip_nulls(jsonb_build_object(
              'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'label', ''))), ''),
              'title', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'title', ''))), ''),
              'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'name', ''))), '')
            ))
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(s.pois) WITH ORDINALITY AS t(elem, ord)
    ) AS new_pois
  FROM amenity_src s
)
UPDATE listings l
SET
  amenities_pois_json = f.new_pois,
  updated_at = now()
FROM amenity_fixed f
WHERE l.ctid = f.row_ctid
  AND f.new_pois IS NOT NULL
  AND f.new_pois IS DISTINCT FROM f.pois;

WITH transport_src AS (
  SELECT l.ctid AS row_ctid, l.transport_pois_json AS pois
  FROM listings l
  WHERE jsonb_typeof(l.transport_pois_json) = 'array'
    AND l.transport_pois_json::text LIKE '%?%'
),
transport_fixed AS (
  SELECT
    s.row_ctid,
    s.pois,
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem || jsonb_strip_nulls(jsonb_build_object(
              'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'label', ''))), ''),
              'title', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'title', ''))), ''),
              'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'name', ''))), '')
            ))
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(s.pois) WITH ORDINALITY AS t(elem, ord)
    ) AS new_pois
  FROM transport_src s
)
UPDATE listings l
SET
  transport_pois_json = f.new_pois,
  updated_at = now()
FROM transport_fixed f
WHERE l.ctid = f.row_ctid
  AND f.new_pois IS NOT NULL
  AND f.new_pois IS DISTINCT FROM f.pois;

-- 5) listing_meta owner_residence_address
UPDATE listing_attributes la
SET value_json = la.value_json
  || jsonb_strip_nulls(jsonb_build_object(
       'owner_residence_address',
       nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(la.value_json->>'owner_residence_address', ''))), '')
     ))
WHERE la.group_code = 'listing_meta'
  AND la.key = 'v1'
  AND coalesce(la.value_json->>'owner_residence_address', '') LIKE '%?%';

-- 6) Otel oda adları
UPDATE hotel_rooms
SET name = nullif(trim(pg_temp.repair_listing_turkish_ascii(name)), '')
WHERE coalesce(name, '') LIKE '%?%';

-- 7) vertical_hotel JSON (şartlar / tesis / SSS)
UPDATE listing_attributes
SET value_json = pg_temp.repair_listing_turkish_ascii(value_json::text)::jsonb
WHERE group_code = 'vertical_hotel'
  AND key = 'v1'
  AND value_json::text LIKE '%?%';

COMMIT;
