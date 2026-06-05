# backend

[![Package Version](https://img.shields.io/hexpm/v/backend)](https://hex.pm/packages/backend)
[![Hex Docs](https://img.shields.io/badge/hex-docs-ffaff3)](https://hexdocs.pm/backend/)

```sh
gleam add backend@1
```
```gleam
import backend

pub fn main() {
  // TODO: An example of the project in use
}
```

Further documentation can be found at <https://hexdocs.pm/backend>.

## Development

### Windows / Laragon (yerel öncelik)

```powershell
# Bir kerelik
.\scripts\setup-local-windows.ps1

# backend\backend.env → TURNA_API_KEY (ve gerekirse PG*)
# Terminal 1
.\scripts\start-travel-api.ps1

# Terminal 2
.\scripts\start-frontend.ps1
```

Gereksinimler: **Erlang OTP 26**, **rebar3** (`scripts\bin`), **Gleam**, Laragon PostgreSQL (`travel` DB).

```sh
gleam run   # backend.env ortam değişkenleri yüklüyken
gleam test
```
