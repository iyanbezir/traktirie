-- OPSIONAL: isi 4 produk contoh untuk akun 'iyandev' (biar shop.html gak kosong pas demo).
-- Jalankan SETELAH kamu signup akun dengan username "iyandev" lewat signup.html.
--   turso db shell traktirie < db/seed-demo-products.sql

INSERT OR IGNORE INTO products (id, owner_id, code, name, description, price, icon, type, download_link, delivery_note, created_at)
SELECT 'seed-lr', id, 'LR-PRESET-AM', 'Lightroom Preset Pack AM', '12 preset cinematic untuk foto outdoor & portrait.', 35000, 'palette', 'link', 'https://drive.google.com/', 'Extract ZIP, import ke Lightroom Mobile via ikon +.', datetime('now')
FROM profiles WHERE lower(username) = 'iyandev';

INSERT OR IGNORE INTO products (id, owner_id, code, name, description, price, icon, type, download_link, delivery_note, created_at)
SELECT 'seed-cv', id, 'CV-TEMPLATE', 'Template CV ATS-Friendly', 'Template CV Canva, gampang diedit, lolos sistem ATS.', 15000, 'file-text', 'link', 'https://drive.google.com/', 'Buka link, klik "Use template" di Canva.', datetime('now')
FROM profiles WHERE lower(username) = 'iyandev';

INSERT OR IGNORE INTO products (id, owner_id, code, name, description, price, icon, type, download_link, delivery_note, created_at)
SELECT 'seed-ig', id, 'IG-STORY-PACK', 'IG Story Template Pack', '20 template story Instagram estetik, editable Canva.', 20000, 'image', 'link', 'https://drive.google.com/', 'Link Canva bisa langsung di-duplicate.', datetime('now')
FROM profiles WHERE lower(username) = 'iyandev';

INSERT OR IGNORE INTO products (id, owner_id, code, name, description, price, icon, type, download_link, delivery_note, created_at)
SELECT 'seed-ebook', id, 'EBOOK-HUSTLE', 'Ebook Side Hustle 101', 'Panduan mulai bisnis sampingan dari nol, 40 halaman PDF.', 25000, 'book', 'link', 'https://drive.google.com/', 'Link download PDF langsung aktif setelah bayar.', datetime('now')
FROM profiles WHERE lower(username) = 'iyandev';
