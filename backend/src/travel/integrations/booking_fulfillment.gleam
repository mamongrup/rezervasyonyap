//// Ödeme sonrası tedarikçi API rezervasyonları — kategori/sağlayıcıya göre dağıtım.

import pog
import travel/integrations/turna_flight_booking_sync
import travel/integrations/yolcu360_car_booking_sync

/// Paratika / PayTR ödeme yakalandıktan sonra çalışır (idempotent).
pub fn fulfill_after_payment(
  conn: pog.Connection,
  reservation_id: String,
) -> Nil {
  turna_flight_booking_sync.fulfill_after_payment(conn, reservation_id)
  yolcu360_car_booking_sync.fulfill_after_payment(conn, reservation_id)
  Nil
}
