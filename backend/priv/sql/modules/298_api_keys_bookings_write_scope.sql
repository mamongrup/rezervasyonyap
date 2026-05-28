-- 298_api_keys_bookings_write_scope.sql
-- Mevcut Partner API anahtarlarına bookings.write kapsamını ekle (yoksa).

UPDATE api_keys
SET scopes = array_append(scopes, 'bookings.write')
WHERE NOT ('bookings.write' = ANY(scopes));

UPDATE api_keys
SET scopes = array_append(scopes, 'listings.read')
WHERE NOT ('listings.read' = ANY(scopes));

UPDATE api_keys
SET scopes = array_append(scopes, 'reservations.read')
WHERE NOT ('reservations.read' = ANY(scopes));
