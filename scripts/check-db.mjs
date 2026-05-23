import { execSync } from 'child_process';

const psql = '"C:\\laragon\\bin\\postgresql\\postgresql\\bin\\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d travel';

try {
  // Listings tablosu kolonları
  const cmd1 = `${psql} -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'listings' ORDER BY ordinal_position;"`;
  const r1 = execSync(cmd1, { encoding: 'utf8', timeout: 10000 });
  console.log('=== LISTINGS KOLONLARI ===');
  console.log(r1);

  // listing_translations
  const cmd2 = `${psql} -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listing_translations' ORDER BY ordinal_position;"`;
  const r2 = execSync(cmd2, { encoding: 'utf8', timeout: 10000 });
  console.log('=== LISTING_TRANSLATIONS KOLONLARI ===');
  console.log(r2);

  // listing_attributes
  const cmd3 = `${psql} -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listing_attributes' ORDER BY ordinal_position;"`;
  const r3 = execSync(cmd3, { encoding: 'utf8', timeout: 10000 });
  console.log('=== LISTING_ATTRIBUTES KOLONLARI ===');
  console.log(r3);

  // listing_images
  const cmd4 = `${psql} -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listing_images' ORDER BY ordinal_position;"`;
  const r4 = execSync(cmd4, { encoding: 'utf8', timeout: 10000 });
  console.log('=== LISTING_IMAGES KOLONLARI ===');
  console.log(r4);

  // listing_owner_contacts
  const cmd5 = `${psql} -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listing_owner_contacts' ORDER BY ordinal_position;"`;
  const r5 = execSync(cmd5, { encoding: 'utf8', timeout: 10000 });
  console.log('=== LISTING_OWNER_CONTACTS KOLONLARI ===');
  console.log(r5);

  // listing_price_rules
  const cmd6 = `${psql} -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listing_price_rules' ORDER BY ordinal_position;"`;
  const r6 = execSync(cmd6, { encoding: 'utf8', timeout: 10000 });
  console.log('=== LISTING_PRICE_RULES KOLONLARI ===');
  console.log(r6);

  // Kategoriler
  const cmd7 = `${psql} -c "SELECT id, code, name_key FROM product_categories ORDER BY id;"`;
  const r7 = execSync(cmd7, { encoding: 'utf8', timeout: 10000 });
  console.log('=== KATEGORILER ===');
  console.log(r7);

  // Organizasyonlar
  const cmd8 = `${psql} -c "SELECT id, name, slug FROM organizations LIMIT 5;"`;
  const r8 = execSync(cmd8, { encoding: 'utf8', timeout: 10000 });
  console.log('=== ORGANIZASYONLAR ===');
  console.log(r8);

  // Locales
  const cmd9 = `${psql} -c "SELECT id, code, name FROM locales ORDER BY id;"`;
  const r9 = execSync(cmd9, { encoding: 'utf8', timeout: 10000 });
  console.log('=== LOCALES ===');
  console.log(r9);

} catch (e) {
  console.error('HATA:', e.message);
  console.error('STDERR:', e.stderr?.toString());
}
