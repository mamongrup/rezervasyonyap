# Ajan / geliştirici hızlı referans

Bu dosya **yeni oturumlarda** ortak bağlamı tek yerde toplar. Ayrıntılı kurallar: `.cursor/rules/` (özellikle `00-project-overview.mdc`, `50-workflow.mdc`, `51-rezervasyonyap-production.mdc`). Domain özeti: `deploy/DOMAIN.md`.

---

## GitHub

- **Uzak repo:** `https://github.com/mamongrup/rezervasyonyap.git`
- Yerelde `git remote -v` ile doğrulayın.

---

## Domain ve üretim

| Ne | Değer |
|----|--------|
| Canlı vitrin (Next.js) | **rezervasyonyap.tr** |
| Deploy / Git kökü (Plesk) | `/var/www/vhosts/rezervasyonyap.tr/httpdocs` |
| Next çalışma dizini | `…/httpdocs/frontend` (`travel-web.service` `WorkingDirectory` ile aynı olmalı) |
| Systemd | `travel-web.service` (Next, genelde `127.0.0.1:3000`), `travel-api.service` (Gleam API) |
| Frontend env (sunucu) | `/etc/rezervasyonyap/frontend.env` |

**Önemli:** `NEXT_PUBLIC_*` değiştiyse sunucuda `frontend` içinde **yeniden build** + `travel-web` restart gerekir. `NEXT_PUBLIC_API_URL` üretimde loopback olmamalı.

---

## Üretim deploy (tek komut örneği)

SSH ile sunucuda, **deploy kökünden**:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
chmod +x deploy/deploy.sh deploy/verify.sh
DEPLOY_REF=main ./deploy/deploy.sh
```

Dal veya tag için `DEPLOY_REF=` değerini değiştirin (ör. `cursor/some-branch`). İsteğe bağlı doğrulama: `./deploy/verify.sh` — yavaş kalkıyorsa `deploy/verify.sh` başındaki `WEB_READY_*` değişkenlerine bakın.

**SQL migration (üretim):** `deploy/apply-sql.sh` — `travel-api` ile aynı `/etc/rezervasyonyap/backend.env` üzerinden `psql` çalıştırır; `psql -U postgres` ile şifre uyuşmazlığından kaçının (`deploy/DEPLOY_CHECKLIST.md` §8). **282→283→284 paketi** (görsel kalite + konum backfill) için aynı dosyada §8 altındaki blok.

---

## Yerel build / doğrulama

| Parça | Komut (CWD) |
|--------|-------------|
| Backend (Gleam) | `cd backend` → `gleam build` |
| Frontend (TypeScript) | `cd frontend` → `npx tsc --noEmit` |
| Frontend (production bundle) | `cd frontend` → `npm run build` |

Ortak iş akışı: backend dokunuşu → `gleam build`; frontend dokunuşu → ilgili dosyalarda lint/tsc (proje `.cursor/rules` içinde özetli).

---

## Proje yapısı (kısa)

- **`backend/`** — Gleam HTTP API; router: `backend/src/backend/router.gleam`; domain modülleri `backend/src/travel/…`.
- **`frontend/`** — Next.js App Router; istemci/sunucu API sarma: `frontend/src/lib/travel-api.ts`.
- **DB** — PostgreSQL; migration’lar `backend/priv/sql/modules/NNN_*.sql`, sıra: `backend/priv/sql/install_order.txt`.

---

## Yerel DB (Windows / Laragon örneği)

```powershell
& "C:\laragon\bin\postgresql\postgresql\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d travel -f backend\priv\sql\modules\<migration>.sql
```

---

## Teşhis (üretim, kısa)

```bash
systemctl status travel-web.service --no-pager -l
journalctl -u travel-web.service -n 120 --no-pager
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

Tablo ve sık senaryolar: `.cursor/rules/51-rezervasyonyap-production.mdc`.
