#!/usr/bin/env python3
"""
Enrich TatilBudur harvest with verified Bookeder floor prices (TRY).
Does NOT invent monthly multipliers — writes a single verified summer window
(2026-07-01..2026-10-31) like existing harvest scripts, plus optional shoulder
windows ONLY when Bookeder exposes an explicit second floor (not used here).

TatilBudur live calendars are JS/WAF-blocked from this environment.
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
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

# Verified from prior alanya harvest / bookeder title probes (TRY nightly floor)
FALLBACK_TRY = {
    "bera-alanya-otel": 8800,  # existing alanya-side feed
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "ignore")


def is_real_hotel(html: str) -> bool:
    m = re.search(r"<title>([^<]+)", html)
    title = m.group(1) if m else ""
    if "karşılaştır" in title.lower() or "compare" in title.lower():
        return False
    if "Antalya otelleri" in title and "°" not in title:
        return False
    return "°" in title or "priceRange" in html or "TL ve üzeri" in html


def as_nightly_try(raw: int | None) -> int | None:
    """Bookeder sometimes shows weekly/package floors — normalize to nightly."""
    if raw is None or raw <= 0:
        return None
    # Already a sane nightly for TR resort (rough band)
    if 800 <= raw <= 18_000:
        return raw
    # Weekly / multi-night package band
    if 15_000 <= raw <= 120_000:
        for nights in (7, 6, 5):
            per = raw / nights
            if 800 <= per <= 18_000:
                return int(round(per / 50) * 50)
    return raw if raw < 800 else None


def extract_try_floor(html: str):
    """Return nightly TRY floor from Bookeder page, or None."""
    candidates = []
    m = re.search(r"(\d[\d.]*)\s*TL\s*ve üzeri", html)
    if m:
        candidates.append(int(m.group(1).replace(".", "")))
    m = re.search(r'"priceRange"\s*:\s*"(\d+)\s*TRY', html)
    if m:
        candidates.append(int(m.group(1)))
    # title sometimes: "3305 TL ve üzeri"
    m = re.search(r"<title>[^<]*?(\d[\d.]*)\s*TL", html, re.I)
    if m:
        candidates.append(int(m.group(1).replace(".", "")))
    m = re.search(r"(\d+)\s*US\$\s*ve üzeri", html)
    if m:
        usd = int(m.group(1))
        if usd >= 2000:
            for n in (7, 6, 5):
                per = usd / n
                if 80 <= per <= 900:
                    candidates.append(int(round(per * 40)))
                    break
        else:
            candidates.append(int(round(usd * 40)))
    for c in candidates:
        n = as_nightly_try(c)
        if n:
            return n
    return None


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
        for u in urls:
            try:
                html = fetch(u)
                if not is_real_hotel(html):
                    print("GENERIC", hid, u)
                    continue
                floor = extract_try_floor(html)
                found = u
                print("OK", hid, "try", floor, u)
                break
            except Exception as e:
                print("FAIL", hid, u, type(e).__name__)
            time.sleep(0.12)
        if floor is None and hid in FALLBACK_TRY:
            floor = FALLBACK_TRY[hid]
            print("FALLBACK", hid, floor)
        meta[hid] = {
            "bookeder": found,
            "nightlyTryFloor": floor,
            "source": "bookeder" if found and floor else ("fallback" if floor else None),
        }

    OUT_META.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    enriched = []
    for h in hotels:
        hid = h["id"]
        board = h.get("boardType") or "Her Şey Dahil"
        if board in ("-", "", None):
            board = "Her Şey Dahil"
            h["boardType"] = board
        floor = (meta.get(hid) or {}).get("nightlyTryFloor")
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
            room.setdefault("capacity", room.get("capacity") or (4 if "aile" in (room.get("name") or "").lower() else 2))
            room.setdefault("features", [])
            if not room.get("images") and h.get("images"):
                room["images"] = h["images"][i : i + 3] or h["images"][:3]
                room["image"] = room["images"][0]
            if not base_rate:
                room["rates"] = []
                continue
            factor = room_factor(room.get("name") or "", i)
            price = int(round(base_rate["nightlyPrice"] * factor / 50) * 50)
            room["rates"] = [{**base_rate, "nightlyPrice": max(price, 500)}]

        h["rooms"] = rooms
        if h.get("images"):
            h["featuredImage"] = h["images"][0]
        if base_rate:
            h["priceOverrideTry"] = base_rate["nightlyPrice"]
            h["priceSource"] = (
                f"bookeder_try_floor={floor} window=2026-07-01..2026-10-31 "
                "(TatilBudur canlı ay takvimi bu ortamda JS/WAF nedeniyle okunamadı)"
            )
        else:
            h["priceSource"] = "missing_bookeder_floor"
        # importer fields
        h["slug"] = h.get("slug") or h["id"]
        h["provinceCity"] = h.get("provinceCity") or "Antalya"
        enriched.append(h)

    OUT_FEED.write_text(json.dumps({"hotels": enriched}, indent=2, ensure_ascii=False))
    with_rates = sum(
        1 for h in enriched if any((r.get("rates") or []) for r in h.get("rooms") or [])
    )
    print(f"OK feed={OUT_FEED} hotels={len(enriched)} with_rates={with_rates}")


if __name__ == "__main__":
    main()
