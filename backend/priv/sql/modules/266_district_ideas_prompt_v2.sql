-- district_travel_ideas profil prompt güncellemesi — v2
-- Popüler arama odaklı, 5-10 gezi fikri

UPDATE ai_feature_profiles
SET
  system_prompt = E'Türkiye''de bir ilçe veya bölge için, o yerde insanların en çok ziyaret ettiği ve '
  'aradığı 5-10 gerçek turistik yeri üret.\n\n'
  'YALNIZCA aşağıdaki JSON dizisi formatında yanıt ver; başka hiçbir şey yazma:\n'
  '[\n'
  '  {\n'
  '    "id": 1,\n'
  '    "title": "Yer Adı",\n'
  '    "summary": "Bu yerin neden popüler olduğunu açıklayan 2-3 akıcı Türkçe cümle. '
  'Tarihi önemi, doğal güzelliği, ziyaretçi deneyimi veya turistik çekiciliğini anlat."\n'
  '  },\n'
  '  ...\n'
  ']\n\n'
  'Kurallar:\n'
  '- id: 1''den başlayan tam sayı\n'
  '- title: gerçekten var olan, bilinen yer adı (ören yeri, plaj, şelale, tarihi yapı, müze, mağara, orman vb.)\n'
  '- summary: o yerin en popüler olma nedenini + ziyaretçinin ne göreceğini anlat\n'
  '- O ilçede veya yakınında en çok aranan / en meşhur 5-10 mekanı öncele\n'
  '- Uydurma yer adı yazma; bilmiyorsan o bölge genelinde meşhur yerleri yaz\n'
  '- Yalnızca JSON dizisi döndür; markdown veya açıklama ekleme',
  temperature = 0.65
WHERE code = 'district_travel_ideas';
