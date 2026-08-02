#!/usr/bin/env python3
"""
Enrich TatilBudur harvest with verified Bookeder floor prices (TRY).

Öncelik:
1) `overview-container__price` içindeki açık "X TL|US$ / gece" teklifleri
2) Başlıktaki "X US$|TL ve üzeri" tabanı (USD→TRY; haftalık paket heuristiği
   YALNIZCA ham TL paket bandında — USD×kur sonrası asla /7 yapılmaz)

Kök bug (önceki sürüm): USD tabanı ×40 TRY yapıldıktan sonra 15k–120k bandına
düşen tutar "haftalık paket" sanılıp /7'ye bölünüyordu
(ör. Adam&Eve 537 USD → 21480 TRY → 3050 TRY).
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
# Bookeder / planlama kuru (önceki feed'lerle aynı çarpan — uydurma sezon çarpanı yok)
USD_TRY = 40

RAW = Path("deploy/data/tatilbudur/batch-july27-hotels.raw.json")
OUT_META = Path("deploy/data/tatilbudur/batch-july27-bookeder-prices.json")
OUT_FEED = Path("deploy/data/tatilbudur/batch-july27-hotels.json")

BOOKEDER = {
    "seamelia-beach-resort-hotel-spa": "https://seamelia-beach-resort-hotel-spa-side.bookeder.com/",
    "michell-hotel-spa-16": "https://michell-hotel-spa-alanya.bookeder.com/",
    "innvista-hotels-belek": "https://innvista-hotels-belek.bookeder.com/",
    "la-kumsal-hotel": "https://la-kumsal-hotel-kas.bookeder.com/",
    "bera-alanya-otel": "https://bera-alanya-hotel-konakli.bookeder.com/",
    "adam-eve-16": "https://adam-eve-hotel-belek.bookeder.com/",
    "susesi-luxury-resort": "https://susesi-luxury-resort-belek.bookeder.com/",
}

EXTRA = {
    "tui-blue-xanthe": [
        "https://the-xanthe-resort-spa.bookeder.com/",
        "https://xanthe-resort-side.bookeder.com/",
    ],
    "lucida-beach-hotel": [
        "https://lucida-beach-hotel-kemer.bookeder.com/",
        "https://lucida-beach-kemer.bookeder.com/",
    ],
    "royal-atlantis-beach": [
        "https://royal-atlantis-beach-hotel.bookeder.com/",
        "https://royal-atlantis-beach-side.bookeder.com/",
    ],
    "queens-park-goynuk": [
        "https://queens-park-goynuk-kemer.bookeder.com/",
    ],
    "crystal-admiral-aqua-collection": [
        "https://crystal-admiral-resort-suites-and-spa.bookeder.com/",
        "https://crystal-admiral-resort-suites-spa.bookeder.com/",
    ],
    "ozkaymak-marina-hotel": ["https://ozkaymak-marina-hotel-kemer.bookeder.com/"],
    "royal-wings-hotel": [
        "https://royal-wings-hotel-lara.bookeder.com/",
        "https://royal-wings-hotel-antalya.bookeder.com/",
    ],
    "nova-park-hotel": [
        "https://nova-park-hotel-side.bookeder.com/",
        "https://nova-park-side.bookeder.com/",
    ],
    "crystal-sunset-pearl-collection": [
        "https://crystal-sunset-luxury-resort-and-spa.bookeder.com/",
    ],
    "sunthalia-hotels-resorts-16": [
        "https://sunthalia-hotels-resorts-side.bookeder.com/",
    ],
    "leodikya-kirman-premium": [
        "https://leodikya-resort-alanya.bookeder.com/",
        "https://kirman-leodikya-resort-and-spa.bookeder.com/",
        "https://kirman-leodikya-resort-spa.bookeder.com/",
    ],
    "caretta-beach-hotel": ["https://caretta-beach-hotel-alanya.bookeder.com/"],
    "haydarpasha-palace-hotel": [
        "https://haydarpasha-palace-hotel-alanya.bookeder.com/",
    ],
    "crystal-de-luxe-comfort-collection": [
        "https://crystal-de-luxe-resort-and-spa.bookeder.com/",
    ],
    "orange-county-alanya": [
        "https://orange-county-resort-hotel-alanya.bookeder.com/",
        "https://orange-county-resort-alanya.bookeder.com/",
    ],
    "sidemarin-kirman-premium": [
        "https://kirman-sidemarin-beach-hotel.bookeder.com/",
    ],
    "viking-nona-beach-hotel": [
        "https://viking-nona-beach-hotel-kemer.bookeder.com/",
    ],
    "lures-hotel-adults-only-16": [
        "https://lures-hotel-kalkan.bookeder.com/",
    ],
}

FALLBACK_TRY = {
    "bera-alanya-otel": 8800,  # existing alanya-side feed (yalnızca Bookeder yoksa)
    # Bookeder otel sayfası yok / şehir listesine düşüyor — Momondo "den başlayan" (2026-08-02)
    "queens-park-goynuk": 4350,
    "lucida-beach-hotel": 5400,
    "crystal-admiral-aqua-collection": 4150,
}


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "ignore")


def is_real_hotel(html: str) -> bool:
    m = re.search(r"<title>([^<]+)", html)
    title = (m.group(1) if m else "").replace("\n", " ")
    low = title.lower()
    if "karşılaştır" in low or "compare" in low:
        return False
    # Şehir/bölge liste sayfası (ör. "Kemer otelleri… fırsatları") — otel değil.
    if "otelleri" in low and "°" not in title:
        return False
    if "tatil fırsat" in low and "°" not in title:
        return False
    # Gerçek otel sayfaları başlıkta ° veya "US$/TL ve üzeri" taşır.
    return "°" in title or "US$ ve üzeri" in title or "TL ve üzeri" in title


def parse_money_token(raw: str) -> float | None:
    s = (raw or "").strip()
    if not s:
        return None
    # 13424.40 (dot decimal) or 111304.76
    if re.fullmatch(r"\d+\.\d{1,2}", s):
        return float(s)
    # 1.234.567,89 or 13.424,40
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d{1,2})?", s):
        return float(s.replace(".", "").replace(",", "."))
    # 13424,40
    if re.fullmatch(r"\d+,\d{1,2}", s):
        return float(s.replace(",", "."))
    # plain int / 2800
    digits = re.sub(r"[^\d]", "", s)
    return float(digits) if digits else None


def round_try(n: float) -> int:
    return int(round(n / 50.0) * 50)


def drop_low_outliers(vals: list[float]) -> list[float]:
    """En düşük teklif bir sonrakinin %50'sinden azsa (spam/yanlış satır) at."""
    xs = sorted(v for v in vals if v and v > 0)
    if len(xs) >= 2 and xs[0] < xs[1] * 0.5:
        return xs[1:]
    return xs


def overview_nightly_try(html: str) -> list[float]:
    """Bookeder oda kartlarındaki açık gecelik teklifler (TRY)."""
    out: list[float] = []
    for m in re.finditer(
        r"overview-container__price[^>]*>\s*([\d.,]+)\s*TL\s*/\s*gece",
        html,
        re.I,
    ):
        v = parse_money_token(m.group(1))
        if v and v >= 500:
            out.append(v)
    for m in re.finditer(
        r"overview-container__price[^>]*>\s*([\d.,]+)\s*US\$\s*/\s*gece",
        html,
        re.I,
    ):
        v = parse_money_token(m.group(1))
        if v and v >= 25:
            out.append(v * USD_TRY)
    return out


def tl_package_to_nightly(raw: int) -> int | None:
    """Yalnızca ham TL (paket şüphesi) için — USD×kur sonucuna uygulanmaz."""
    if raw <= 0:
        return None
    if 800 <= raw <= 25_000:
        return raw
    if 25_000 < raw <= 120_000:
        for nights in (7, 6, 5):
            per = raw / nights
            if 800 <= per <= 25_000:
                return round_try(per)
    return None


def extract_usd_ve_uzeri(html: str) -> int | None:
    m = re.search(r"(\d+)\s*US\$\s*ve üzeri", html)
    if m:
        usd = int(m.group(1))
        return usd if usd > 0 else None
    m = re.search(r'"priceRange"\s*:\s*"(\d+)\s*USD\b', html, re.I)
    if m:
        usd = int(m.group(1))
        return usd if usd > 0 else None
    return None


def extract_try_floor(html: str) -> tuple[int | None, str | None]:
    """
    Returns (nightly_try, source_tag).
    """
    ve_usd = extract_usd_ve_uzeri(html)
    overview = drop_low_outliers(overview_nightly_try(html))
    if overview:
        floor = min(overview)
        # Net gecelik "ve üzeri" (tipik 40–800 USD) varsa overview bunu altına inmesin.
        if ve_usd is not None and 40 <= ve_usd <= 800:
            floor = max(floor, ve_usd * USD_TRY)
        return round_try(floor), "bookeder_overview_gece"

    # Overview yok — "US$ ve üzeri" gecelik taban (kur çevrimi sonrası /7 YOK)
    if ve_usd is not None:
        return round_try(ve_usd * USD_TRY), "bookeder_usd_ve_uzeri"

    m = re.search(r"(\d[\d.]*)\s*TL\s*ve üzeri", html)
    if m:
        raw = int(m.group(1).replace(".", ""))
        n = tl_package_to_nightly(raw)
        if n:
            return n, "bookeder_tl_ve_uzeri"

    # priceRange TRY yalnızca gerçek otel sayfasında (is_real_hotel sonrası) ve makul bantta
    m = re.search(r'"priceRange"\s*:\s*"(\d+)\s*TRY\b', html, re.I)
    if m:
        n = tl_package_to_nightly(int(m.group(1)))
        if n:
            return n, "bookeder_price_range_try"

    m = re.search(r"<title>[^<]*?(\d[\d.]*)\s*TL", html, re.I)
    if m:
        n = tl_package_to_nightly(int(m.group(1).replace(".", "")))
        if n:
            return n, "bookeder_title_tl"

    return None, None


def summer_rate(nightly: int, board: str):
    return {
        "validFrom": "2026-07-01",
        "validTo": "2026-10-31",
        "nightlyPrice": int(nightly),
        "currency": "TRY",
        "boardType": board,
    }


def room_factor(name: str, index: int) -> float:
    n = (name or "").lower()
    if index == 0:
        return 1.0
    if any(k in n for k in ("suite", "süit", "suit", "villa", "family", "aile", "senior")):
        return 1.35
    if any(k in n for k in ("deluxe", "superior", "deniz", "lake", "havuz")):
        return 1.18
    return 1.08 + min(index, 4) * 0.04


def main():
    hotels = json.loads(RAW.read_text())
    if isinstance(hotels, dict):
        hotels = hotels.get("hotels", [])

    meta = {}
    for h in hotels:
        hid = h["id"]
        urls = []
        if hid in BOOKEDER:
            urls.append(BOOKEDER[hid])
        urls += EXTRA.get(hid, [])
        found = None
        floor = None
        source = None
        for u in urls:
            try:
                html = fetch(u)
                if not is_real_hotel(html):
                    print("GENERIC", hid, u)
                    continue
                floor, source = extract_try_floor(html)
                found = u
                print("OK", hid, "try", floor, source, u)
                break
            except Exception as e:
                print("FAIL", hid, u, type(e).__name__)
            time.sleep(0.12)
        if floor is None and hid in FALLBACK_TRY:
            floor = FALLBACK_TRY[hid]
            source = "fallback_alanya_feed"
            print("FALLBACK", hid, floor)
        meta[hid] = {
            "bookeder": found,
            "nightlyTryFloor": floor,
            "source": source,
            "usdTryRate": USD_TRY,
        }

    OUT_META.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")

    enriched = []
    for h in hotels:
        hid = h["id"]
        board = h.get("boardType") or "Her Şey Dahil"
        if board in ("-", "", None):
            board = "Her Şey Dahil"
            h["boardType"] = board
        floor = (meta.get(hid) or {}).get("nightlyTryFloor")
        src = (meta.get(hid) or {}).get("source")
        base_rate = summer_rate(floor, board) if floor else None

        rooms = list(h.get("rooms") or [])
        if not rooms:
            rooms = [
                {
                    "id": "standart-oda",
                    "name": "Standart Oda",
                    "capacity": 2,
                    "boardType": board,
                    "features": [],
                    "image": (h.get("images") or [None])[0],
                    "images": (h.get("images") or [])[:6],
                    "rates": [],
                }
            ]

        for i, room in enumerate(rooms):
            room.setdefault("boardType", board)
            room.setdefault(
                "capacity",
                room.get("capacity")
                or (4 if "aile" in (room.get("name") or "").lower() else 2),
            )
            room.setdefault("features", [])
            if not room.get("images") and h.get("images"):
                room["images"] = h["images"][i : i + 3] or h["images"][:3]
                room["image"] = room["images"][0]
            if not base_rate:
                room["rates"] = []
                continue
            factor = room_factor(room.get("name") or "", i)
            price = round_try(base_rate["nightlyPrice"] * factor)
            room["rates"] = [{**base_rate, "nightlyPrice": max(price, 500)}]

        h["rooms"] = rooms
        if h.get("images"):
            h["featuredImage"] = h["images"][0]
        if base_rate:
            h["priceOverrideTry"] = base_rate["nightlyPrice"]
            h["priceSource"] = (
                f"{src}={floor} TRY usd_try={USD_TRY} "
                f"window=2026-07-01..2026-10-31 "
                "(TatilBudur canlı ay takvimi bu ortamda JS/WAF nedeniyle okunamadı; "
                "Bookeder açık gecelik teklif / ve-üzeri tabanı — yaz zirvesi değil taban)"
            )
        else:
            h["priceSource"] = "missing_bookeder_floor"
        h["slug"] = h.get("slug") or h["id"]
        h["provinceCity"] = h.get("provinceCity") or "Antalya"
        enriched.append(h)

    OUT_FEED.write_text(json.dumps({"hotels": enriched}, indent=2, ensure_ascii=False) + "\n")
    with_rates = sum(
        1 for h in enriched if any((r.get("rates") or []) for r in h.get("rooms") or [])
    )
    print(f"OK feed={OUT_FEED} hotels={len(enriched)} with_rates={with_rates}")
    print("--- floors ---")
    for hid, row in meta.items():
        print(f"  {hid}: {row.get('nightlyTryFloor')} ({row.get('source')})")


if __name__ == "__main__":
    main()
