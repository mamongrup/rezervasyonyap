-- Haftalık: ölü satır birikimi yüksek tablolarda VACUUM + ANALYZE.
-- FULL kullanılmaz (exclusive lock / uzun kesinti olmaz).
-- Disk I/O için idle zamanında (timer Nice/IOSchedulingClass=idle) çalıştırın.

\set ON_ERROR_STOP on

\echo '=== vacuum_heavy_tables ==='

VACUUM (VERBOSE) listing_images;
VACUUM (VERBOSE) listing_attributes;
VACUUM (VERBOSE) hotel_room_availability_calendar;
VACUUM (VERBOSE) listing_availability_calendar;
VACUUM (VERBOSE) hotel_rooms;
VACUUM (VERBOSE) listings;
VACUUM (VERBOSE) ai_work_item_steps;

ANALYZE listing_images;
ANALYZE listing_attributes;
ANALYZE hotel_room_availability_calendar;
ANALYZE listing_availability_calendar;
ANALYZE hotel_rooms;
ANALYZE listings;

\echo 'vacuum_heavy_tables done'
