# ParamPOS 3D Secure kurulumu

Bu entegrasyon iframe kullanmaz. Kart formu RezervasyonYap üzerinde gösterilir;
backend `TP_WMD_UCD` ile 3D doğrulamayı başlatır ve doğrulanmış dönüşten sonra
`TP_WMD_Pay` ile tahsilatı tamamlar. PAN/CVC veritabanına veya uygulama loguna yazılmaz.

## Panel ayarları

`Yönetim > Finans > Sanal POS` sayfasında ParamPOS'u açıp şu değerleri girin:

- Terminal No (`CLIENT_CODE`)
- Web Servis Kullanıcı Adı (`CLIENT_USERNAME`)
- Web Servis Kullanıcı Şifresi (`CLIENT_PASSWORD`)
- Anahtar (`GUID`)
- Test veya Canlı modu

## Param paneli

Canlı sunucunun sabit çıkış IP adresini Param İşyerim panelindeki
`Entegrasyon Bilgilerim > IP Adresi` bölümüne ekleyin. Param servisi IP izin
listesinde olmayan çağrıları reddeder.

Callback adresi backend tarafından otomatik oluşturulur:

`$API_PUBLIC_URL/api/v1/integrations/parampos/return`

`API_PUBLIC_URL` dışarıdan erişilebilir HTTPS API origin'i olmalıdır.

## Güvenlik ve başarı şartları

- `islemHash`, Param'ın SHA1/Base64 formülüyle backend'de doğrulanır.
- Yalnız `mdStatus` 1-4 için `TP_WMD_Pay` çağrılır.
- `Sonuc > 0`, `Dekont_ID` dolu ve `Banka_Sonuc_Kod = 0` birlikte sağlanmadan ödeme kaydedilmez.
- Aynı rezervasyon için ikinci `captured` ödeme oluşturulmaz.
- ParamPOS yalnız aktif ödeme sağlayıcısı olduğunda başlatma endpoint'i çalışır.
