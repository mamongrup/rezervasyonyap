import fs from "node:fs";
const xml = fs.readFileSync(
  "C:/Users/mamon/Desktop/senaryolar/air-docx-extract/word/document.xml",
  "utf8",
);
const re =
  /<w:tcPr><w:tcW w:w="3260" w:type="dxa"><\/w:tcPr><w:p[^>]*><w:pPr><w:pStyle w:val="ListeParagraf"\/><w:ind w:left="0"\/><\/w:pPr><\/w:p>/g;
const matches = [...xml.matchAll(re)];
console.log("matches", matches.length);
const idx = xml.indexOf('w:w="3260"');
console.log("char at ind", JSON.stringify(xml.slice(idx, idx + 180)));
console.log("regex test", re.test(xml));
re.lastIndex = 0;
const simple = /<w:ind w:left="0"\/><\/w:pPr><\/w:p>/g;
console.log("simple empty p count", [...xml.matchAll(simple)].length);
if (matches[0]) {
  console.log("sample", matches[0][0].slice(0, 200));
}
const r2 =
  /<w:tcW w:w="3260" w:type="dxa"\/><\/w:tcPr><w:p[^>]*><w:pPr><w:pStyle w:val="ListeParagraf"\/><w:ind w:left="0"\/><\/w:pPr><\/w:p>/g;
console.log("tcW only matches", [...xml.matchAll(r2)].length);
// alternate: any empty p in 3260 cell
const re2 = /w:w="3260"[\s\S]{0,250}?<\/w:p>/g;
const m2 = [...xml.matchAll(re2)].slice(0, 3);
m2.forEach((m, i) => console.log("alt", i, m[0]));
