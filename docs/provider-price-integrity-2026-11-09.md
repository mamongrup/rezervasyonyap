# Provider price integrity — 2026-11-09

The legacy site keeps imported listings separate from local listings. Provider outages do not authorize a stale or unverified sale price.

- Kplus/Travelrobot uses net plus 15 percent, once. Hotel nightly totals are divided by the verified stay length, never by guest count. Unknown historical commission markers require a new source quote before publishing their old prices.
- WTatil tour prices are adult per-person amounts for a complete departure. Child prices and ambiguous search totals cannot set the advertised minimum. Dates use Europe/Istanbul and must have valid future inventory.
- A missing WTatil listing is held only after a successful complete catalogue lookup and a successful direct-ID confirmation. Malformed responses, pagination failures, timeouts and rate limits are errors, not withdrawal evidence.
- A withdrawn supplier listing stays draft with no price. The database prevents accidental republishing. Supplier price freshness is limited to 36 hours.
- Admin manual tour prices are gross sale amounts keyed by departure ID in vertical_tour/v1.manual_period_sale_prices. They survive supplier refreshes. Clearing a price restores the latest supplier amount. Currency must match the listing. Changes are audited.
- Kplus hotel refreshes preserve manual price rules. Verified no-price searches disable only provider meal-plan prices and provider rules, with a private recovery snapshot. Fresh successful quotes reactivate provider meal plans. API errors remain distinct from no inventory.
- Supplier requests are serialized, time limited and retry only read-safe calls. Retry-After is respected, including cooldown after the final rate-limit response. Sync failures are reported as failures and do not stop independent listings from being checked.
- Preserve the Kplus image proxy for Hotelbeds assets; decoding it to a direct Hotelbeds URL can produce 403. The image gateway converts successful source images to deduplicated Bunny AVIF objects.

Validation includes 24 Node regression tests, a rolled-back WTatil price contract under the application database role, and a rolled-back Kplus hotel contract proving manual-rule preservation, stale-price removal and successful reactivation. Frontend acceptance requires a successful production build and browser verification of the deployed editor.

Operational deployment evidence and repeatable commands:

- Backend shipment was exported with rebar3 3.28.0 / OTP 29 and deployed with an automatic health rollback. Exported shell entrypoints must put the shebang first; restore default SELinux labels after copying to /opt. The active API passed its health check.
- The sampled Hotelbeds image is delivered as AVIF through the image gateway. Versioned gateway sources are in deploy/runtime; the existing service installs these under /root and reads credentials from private files. No credential is included in these sources.
- Anonymous catalogue browsing uses deploy/nginx/public-catalog-cache-http.conf and public-catalog-cache-location.inc. The HTTP configuration is installed under /etc/nginx/conf.d/00-travel-public-catalog-cache.conf; the location include is /etc/nginx/bunny/public-catalog-cache.inc, referenced by the existing supplier JSON filter. Cache storage is limited to 128 MiB. Cookie, authentication, tenant/currency context headers and unknown query parameters bypass it. Date and guest/stock queries are outside the allowlist. Existing security headers are inherited without adding location-level add_header directives.
- Sample external catalogue requests fell from 10–13 seconds to 0.35–0.57 seconds on repeat requests; a repeated loopback request took approximately 1 ms. A date-filtered request was not stored. These are sampled API timings, not a full-page performance benchmark.
- 738 historical published Kplus hotel prices lacking a verified 15 percent marker were held with recovery snapshots; the follow-up query found zero remaining unverified published prices in that scope. Fresh hotel quotes recover their prices through the repair worker.
- Production builds must exclude uploaded media from their private build filesystem view. deploy/scripts/build-frontend-candidate.sh creates a transient systemd build with BindReadOnlyPaths for public/uploads; the host media directory stays available to serving/upload workers. The namespace probe saw zero media entries while the host saw six top-level media directories. This avoids repeatedly scanning listing photos. It does not delete or move media.
- The frontend candidate is accepted only after a successful build, a canary response, deployed editor verification and comparison with the recorded source hashes.

## Verified production release, 2026-11-09 evening

- travel-web now loads NEXT_BUILD_DIR=.next-provider-pricing-20261109. Canary and production health checks passed; the previous build and frontend environment snapshot remain available for rollback. The temporary canary was stopped after acceptance.
- The live WTatil editor shows provider/reference, freshness, applied markup and departure-specific per-person gross overrides. A published tour (10875) displayed EUR 803.85 and editable departure inputs. The withdrawn tour 11578 correctly has no saleable departures.
- All five visible room images on Kplus sample 509e88cb-f8a5-405d-b8bf-27659bd385be loaded with positive natural dimensions, including the Hotelbeds image through the Bunny gateway.
- Replaced the nested period/price-row scan with a grouped SQL calculation. Old/new prices matched for all 2696 existing tour-detail records (zero mismatches). Twelve price/editor regression tests passed again. Canonical withdrawal/freshness and write guards remain in place.
- Twelve published WTatil records without a current valid price were held as drafts in one transaction with recovery rows and a completion event under the private root evidence directory. Post-check: 362 published WTatil records, zero invalid current prices.
- Public tour list (limit=1) returned HTTP 200 in 5.599s after the SQL change, versus the prior 30s timeout; a repeat request returned HTTP 200 in 0.073s. These are sampled API timings, not a whole-site SLA.
- Kplus background repricing remains active. Historical holds are released only when a fresh valid supplier quote is obtained; completing the software release does not mean every supplier has returned stock or a quote.
