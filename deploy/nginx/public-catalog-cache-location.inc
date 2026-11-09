# Include only in the API proxy location; preserve inherited security headers.
proxy_cache travel_public_catalog;
proxy_cache_key "public-catalog-v1|$host|$http_x_forwarded_host|$uri|$is_args$args|$http_accept_language";
proxy_cache_bypass $travel_catalog_private $travel_catalog_route_skip $travel_catalog_query_skip;
proxy_no_cache $travel_catalog_private $travel_catalog_route_skip $travel_catalog_query_skip $upstream_http_set_cookie;
proxy_cache_valid 200 30s;
proxy_cache_methods GET HEAD;
proxy_cache_lock on;
proxy_cache_lock_timeout 20s;
proxy_cache_lock_age 20s;
proxy_cache_use_stale off;
# Public catalogue JSON is bounded by the TTL; Set-Cookie remains uncacheable.
proxy_ignore_headers Cache-Control Expires;
