# Proje Kuralları

## Aktarılan içerik standardı

- Her dış sağlayıcı, XML/API, toplu aktarım ve backfill işleminde ziyaretçiye gösterilen ham içerik doğrudan yayımlanamaz.
- Önce Türkçe başlık, açıklama ve diğer ziyaretçi metinleri Türkçe yazım, noktalama ve SEO kurallarına göre editoryal olarak düzenlenir.
- Ardından her aktif vitrin dili için ayrı başlık, açıklama, SEO metni ve ziyaretçiye gösterilen detay metinleri üretilir. Bir dildeki metni başka dil alanına kopyalamak çeviri kabul edilmez.
- Açıklamalar tek parça düz metin olamaz. Kısa paragraflar, anlamlı bölüm başlıkları ve uygun listelerle kolay okunur semantik HTML kullanılmalıdır.
- Oda/pansiyon tipi, olanak, konum, program, dahil-hariç hizmetler, kurallar ve önemli bilgiler hedef dilde doğal biçimde yazılmalıdır.
- Özel adlar ile fiyat, tarih, kapasite, ölçü, rota, konum ve hizmet gerçekleri korunur; eksik bilgi uydurulmaz.
- Anahtar kelimeler doğal kullanılmalı; tekrar, anahtar kelime doldurma, bozuk karakter, görünür HTML entity ve otomatik çeviri hissi bırakılmamalıdır.
- Bu standart uygulanmadan aktarım işi tamamlanmış veya yayına hazır sayılmaz.

## Otel içerik ve medya kalite kapısı

- Otel açıklaması; Türkçe editoryal sürüm ve tüm aktif vitrin dilleri tamamlanmadan yayına hazır sayılmaz. Her dil ayrı, doğal, SEO ve yazım kurallarına uygun semantik HTML olmalıdır.
- Giriş/çıkış saatleri, ön ödeme, iptal, evcil hayvan ve tesis kuralları açıklama, SSS, genel şartlar veya önemli notlarda tekrar edemez. Bu bilgiler yalnızca yapılandırılmış **Kurallar** bölümünde bir kez gösterilir.
- Sağlayıcının sunduğu tüm geçerli otel görselleri galeriye alınır. Tek görsel veya görselsiz kayıt `media_incomplete` kabul edilir; başka tesise ait ya da tahmini görsel kullanılamaz.
- Sağlayıcının oda görselleri oda tipine güvenli biçimde eşleştirilir. Oda adı/caption eşleşmeyen lobi, havuz, restoran gibi görseller oda görseli olarak atanamaz.
- Otel aktarımı ve yeniden zenginleştirme işlemleri; dil sayısı, galeri görseli, oda sayısı ve görselli oda sayısını raporlamalıdır. Eksik kayıtlar tekrar çalıştırılabilir kalite onarımına alınır.

## Cursor Cloud specific instructions

Monorepo: `backend/` (Gleam/Erlang HTTP API, port 8080) + `frontend/` (Next.js 16, port 3000) + PostgreSQL. The update script installs/refreshes toolchains; the notes below are the non-obvious runtime caveats.

### Runtime versions (critical)
- **Erlang/OTP must be 26+** (this repo uses OTP 29 to match CI). OTP 25 builds fine but crashes at request time with `Erlang OTP/26 or higher is required to use base64:encode` (every API request → HTTP 500). The apt `erlang` package on Ubuntu is OTP 25 — do NOT rely on it. OTP 29.0.1 is installed to `/opt/otp-29` with its binaries symlinked into `/usr/local/bin` (ahead of apt's `/usr/bin`).
- **rebar3 must match the active OTP.** Gleam shells out to `rebar3` to compile Erlang deps; the apt `rebar3` (3.19, built for OTP 25) fails to load on OTP 29. A current rebar3 escript is installed at `/usr/local/bin/rebar3`.
- **Node must be 25** (`frontend/package.json` engines `>=25.0.0`). `nvm use 25` is not enough because `/exec-daemon/node` (v22) is ahead in PATH. Start the frontend with Node 25 explicitly prepended: `export PATH="$HOME/.nvm/versions/node/v25.9.0/bin:$PATH"`. `npm ci` works on v22 (engine check is only a warning), but run the dev server on 25.

### Database
- Local PostgreSQL 16; DB name `travel`, user `postgres`, no password. `pg_hba.conf` is set to `trust` for `127.0.0.1/32` and `::1/128` (dev only) so the API's TCP connection (`PGHOST=127.0.0.1`) works without a password. Start it with `sudo service postgresql start` (no systemd).
- Apply schema: `cd backend/priv/sql && PGHOST=127.0.0.1 PGUSER=postgres PGDATABASE=travel ./run_all.sh`. Seed a dev admin (`admin@travel.local` / `TravelAdmin2026!`): `psql -h 127.0.0.1 -U postgres -d travel -f dev_seed_admin_user.sql`.
- **Known broken migration:** `modules/330_holiday_home_theme_pool_jacuzzi.sql` inserts into a `facet` column that `category_theme_items` never gets (created in `239`, never altered). `run_all.sh` uses `ON_ERROR_STOP=1` and halts there. Only that one module fails (holiday-home pool/jacuzzi theme labels); everything else applies. To finish the run, skip 330 or run without `ON_ERROR_STOP`. This is a pre-existing repo bug — do not "fix" it by editing old migrations.

### Running services
- Backend: `cd backend`, load env with `set -a && . ./backend.env && set +a`, then `gleam run` (listens on `:8080`). `backend.env` is gitignored; copy from `backend.env.example` with local PG values. App logs go to stdout (locally); in production they go to `/var/log/travel-api.log`, not journald.
- Frontend: `cd frontend && npm run dev` with Node 25 on PATH (see above). `.env.local` (gitignored) needs at least `NEXT_PUBLIC_API_URL=http://127.0.0.1:8080` and `INTERNAL_API_ORIGIN=http://127.0.0.1:8080`. First page compile in dev takes ~20s (webpack); subsequent requests are fast.

### Lint / test
- Frontend lint: `npm run lint` (`eslint .`) — the repo currently has pre-existing errors/warnings across the whole tree; the pre-commit hook only lints changed files, so a full-tree run failing is expected and not caused by setup.
- Frontend tests: `npm run test:contracts` and `npm run test:page-builder` (vitest).
- Backend: `cd backend && gleam build` / `gleam test`. `parampos_test` has one pre-existing base64-padding assertion failure unrelated to environment setup.
