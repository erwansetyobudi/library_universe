# Library Universe v1.0.2

Plugin OPAC SLiMS untuk memvisualisasikan pertumbuhan koleksi dan transaksi peminjaman sebagai universe animatif berbasis Three.js.

## URL
Setelah plugin diaktifkan:
`index.php?p=library_universe`

## Model data
- `biblio.input_date` = waktu kelahiran bintang/koleksi.
- `item.biblio_id` = jumlah eksemplar/orbit koleksi.
- `loan.item_code` -> `item.item_code` -> `biblio.biblio_id` = lintasan cahaya peminjaman.
- `loan.member_id` -> `member.member_id` = identitas asal lintasan untuk tooltip/data.
- `search_biblio` tidak diwajibkan pada v1.0.0 agar kompatibilitas lebih tinggi; pencarian/detail menggunakan tabel inti.

## Fitur
- Full-screen bersih tanpa header/footer OPAC.
- Timeline Play/Pause dan scrub.
- Kecepatan 1x, 2x, 5x, 10x, 25x.
- Bintang koleksi muncul mengikuti `input_date`.
- Light trail muncul mengikuti `loan_date`.
- Klik bintang untuk detail koleksi.
- Cache JSON 5 menit pada `files/cache/library_universe`.
- Mode performa membatasi payload visual (default 5.000 bibliografi dan 10.000 loan per request).

## Catatan
Three.js dan addon yang dibutuhkan sudah dibundel lokal di dalam plugin. Tidak membutuhkan CDN dan aman untuk CSP yang hanya mengizinkan script dari self.
Pastikan direktori `files/cache` dapat ditulis oleh web server bila ingin cache aktif.


## v1.0.5
- Visual lebih bersih: label, orbit, dan light trail aktif dibatasi.
- Bintang koleksi lama meredup bertahap.
- Durasi trail deterministik.
- Background stars dikurangi untuk performa.
- Cache API dinaikkan menjadi 30 menit dan tetap date-scoped.
