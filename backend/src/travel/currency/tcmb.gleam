//// TCMB günlük kur — today.xml ayrıştırma (1 birim yabancı para = X TRY).
//// string:split OTP 26+'da strict UTF-8 doğrulaması yaptığı için Türkçe
//// içerikli XML'i bölemeyebilir. Bu nedenle parse işlemi Erlang'ın
//// encoding-bağımsız binary:split kullanan backend_ffi_http:parse_tcmb_xml/1
//// fonksiyonuna devredilmiştir.

/// Erlang FFI: binary:split ile TCMB XML'ini ayrıştır ve
/// `[{Kod, Rate}]` döndür. Encoding-bağımsız çalışır.
@external(erlang, "backend_ffi_http", "parse_tcmb_xml")
pub fn parse_today_xml(body: String) -> List(#(String, Float))

pub const tcmb_today_xml_url: String =
  "https://www.tcmb.gov.tr/kurlar/today.xml"
