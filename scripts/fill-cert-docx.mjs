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
        "rezervasyonyap.tr sandbox certification — Hotel-S1",
        "Tarih: 2026-06-05 | Ortam: KPlus sandbox",
        "Adımlar: SearchHotel → GetHotelDetails → GetHotelRoomPrices → ValidateHotelRoomsV2 → BookHotel",
        "Otel: KTR672265 (Hilton Istanbul Bomonti) — cert oteli KTR431805 stoğu yoktu",
        "Tarih: 05.07.2026–12.07.2026 | destinationId=10033097",
        "Log: travelrobot-test-log-2026-06-05T19-23-27.json",
      ].join("\n"),
      systemPnr: "6SOK06TCDK",
    },
    {
      clientNotes: [
        "rezervasyonyap.tr sandbox certification — Hotel-S2",
        "Prague destinationId=531096 | Validate OK, BookHotel FAIL",
        "Hata: Passenger count is not compatible with related passenger type (Adult)",
        "Log: travelrobot-test-log-2026-06-05T19-28-15.json",
      ].join("\n"),
      systemPnr: "(book basarisiz — PNR yok)",
    },
    {
      clientNotes: [
        "rezervasyonyap.tr sandbox certification — Hotel-S3",
        "Berlin destinationId=587926 | Otel: KDE646930 Pullman Berlin",
        "2 oda validate OK | BookHotel FAIL: Invalid key(s)",
        "Log: travelrobot-test-log-2026-06-05T19-28-15.json",
      ].join("\n"),
      systemPnr: "(book basarisiz — PNR yok)",
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
    { res: "6R4706FFMO", dir: "N/A (HTTP 404)", pnr: "(yok)", tkt: "N/A — sandbox", note: "Air-S1 Oneway 1ADT IST-LHR. Search/Validate/Book OK." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S2 Oneway 2+1+1. Book: passenger count incompatible." },
    { res: "69SH067YQ9", dir: "N/A (HTTP 404)", pnr: "(yok)", tkt: "N/A", note: "Air-S3 RT Combined LHR-DXB. Book OK." },
    { res: "6PIR06YJUR", dir: "N/A (HTTP 404)", pnr: "(yok)", tkt: "N/A", note: "Air-S4 RT Separated LHR-DXB. Book OK." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S5 RT Combined 2+1+1. Book fail." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S6 RT Separated 2+1+1. Book fail." },
    { res: "(BrandedFares fail)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S7 Multiple Combined. Availability not found." },
    { res: "(arama bos)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S8 Multiple Separated. Sandbox stok bos." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S9 Oneway-LCC. Book fail." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S10 Roundtrip-LCC. Book fail." },
    { res: "(basarisiz)", dir: "N/A", pnr: "(yok)", tkt: "N/A", note: "Air-S11 Multiple-LCC. Book fail." },
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
    (d) => `rezervasyonyap.tr sandbox — ${d.note} Log: travelrobot-test-log-2026-06-05T19-33-18.json`,
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

S1 — 1 Oda / 2 ADT / Istanbul (destinationId=10033097)
  System PNR: 6SOK06TCDK (alternatif: 6CYA062R92)
  Otel: KTR672265 Hilton Istanbul Bomonti
  Log: travelrobot-test-log-2026-06-05T19-23-27.json

S2 — 1 Oda / 2 ADT + 1 CHD(5) / Prague
  System PNR: (yok) | Book FAIL: Passenger count incompatible
  Log: travelrobot-test-log-2026-06-05T19-28-15.json

S3 — 2 Oda / Berlin
  Otel: KDE646930 Pullman Berlin | Book FAIL: Invalid key(s)
  Log: travelrobot-test-log-2026-06-05T19-28-15.json
`;

  const airSummary = `TRAVELROBOT AIR API — SERTIFIKASYON SONUCLARI
Tarih: 2026-06-05 | Log: travelrobot-test-log-2026-06-05T19-33-18.json

S1  Oneway 1ADT IST-LHR       | Book OK  SystemPNR: 6R4706FFMO  | Ticket FAIL (sandbox)
S2  Oneway 2+1+1 IST-LHR      | Book FAIL passenger count
S3  RT Combined 1ADT LHR-DXB  | Book OK  SystemPNR: 69SH067YQ9
S4  RT Separated 1ADT LHR-DXB | Book OK  SystemPNR: 6PIR06YJUR
S5  RT Combined 2+1+1         | Book FAIL
S6  RT Separated 2+1+1        | Book FAIL
S7  Multiple Combined         | BrandedFares FAIL
S8  Multiple Separated        | Search empty
S9  Oneway-LCC 2+1+1         | Book FAIL
S10 Roundtrip-LCC 2+1+1       | Book FAIL
S11 Multiple-LCC 2+1+1        | Book FAIL
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
