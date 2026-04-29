# rezervasyonyap

Geliştirici / agent notları: **`AGENT_SOHBETLERI_TEK_CATI.md`**, dönem özeti: **`HANDOFF_BU_ASAMA.md`**, yol haritası: **`docs/V2_MASTER_ROADMAP.md`**.

Deploy adimlari ve production checklist: **`deploy/DEPLOY_CHECKLIST.md`**.
**Üretim vitrin domain:** **`deploy/DOMAIN.md`** (rezervasyonyap.tr).
Deploy sonrasi tek komut dogrulama: **`deploy/verify.sh`**.
Plesk vitrin (yalnız frontend): **`deploy/PLESK_VITRIN.md`**. Monorepo deploy: **`./deploy/deploy.sh`** (varsayılan `DEPLOY_REF=main`; eski sabit: `DEPLOY_REF=stable/b92d735`). Frontend derleme doğrulaması: **GitHub Actions** — `.github/workflows/frontend-ci.yml`.
Windows'tan uzaktan deploy: **`powershell -ExecutionPolicy Bypass -File .\scripts\deploy-server.ps1 -Server <sunucu_ip> -User <kullanici> -Ref main`**.