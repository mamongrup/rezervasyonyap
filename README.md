# rezervasyonyap

Geliştirici / agent notları: **`AGENT_SOHBETLERI_TEK_CATI.md`**, dönem özeti: **`HANDOFF_BU_ASAMA.md`**, yol haritası: **`docs/V2_MASTER_ROADMAP.md`**.

Deploy adimlari ve production checklist: **`deploy/DEPLOY_CHECKLIST.md`**.
Deploy sonrasi tek komut dogrulama: **`deploy/verify.sh`**.
Production tek komut deploy: **`DEPLOY_REF=stable/b92d735 ./deploy/deploy.sh`**.
Windows'tan uzaktan deploy: **`powershell -ExecutionPolicy Bypass -File .\scripts\deploy-server.ps1 -Server <sunucu_ip> -User <kullanici> -Ref main`**.