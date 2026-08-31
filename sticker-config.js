/* =========================================================================
   KONFIGURASI CETAK STIKER — SUMBER DEFAULT PILIHAN & HARGA.

   Ini adalah nilai BAWAAN (default). Admin bisa menimpa harga/pilihan
   langsung dari halaman admin: isi kolom "Options Ukuran & Harga (JSON)"
   pada baris layanan "Cetak Stiker" (sheet "Layanan Cetak"), lalu paste
   template dari file sticker-options-template.json. JSON tersebut akan
   menutupi (deep-merge) nilai bawaan di file ini. Biarkan kolom Kosong
   bila ingin memakai bawaan ini.

   ⚠️ PENTING — SEMUA ANGKA HARGA DI BAWAH ADALAH CONTOH/PLACEHOLDER.
      GANTI DENGAN HARGA BISNIS YOURPRINT sebelum dipakai produksi
      (baik di file ini, maupun di kolom Options pada halaman admin).
      Cari komentar  "← GANTI DENGAN HARGA BISNIS"  di bagian pricing.
   ========================================================================= */
window.YOURPRINT_STICKER_CONFIG = {

  /* -----------------------------------------------------------
     STEP 1 — JENIS KEBUTUHAN STIKER
     ----------------------------------------------------------- */
  types: [
    { id: 'produk',  title: 'Stiker Produk',      desc: 'Cocok untuk makanan, minuman, skincare, dan produk usaha.', icon: '🛍️' },
    { id: 'label',   title: 'Stiker Label',       desc: 'Cocok untuk nama produk, label kemasan, identitas barang, dan lainnya.', icon: '🏷️' },
    { id: 'custom',  title: 'Stiker Custom',      desc: 'Cocok untuk laptop, motor, helm, komunitas, dekorasi, dan desain bebas.', icon: '🎨' },
    { id: 'kemasan', title: 'Stiker Kemasan',     desc: 'Cocok untuk kebutuhan branding dan kemasan produk.', icon: '📦' },
    { id: 'desain',  title: 'Saya Sudah Punya Desain', desc: 'Langsung lanjutkan ke pengaturan spesifikasi dan upload desain.', icon: '🖼️' }
  ],

  /* -----------------------------------------------------------
     STEP 2 — BENTUK STIKER (ilustrasi digambar otomatis di UI)
     ----------------------------------------------------------- */
  shapes: [
    { id: 'kotak',           title: 'Kotak',           desc: 'Bentuk kotak presisi untuk label & branding.' },
    { id: 'persegi-panjang', title: 'Persegi Panjang', desc: 'Bentuk klasik untuk label produk & kemasan.' },
    { id: 'bulat',           title: 'Bulat',           desc: 'Bentuk bulat untuk logo, kemasan, dan segel.' },
    { id: 'oval',            title: 'Oval',            desc: 'Bentuk oval yang lembut dan elegan.' },
    { id: 'custom',          title: 'Custom / Mengikuti Bentuk Desain', desc: 'Stiker akan dipotong mengikuti bentuk desain.', note: 'Stiker akan dipotong mengikuti bentuk desain.' }
  ],

  /* -----------------------------------------------------------
     STEP 3 — UKURAN POPULER (per bentuk) + CUSTOM
       w / h    : lebar & tinggi (cm). Untuk bentuk Bulat, w = diameter.
       label    : (opsional) teks ukuran yang tampil. Jika kosong,
                  format otomatis menyesuaikan bentuk.
       price    : (opsional, TIDAK dipakai bila masih 0) harga per pcs.
                  Jika 0 / tidak ada, harga dihitung otomatis dari luas
                  ukuran (lihat pricing.basePrice).
     ----------------------------------------------------------- */
  sizes: {
    'kotak': [
      { w: 3, h: 3 }, { w: 4, h: 4 }, { w: 5, h: 5 }, { w: 6, h: 6 }, { w: 8, h: 8 }, { w: 10, h: 10 }
    ],
    'persegi-panjang': [
      { w: 3, h: 5 }, { w: 5, h: 7 }, { w: 7, h: 10 }, { w: 10, h: 15 }, { w: 12, h: 18 }
    ],
    'bulat': [
      { w: 3, h: 3 }, { w: 4, h: 4 }, { w: 5, h: 5 }, { w: 6, h: 6 }, { w: 8, h: 8 }, { w: 10, h: 10 }
    ],
    'oval': [
      { w: 4, h: 6 }, { w: 5, h: 7 }, { w: 6, h: 9 }, { w: 8, h: 12 }, { w: 10, h: 14 }
    ]
  },

  /* Batasan ukuran custom (cm) */
  customSize: {
    min: 1,
    max: 100
  },

  /* -----------------------------------------------------------
     STEP 4 — BAHAN STIKER (harga ada di pricing.materialPrice)
     ----------------------------------------------------------- */
  materials: [
    { id: 'vinyl',        name: 'Vinyl',          desc: 'Tahan air, lebih kuat, cocok untuk penggunaan jangka panjang.' },
    { id: 'vinyl-glossy', name: 'Vinyl Glossy',   desc: 'Permukaan mengkilap dengan warna yang lebih hidup.' },
    { id: 'vinyl-matte',  name: 'Vinyl Matte',    desc: 'Tampilan elegan, tidak terlalu memantulkan cahaya.' },
    { id: 'kertas',       name: 'Kertas Stiker',  desc: 'Pilihan ekonomis untuk kebutuhan indoor.' }
  ],

  /* -----------------------------------------------------------
     STEP 5 — FINISHING / LAMINASI (harga di pricing.finishingPrice)
     disabledFor : bahan yang TIDAK cocok → pilihan finishing
                   dinonaktifkan otomatis beserta alasannya.
     ----------------------------------------------------------- */
  finishing: [
    { id: 'none',   name: 'Tanpa Laminasi', desc: 'Tanpa lapisan pelindung tambahan.', disabledFor: {} },
    { id: 'glossy', name: 'Laminasi Glossy', desc: 'Melindungi stiker dengan lapisan mengkilap.',
      disabledFor: { 'vinyl-glossy': 'Permukaan Vinyl Glossy sudah mengkilap, laminasi glossy tidak diperlukan.' } },
    { id: 'matte',  name: 'Laminasi Matte', desc: 'Melindungi stiker dengan lapisan tidak mengkilap.',
      disabledFor: { 'vinyl-matte': 'Permukaan Vinyl Matte sudah tidak mengkilap, laminasi matte tidak diperlukan.' } }
  ],

  /* -----------------------------------------------------------
     STEP 6 — JENIS POTONGAN (harga di pricing.cuttingPrice)
     ----------------------------------------------------------- */
  cutTypes: [
    { id: 'lembar', name: 'Potong Lembar', desc: 'Stiker dikirim dalam bentuk lembaran.' },
    { id: 'kiss',   name: 'Kiss Cut',      desc: 'Stiker sudah dipotong tetapi tetap menempel pada backing.' },
    { id: 'die',    name: 'Die Cut',       desc: 'Stiker dipotong mengikuti bentuk dan dipisahkan satu per satu.' }
  ],

  /* -----------------------------------------------------------
     STEP 7 — JUMLAH PESANAN
     ----------------------------------------------------------- */
  minQuantity: 10,
  maxQuantity: 100000,
  quantityPresets: [50, 100, 200, 500, 1000],

  /* -----------------------------------------------------------
     STEP 8 — UPLOAD DESAIN
     ----------------------------------------------------------- */
  upload: {
    accept: '.png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf',
    types: ['image/png', 'image/jpeg', 'application/pdf'],
    maxSizeMB: 10
  },

  designCheck: {
    label: 'Saya ingin tim YourPrint membantu mengecek desain sebelum dicetak.',
    note: 'Desain akan diperiksa oleh tim sebelum masuk ke proses produksi.'
  },

  /* ===========================================================
     SISTEM HARGA  ⬇  (GANTI DENGAN HARGA BISNIS YOURPRINT)
     ===========================================================

     Rumus estimasi per pcs:

       1. Harga dasar mengikuti ukuran (perbandingan luas):
             hargaDasar = basePrice × (luasUkuran / referenceAreaCm2)
          Luas ukuran dihitung dari bentuk yang dipilih.

       2. Tambah biaya bahan + finishing + potongan:
             hargaSatuan = hargaDasar + materialPrice
                                       + finishingPrice
                                       + cuttingPrice

       3. Terapkan diskon bertingkat (quantityTiers):
             total = hargaSatuan × qty × (1 − discountPct/100)

       Hasil akhir dibulatkan ke kelipatan Rp100 agar rapi.
     =========================================================== */
  pricing: {

    /* Rp per pcs pada ukuran referensi (default 5×5 cm). */
    basePrice: 1500,               // ← GANTI DENGAN HARGA BISNIS

    /* Luas referensi (cm²) yang menjadi patokan basePrice. */
    referenceAreaCm2: 25,          // = 5 × 5

    /* Batas atas pengali untuk ukuran CUSTOM agar harga tidak melonjak
       tak terkendali (mis. ukuran sangat besar). */
    customSizeMultiplierMax: 4,    // ← sesuaikan jika perlu

    /* Biaya bahan per pcs. Kunci = id bahan di atas. Boleh minus
       (bahan lebih murah dari patokan) selama hasil akhir tetap > 0. */
    materialPrice: {               // ← GANTI DENGAN HARGA BISNIS
      'vinyl': 0,
      'vinyl-glossy': 150,
      'vinyl-matte': 150,
      'kertas': -500
    },

    /* Biaya finishing per pcs. Kunci = id finishing di atas. */
    finishingPrice: {              // ← GANTI DENGAN HARGA BISNIS
      'none': 0,
      'glossy': 250,
      'matte': 250
    },

    /* Biaya jenis potongan per pcs. Kunci = id cutTypes di atas. */
    cuttingPrice: {                // ← GANTI DENGAN HARGA BISNIS
      'lembar': 0,
      'kiss': 150,
      'die': 400
    },

    /* Harga per pcs override untuk ukuran tertentu (opsional).
       Kunci = label ukuran persis seperti yang tampil, mis. "5 × 5 cm"
       atau "Diameter 5 cm". Jika ada, hargaDasar dari ukuran itu
       memakai angka ini (tidak lagi dihitung dari luas).
    sizePriceOverrides: {
      'kotak': { '5 × 5 cm': 1800 },
      'bulat': { 'Diameter 5 cm': 2000 }
    },
    ------------------------------------------------------------ */
    sizePriceOverrides: {},

    /* Diskon bertingkat berdasarkan jumlah pcs.
       Semakin banyak pesanan, semakin besar diskonnya. */
    quantityTiers: [               // ← GANTI DENGAN HARGA BISNIS
      { from: 1,     discountPct: 0 },
      { from: 50,    discountPct: 10 },
      { from: 100,   discountPct: 15 },
      { from: 200,   discountPct: 20 },
      { from: 500,   discountPct: 25 },
      { from: 1000,  discountPct: 30 }
    ]
  },

  /* Alamat WhatsApp untuk checkout. Bisa dikosongkan agar memakai
     number dari YOURPRINT_CONFIG (config.js). */
  whatsappNumber: ''
};