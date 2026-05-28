//// Partner API — OpenAPI 3.0 özet şema (kimlik doğrulama gerektirmez).

import backend/context.{type Context}
import gleam/http
import gleam/json
import wisp.{type Request, type Response}

fn bearer_security() -> json.Json {
  json.array(
    [json.object([#("bearerAuth", json.array([], of: json.string))])],
    of: fn(x) { x },
  )
}

fn path_get(path: String, summary: String, secured: Bool) -> #(
  String,
  json.Json,
) {
  let fields = [
    #("summary", json.string(summary)),
    ..case secured {
      True -> [#("security", bearer_security())]
      False -> []
    }
  ]
  #(path, json.object([#("get", json.object(fields))]))
}

fn path_post(path: String, summary: String) -> #(String, json.Json) {
  #(
    path,
    json.object([
      #(
        "post",
        json.object([
          #("summary", json.string(summary)),
          #("security", bearer_security()),
        ]),
      ),
    ]),
  )
}

fn path_delete(path: String, summary: String) -> #(String, json.Json) {
  #(
    path,
    json.object([
      #(
        "delete",
        json.object([
          #("summary", json.string(summary)),
          #("security", bearer_security()),
        ]),
      ),
    ]),
  )
}

fn listing_subpath(suffix: String, summary: String) -> #(String, json.Json) {
  path_get(
    "/api/v1/agent/catalog/listings/{id}/" <> suffix,
    summary,
    True,
  )
}

/// GET /api/v1/agent/openapi.json
pub fn openapi(req: Request, _ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  let paths =
    json.object([
      path_get("/api/v1/agent/me", "API anahtarı doğrulama + kapsamlar", True),
      path_get("/api/v1/agent/openapi.json", "Bu OpenAPI şeması", False),
      path_get("/api/v1/agent/catalog/categories", "Desteklenen dikeyler", True),
      #(
        "/api/v1/agent/catalog/search",
        json.object([
          #(
            "get",
            json.object([
              #("summary", json.string("İlan arama (vitrin filtreleri)")),
              #("security", bearer_security()),
              #(
                "parameters",
                json.array(
                  [
                    json.object([
                      #("name", json.string("category_code")),
                      #("in", json.string("query")),
                      #("required", json.bool(True)),
                      #(
                        "schema",
                        json.object([
                          #(
                            "enum",
                            json.array(
                              ["hotel", "holiday_home", "yacht_charter", "activity"],
                              of: json.string,
                            ),
                          ),
                        ]),
                      ),
                    ]),
                  ],
                  of: fn(x) { x },
                ),
              ),
            ]),
          ),
        ]),
      ),
      path_get("/api/v1/agent/catalog/listings/{id}", "İlan detayı", True),
      listing_subpath("availability-calendar", "Müsaitlik takvimi"),
      listing_subpath("images", "Galeri görselleri"),
      listing_subpath("meal-plans", "Pansiyon planları"),
      listing_subpath("price-rules", "Fiyat kuralları"),
      listing_subpath("price-lines", "Fiyat satırları"),
      listing_subpath("accommodation-rules", "Konaklama kuralları"),
      listing_subpath("bedrooms", "Yatak odaları"),
      listing_subpath("activity-sessions", "Aktivite seansları"),
      path_post(
        "/api/v1/agent/catalog/listings/{id}/activity-quote",
        "Aktivite fiyat teklifi",
      ),
      path_post(
        "/api/v1/agent/catalog/listings/{id}/stay-quote",
        "Konaklama fiyat teklifi (otel / tatil evi / yat)",
      ),
      #(
        "/api/v1/agent/bookings",
        json.object([
          #(
            "post",
            json.object([
              #("summary", json.string("Rezervasyon oluştur (held)")),
              #("security", bearer_security()),
            ]),
          ),
          #(
            "get",
            json.object([
              #("summary", json.string("Rezervasyon listesi")),
              #("security", bearer_security()),
            ]),
          ),
        ]),
      ),
      path_get(
        "/api/v1/agent/bookings/{public_code}",
        "Rezervasyon durumu",
        True,
      ),
      path_delete(
        "/api/v1/agent/bookings/{public_code}",
        "Rezervasyon iptali (held/inquiry, ödeme yok)",
      ),
      path_get("/api/v1/agent/reservations", "Acente rezervasyon listesi", True),
      path_get("/api/v1/agent/sales-summary", "Satış özeti", True),
    ])
  let body =
    json.object([
      #("openapi", json.string("3.0.3")),
      #(
        "info",
        json.object([
          #("title", json.string("RezervasyonYap Partner API")),
          #("version", json.string("1.1.0")),
          #(
            "description",
            json.string(
              "Otel, tatil evi, yat ve aktivite — vitrin envanteri ile aynı kaynak. "
              <> "Kimlik: Authorization: Bearer trk_live_… · Rate limit: 300/dk/kurum · "
              <> "Swagger UI: /developer/swagger",
            ),
          ),
        ]),
      ),
      #(
        "servers",
        json.array(
          [
            json.object([
              #("url", json.string("https://rezervasyonyap.tr")),
              #("description", json.string("Üretim")),
            ]),
            json.object([
              #("url", json.string("http://127.0.0.1:8080")),
              #("description", json.string("Yerel API")),
            ]),
          ],
          of: fn(x) { x },
        ),
      ),
      #(
        "components",
        json.object([
          #(
            "securitySchemes",
            json.object([
              #(
                "bearerAuth",
                json.object([
                  #("type", json.string("http")),
                  #("scheme", json.string("bearer")),
                  #(
                    "description",
                    json.string("Acente panelinden oluşturulan trk_live_ API anahtarı"),
                  ),
                ]),
              ),
            ]),
          ),
        ]),
      ),
      #("paths", paths),
    ])
    |> json.to_string
  wisp.json_response(body, 200)
}
