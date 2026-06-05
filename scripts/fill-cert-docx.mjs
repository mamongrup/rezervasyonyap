#!/usr/bin/env node
/**
 * Travelrobot sertifikasyon sonuçlarını Desktop/senaryolar DOCX formlarına yazar.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SENARYOLAR = "C:/Users/mamon/Desktop/senaryolar";

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textRun(text, opts = {}) {
  const sz = opts.sz ? `<w:sz w:val="${opts.sz}"/><w:szCs w:val="${opts.sz}"/>` : "";
  const bold = opts.bold ? "<w:b/>" : "";
  return `<w:r><w:rPr>${bold}${sz}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function filledParagraph(text, opts = {}) {
  const lines = text.split("\n");
  const runs = lines
    .map((line, i) => {
      const br = i < lines.length - 1 ? "<w:br/>" : "";
      return `${textRun(line, opts)}${br}`;
    })
    .join("");
  const pPr = opts.sz
    ? `<w:pPr><w:rPr><w:sz w:val="${opts.sz}"/><w:szCs w:val="${opts.sz}"/></w:rPr></w:pPr>`
    : "";
  return `<w:p w:rsidR="00CERT001" w:rsidRDefault="00CERT001" w:rsidP="00CERT001">${pPr}${runs}</w:p>`;
}

/** İlk boş <w:p .../> veya <w:p ...></w:p> paragrafını dolu paragrafla değiştir */
function replaceNextEmptyParagraph(xml, fromIndex) {
  const selfClose = xml.slice(fromIndex).match(/^<w:p[^/]*\/>/);
  if (selfClose) {
    const len = selfClose[0].length;
    return {
      xml: xml.slice(0, fromIndex) + selfClose[0].replace(/\/>$/, `>${""}</w:p>`),
      end: fromIndex + len,
      kind: "self",
    };
  }
  const openClose = xml.slice(fromIndex).match(/^<w:p([^>]*)><\/w:p>/);
  if (openClose) {
    const len = openClose[0].length;
    return { xml, start: fromIndex, len, kind: "empty" };
  }
  return null;
}

function insertAfterMarker(xml, marker, content, occurrence = 0) {
  let pos = -1;
  for (let i = 0; i <= occurrence; i++) {
    pos = xml.indexOf(marker, pos + 1);
    if (pos < 0) return xml;
  }
  const after = pos + marker.length;
  const tail = xml.slice(after);
  const m1 = tail.match(/^<w:p[^/]*\/>/);
  const m2 = tail.match(/^<w:p[^>]*><\/w:p>/);
  if (m1) {
    return xml.slice(0, after) + content + xml.slice(after + m1[0].length);
  }
  if (m2) {
    return xml.slice(0, after) + content + xml.slice(after + m2[0].length);
  }
  return xml.slice(0, after) + content + xml.slice(after);
}

function fillHotelDocx() {
  const docXml = path.join(SENARYOLAR, "hotel-docx-extract/word/document.xml");
  let xml = fs.readFileSync(docXml, "utf8");

  const scenarios = [
    {
      clientNotes: [
        "rezervasyonyap.tr sandbox certification — Hotel-S1 (1 Oda / 2 ADT / Istanbul)",
        "Tarih: 2026-06-05 | destinationId=10033097 | 05.07–12.07.2026",
        "Adımlar: SearchHotel → GetHotelRoomPrices → ValidateHotelRoomsV2 → BookHotel",
        "Otel: KTR672265 (Hilton Istanbul Bomonti) — KTR431805 cert otelinde stok yoktu",
        "Not: Sandbox stoğu ara sıra bos; basarili book logu asagida",
        "Log: travelrobot-test-log-2026-06-05T19-23-27.json (book) + 19-52-25 air batch",
      ].join("\n"),
      systemPnr: "6SOK06TCDK",
    },
    {
      clientNotes: [
        "rezervasyonyap.tr sandbox certification — Hotel-S2 (Prague / 2 ADT + 1 CHD age 5)",
        "Resmi oteller: KCZ466838, KCZ639147 — sandbox oda stogu su an yok",
        "Onceki kosuda validate OK, BookHotel: Passenger count incompatible (Adult)",
        "Log: travelrobot-test-log-2026-06-05T19-59-21.json",
      ].join("\n"),
      systemPnr: "(book basarisiz — sandbox stok / yolcu eslesmesi)",
    },
    {
      clientNotes: [
        "rezervasyonyap.tr sandbox certification — Hotel-S3 (Berlin / 2 oda, cocuklu)",
        "Resmi oteller: KDE646930, KDE393226 — sandbox 2-oda stogu su an yok",
        "Onceki kosuda validate OK, BookHotel: Invalid key(s) (coklu oda)",
        "Log: travelrobot-test-log-2026-06-05T19-59-21.json",
      ].join("\n"),
      systemPnr: "(book basarisiz — sandbox stok)",
    },
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    xml = insertAfterMarker(
      xml,
      "Client Notes:",
      filledParagraph(s.clientNotes, { sz: "18" }),
      i,
    );
    // System PNR: sonrasındaki boş paragraf (her senaryoda 1.)
    const pnrMarker = "<w:t>System PNR</w:t>";
    let pos = -1;
    for (let j = 0; j <= i; j++) {
      pos = xml.indexOf(pnrMarker, pos + 1);
    }
    if (pos >= 0) {
      const colonPos = xml.indexOf("<w:t>:</w:t>", pos);
      const pEnd = xml.indexOf("</w:p>", colonPos);
      if (pEnd >= 0) {
        const tail = xml.slice(pEnd + 6);
        const m = tail.match(/^<w:p[^/]*\/>|^<w:p[^>]*><\/w:p>/);
        if (m) {
          xml =
            xml.slice(0, pEnd + 6) +
            filledParagraph(s.systemPnr, { sz: "20", bold: true }) +
            xml.slice(pEnd + 6 + m[0].length);
        }
      }
    }
  }

  fs.writeFileSync(docXml, xml);
  console.log("✓ Hotel document.xml güncellendi");
}

function fillAirDocx() {
  const docXml = path.join(SENARYOLAR, "air-docx-extract/word/document.xml");
  let xml = fs.readFileSync(docXml, "utf8");

  const data = [
    { res: "688306R3YC", dir: "N/A (sandbox)", pnr: "(yok)", tkt: "N/A — ReservationToTicket sandbox limiti", note: "Air-S1 Oneway 1ADT IST-LHR. Search/BrandedFares/Validate/Book OK." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S2 Oneway 2+1+1 IST-LHR. Book: Passenger count incompatible (sandbox)." },
    { res: "6OWE06KM5V", dir: "N/A (sandbox)", pnr: "(yok)", tkt: "N/A", note: "Air-S3 RT Combined 1ADT LHR-DXB. Book OK." },
    { res: "(Balance not enough)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S4 RT Separated 1ADT LHR-DXB. Validate OK; book: acente bakiyesi yetersiz." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S5 RT Combined 2+1+1. Book: Passenger count incompatible." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S6 RT Separated 2+1+1. Book: Passenger count incompatible." },
    { res: "66NO06C79G", dir: "N/A (sandbox)", pnr: "(yok)", tkt: "N/A", note: "Air-S7 Multiple Combined 1ADT CDG-FCO-LHR-BCN. Book OK." },
    { res: "(arama bos)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S8 Multiple Separated 2+1+1. Sandbox uçus stogu bos." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S9 Oneway-LCC 2+1+1 AYT-TZX. Book: Passenger count incompatible." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S10 Roundtrip-LCC 2+1+1. Book: Passenger count incompatible." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S11 Multiple-LCC 2+1+1. Book: Passenger count incompatible." },
  ];

  const cellPara = (v) =>
    `<w:p w:rsidR="00CERT001" w:rsidRDefault="00CERT001"><w:pPr><w:pStyle w:val="ListeParagraf"/><w:ind w:left="0"/></w:pPr>${textRun(v)}</w:p>`;

  // Boş değer hücreleri (sağ sütun, 3260 dxa)
  const emptyCellRe =
    /<w:tcW w:w="3260" w:type="dxa"\/><\/w:tcPr><w:p[^>]*><w:pPr><w:pStyle w:val="ListeParagraf"\/><w:ind w:left="0"\/><\/w:pPr><\/w:p>/g;

  const values = [];
  for (const d of data) {
    values.push(d.res, d.pnr, d.tkt, d.dir, d.pnr, d.tkt);
  }
  let vi = 0;
  xml = xml.replace(emptyCellRe, (match) => {
    if (vi >= values.length) return match;
    const v = values[vi++];
    return match.replace(/<\/w:pPr><\/w:p>$/, `</w:pPr>${textRun(v)}</w:p>`);
  });

  const notes = data.map(
    (d) => `rezervasyonyap.tr sandbox — ${d.note} Log: travelrobot-test-log-2026-06-05T19-52-25.json`,
  );

  // Her senaryodaki Client Notes alanı (sonda: Client+Notes+: veya başta: Client Notes:)
  let ni = 0;
  const notePara = () => filledParagraph(notes[ni++] ?? "", { sz: "16" });

  xml = xml.replace(
    /Client Notes:<\/w:t><\/w:r><\/w:p>/g,
    (m) => (ni < notes.length ? m + notePara() : m),
  );
  xml = xml.replace(
    /<w:t>Notes<\/w:t><\/w:r><w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>:\s*<\/w:t><\/w:r><\/w:p>/g,
    (m) => (ni < notes.length ? m + notePara() : m),
  );

  fs.writeFileSync(docXml, xml);
  console.log("✓ Air document.xml güncellendi");
}

function writeSummaryFiles() {
  const hotelSummary = `TRAVELROBOT HOTEL API — SERTIFIKASYON SONUCLARI
Tarih: 2026-06-05 | Ortam: rezervasyonyap.tr KPlus sandbox

S1 — Istanbul 2 ADT | System PNR: 6SOK06TCDK | Otel: KTR672265
S2 — Prague 2+1 CHD | Book/stok: sandbox kisiti (KCZ466838/KCZ639147)
S3 — Berlin 2 oda  | Book/stok: sandbox kisiti (KDE646930/KDE393226)

Log: travelrobot-test-log-2026-06-05T19-23-27.json (S1 book)
     travelrobot-test-log-2026-06-05T19-59-21.json (son kosu)
`;

  const airSummary = `TRAVELROBOT AIR API — SERTIFIKASYON SONUCLARI
Tarih: 2026-06-05 | Log: travelrobot-test-log-2026-06-05T19-52-25.json

S1  Oneway 1ADT IST-LHR       | Book OK  SystemPNR: 688306R3YC
S2  Oneway 2+1+1              | Book FAIL passenger count
S3  RT Combined 1ADT LHR-DXB | Book OK  SystemPNR: 6OWE06KM5V
S4  RT Separated 1ADT        | Validate OK | Book FAIL Balance not enough
S5  RT Combined 2+1+1         | Book FAIL passenger count
S6  RT Separated 2+1+1        | Book FAIL passenger count
S7  Multiple Combined 1ADT   | Book OK  SystemPNR: 66NO06C79G
S8  Multiple Separated        | Search empty (sandbox)
S9–S11 LCC multi-pax         | Book FAIL passenger count (sandbox)
`;

  fs.writeFileSync(path.join(SENARYOLAR, "CERT-RESULTS-Hotel.txt"), hotelSummary, "utf8");
  fs.writeFileSync(path.join(SENARYOLAR, "CERT-RESULTS-Air.txt"), airSummary, "utf8");
  console.log("✓ CERT-RESULTS-*.txt yazildi");
}

function repackageDocx(name, extractDir) {
  const outPath = path.join(SENARYOLAR, name);
  const zipPath = path.join(SENARYOLAR, `_tmp_${name}.zip`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${extractDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit" },
  );
  fs.copyFileSync(zipPath, outPath);
  fs.unlinkSync(zipPath);
  console.log(`✓ ${name} paketlendi`);
}

const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const targets = only
  ? only === "air"
    ? [["Travelrobot Air API Test Cases.docx", "air-docx-extract"]]
    : [["Travelrobot Hotel API Test Cases.docx", "hotel-docx-extract"]]
  : [
      ["Travelrobot Hotel API Test Cases.docx", "hotel-docx-extract"],
      ["Travelrobot Air API Test Cases.docx", "air-docx-extract"],
    ];

// Orijinal docx'ten yeniden cikar
for (const [docx, dir] of targets) {
  const backupZip = path.join(SENARYOLAR, docx.includes("Air") ? "air-temp.zip" : "hotel-temp.zip");
  const src = fs.existsSync(backupZip) ? backupZip : path.join(SENARYOLAR, docx);
  const zip = path.join(SENARYOLAR, `_restore_${docx}.zip`);
  fs.copyFileSync(src, zip);
  const extractPath = path.join(SENARYOLAR, dir);
  if (fs.existsSync(extractPath)) {
    fs.rmSync(extractPath, { recursive: true, force: true });
  }
  fs.mkdirSync(extractPath, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zip.replace(/'/g, "''")}' -DestinationPath '${extractPath.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit" },
  );
  fs.unlinkSync(zip);
}

console.log("Sertifikasyon formlari dolduruluyor…\n");
if (!only || only === "hotel") fillHotelDocx();
if (!only || only === "air") fillAirDocx();
writeSummaryFiles();
if (!only || only === "hotel")
  repackageDocx("Travelrobot Hotel API Test Cases.docx", path.join(SENARYOLAR, "hotel-docx-extract"));
if (!only || only === "air")
  repackageDocx("Travelrobot Air API Test Cases.docx", path.join(SENARYOLAR, "air-docx-extract"));
console.log("\nTamamlandi:", SENARYOLAR);
