/* ==========================================================
   YourPrint — Code.gs
   Tempel seluruh isi file ini ke Google Apps Script Editor
   (Extensions > Apps Script) yang terhubung ke Google Sheet Anda.
   ========================================================== */

const DRIVE_FOLDER_NAME = "YourPrint - File Pesanan Cetak";
const VALID_STATUSES = ["Menunggu", "Dikonfirmasi", "Diproses", "Siap Diambil", "Selesai", "Dibatalkan"];

function generateOrderId(type) {
  const sheetName = type === "atk" ? "Pesanan ATK" : "Pesanan Cetak";
  const prefix = type === "atk" ? "YP-ATK" : "YP-CTK";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  const num = String(count + 1).padStart(4, "0");
  return prefix + "-" + num;
}

// Secret & admin password disimpan di ScriptProperties (bukan hardcoded)
// Jalankan setupSecrets() sekali untuk set nilai awal
function getSecretKey() {
  return PropertiesService.getScriptProperties().getProperty('SECRET_KEY') || '';
}
function getAdminPass() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PASS') || '';
}

// SETUP AWAL: Jalankan fungsi ini SEKALI di Apps Script Editor untuk membuat tabel, data awal, dan secret
function getAdminUser() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_USER') || 'admin';
}

function setupSecrets() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET_KEY')) {
    props.setProperty('SECRET_KEY', 'yp-2026-xyz');
  }
  if (!props.getProperty('ADMIN_USER')) {
    props.setProperty('ADMIN_USER', 'admin');
  }
  if (!props.getProperty('ADMIN_PASS')) {
    props.setProperty('ADMIN_PASS', 'admin-yp-2026');
  }
  Logger.log('Secrets configured. SECRET_KEY, ADMIN_USER & ADMIN_PASS are now in ScriptProperties.');
}

// SETUP AWAL: Jalankan fungsi ini SEKALI di Apps Script Editor untuk membuat tabel dan data awal
function seedInitialData() {
  setupSecrets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Produk ATK
  let sheetProducts = getOrCreateSheet("Produk ATK", ["id", "name", "price", "image", "emoji", "bg", "category"]);
  if (sheetProducts.getLastRow() === 1) {
    const data = [
      ["p1", "Kertas A4 80gsm (1 Rim)", 55000, "images/products/kertas-a4.jpg", "📄", "#EAF1FB", "Kertas"],
      ["p2", "Pulpen Gel Hitam", 4500, "images/products/pulpen-gel.jpg", "🖊️", "#FDEFE8", "Alat Tulis"],
      ["p3", "Buku Tulis 58 Lembar", 6000, "images/products/buku-tulis.jpg", "📔", "#F1EEFB", "Alat Tulis"],
      ["p4", "Stabilo Highlighter Set", 22000, "images/products/stabilo-set.jpg", "🖍️", "#FEF6E0", "Alat Tulis"],
      ["p5", "Map Plastik Snelhecter", 3500, "images/products/map-plastik.jpg", "📁", "#E8F6EE", "Aksesoris"],
      ["p6", "Stapler + Isi Staples", 18500, "images/products/stapler.jpg", "📎", "#EAF1FB", "Perlengkapan"],
      ["p7", "Spidol Whiteboard Set", 25000, "images/products/spidol-wb.jpg", "✏️", "#FDEFE8", "Perlengkapan"],
      ["p8", "Amplop Coklat (Isi 50)", 15000, "images/products/amplop-coklat.jpg", "✉️", "#F1EEFB", "Aksesoris"]
    ];
    sheetProducts.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  // 2. Galeri Buku
  let sheetGallery = getOrCreateSheet("Galeri Buku", ["code", "title", "image", "description", "priceA4", "priceA5", "priceB5"]);
  if (sheetGallery.getLastRow() === 1) {
    const data = [
      ["BC-001", "Buku Tulis Custom - Cover Doodle", "images/gallery/bc-001.jpg", "", 45000, 35000, 40000],
      ["BC-002", "Buku Tulis Custom - Cover Polos Warna", "images/gallery/bc-002.jpg", "", 45000, 35000, 40000],
      ["TPQ-014", "Buku Iqro TPQ - Custom Logo", "images/gallery/tpq-014.jpg", "", 45000, 35000, 40000],
      ["TPQ-015", "Buku Hafalan TPQ - Custom", "images/gallery/tpq-015.jpg", "", 45000, 35000, 40000],
      ["BC-006", "Buku Agenda Custom - Sekolah", "images/gallery/bc-006.jpg", "", 45000, 35000, 40000],
      ["BC-009", "Buku Tulis Custom - Brand Pribadi", "images/gallery/bc-009.jpg", "", 45000, 35000, 40000]
    ];
    sheetGallery.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  // 3. Layanan Cetak
  let sheetServices = getOrCreateSheet("Layanan Cetak", ["id", "service", "priceBw", "priceColor", "description", "image", "fallbackGradient", "iconSvg"]);
  if (sheetServices.getLastRow() === 1) {
    const data = [
      ["s1", "Cetak Dokumen", 500, 1500, "PDF, Word, Excel — hitam-putih atau warna, mulai Rp500/lembar.", "images/services/cetak-dokumen.jpg", "linear-gradient(135deg,#EAF1FB,#D6E4FA)", "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-9 h-9 text-ink/70\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><path d=\"M14 2v6h6M9 13h6M9 17h6\"/></svg>"],
      ["s2", "Cetak Foto", 0, 0, "Kertas glossy/doff, ukuran 4R hingga A3, hasil tajam & tahan lama.", "images/services/cetak-foto.jpg", "linear-gradient(135deg,#FDEFE8,#FBDFCF)", "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-9 h-9 text-ink/70\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><path d=\"m21 15-5-5L5 21\"/></svg>"],
      ["s3", "Jasa Jilid", 0, 0, "Spiral, lakban, hardcover — rapikan dokumen & laporan Anda.", "images/services/jasa-jilid.jpg", "linear-gradient(135deg,#F1EEFB,#E2DBF7)", "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-9 h-9 text-ink/70\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"/><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"/><path d=\"M8 7h8M8 11h8\"/></svg>"],
      ["s4", "Cetak Banner", 0, 0, "Spanduk, X-banner, MMT — desain sendiri atau kami bantu buatkan.", "images/services/cetak-banner.jpg", "linear-gradient(135deg,#FEF6E0,#FCEBB8)", "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-9 h-9 text-ink/70\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"1\"/><path d=\"M3 10h18M8 14h.01M12 14h4\"/></svg>"]
    ];
    sheetServices.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  // 4 & 5. Pesanan (Order ID sebagai kolom pertama)
  getOrCreateSheet("Pesanan ATK", ["Order ID", "Waktu", "Nama Pemesan", "No. WhatsApp", "Detail Produk", "Subtotal", "Status"]);
  getOrCreateSheet("Pesanan Cetak", ["Order ID", "Waktu", "Nama Pemesan", "No. WhatsApp", "Alamat", "Link Maps", "Metode Bayar", "Layanan", "Nama File", "Link File", "Jumlah Halaman", "Mode Warna", "Estimasi Harga", "Jumlah Salinan", "Laminasi", "Catatan", "Total Harga", "Status"]);

  // 6. Testimoni
  let sheetTestimonials = getOrCreateSheet("Testimoni", ["id", "name", "rating", "text", "date", "approved"]);
  if (sheetTestimonials.getLastRow() === 1) {
    const data = [
      ["t1", "Ibu Sarah", 5, "Buku TPQ-nya sangat berkualitas! Anak-anak senang sekali. Terima kasih YourPrint!", "2026-06-15", true],
      ["t2", "Pak Hendra", 5, "Cetak dokumen cepat dan rapi. Harga juga terjangkau. Recommended!", "2026-07-01", true],
      ["t3", "Dewi", 4, "Banner acara kantor hasilnya bagus. Pelayanan ramah.", "2026-07-10", true]
    ];
    sheetTestimonials.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  // 7. Banners
  getOrCreateSheet("Banners", ["id", "image", "link", "active"]);
  
  // 8. Pelanggan
  getOrCreateSheet("Pelanggan", ["id", "Nama", "No. WhatsApp", "Password", "Waktu Daftar"]);

  // 9. Market Digital — Kategori
  let sheetDigitalKategori = getOrCreateSheet("Market Digital Kategori", ["id", "title", "desc", "icon", "iconClass", "order"]);
  if (sheetDigitalKategori.getLastRow() === 1) {
    const data = [
      ["ebook", "Ebook", "Buku digital panduan & referensi siap baca kapan saja.", "ebook", "", 1],
      ["template-canva", "Template Canva", "Desain siap edit untuk media sosial & keperluan bisnis.", "template", "digital-cat-card__icon--stamp", 2],
      ["prompt-ai", "Prompt AI", "Prompt siap pakai untuk ChatGPT & berbagai tools AI.", "prompt", "digital-cat-card__icon--highlight", 3],
      ["administrasi-sekolah", "Administrasi Sekolah", "Perangkat guru & admin sekolah yang lengkap dan rapi.", "admin", "", 4],
      ["template-excel", "Template Excel", "Rumus & template otomatis untuk pekerjaan yang lebih rapi.", "excel", "digital-cat-card__icon--stamp", 5],
      ["bundle-bisnis", "Bundle Bisnis", "Paket hemat lengkap untuk memulai dan mengelola bisnis.", "bundle", "digital-cat-card__icon--highlight", 6]
    ];
    sheetDigitalKategori.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  // 10. Market Digital — Produk
  let sheetDigitalProduk = getOrCreateSheet("Market Digital Produk", ["id", "name", "category", "price", "oldPrice", "badge", "rating", "ratingCount", "cover", "emoji", "desc", "link", "image", "order"]);
  if (sheetDigitalProduk.getLastRow() === 1) {
    const data = [
      ["dcv-ats", "Template CV ATS Modern — Desain ATS-Friendly", "template-canva", 29000, 45000, "Diskon", 4.9, 214, "linear-gradient(135deg, #1E3A8A, #4338CA)", "📄", "Template CV siap edit yang lolos screening ATS, cocok untuk semua profesi.", "", "", 1],
      ["ebook-umkm", "Ebook Panduan Bisnis UMKM dari Nol", "ebook", 39000, "", "Bestseller", 4.8, 178, "linear-gradient(135deg, #B45309, #EA580C)", "📘", "Panduan lengkap memulai dan mengembangkan UMKM untuk pemula.", "", "", 2],
      ["prompt-500", "Prompt AI ChatGPT 500+ Siap Pakai", "prompt-ai", 19000, 29000, "Diskon", 4.7, 321, "linear-gradient(135deg, #0F172A, #334155)", "✨", "Koleksi prompt terkurasi untuk kerja, belajar, dan bisnis.", "", "", 3],
      ["adm-kelas", "Administrasi Kelas Lengkap SD/MI", "administrasi-sekolah", 49000, "", "Bestseller", 5.0, 96, "linear-gradient(135deg, #065F46, #059669)", "📚", "Perangkat administrasi wali kelas lengkap, tinggal print.", "", "", 4],
      ["xls-rapor", "Template Rapor & Nilai Excel Otomatis", "template-excel", 25000, "", "Terbaru", 4.6, 143, "linear-gradient(135deg, #14532D, #16A34A)", "📊", "Rekap nilai & rapor otomatis dengan rumus siap pakai.", "", "", 5],
      ["bundle-startup", "Bundle Bisnis Starter Pack", "bundle-bisnis", 79000, 119000, "Diskon", 4.9, 87, "linear-gradient(135deg, #7C2D12, #C2410C)", "💼", "Paket hemat: proposal, surat, SOP, dan tools bisnis dalam satu bundle.", "", "", 6],
      ["tpl-proposal", "Template Proposal Bisnis Modern", "template-canva", 35000, "", "", 4.8, 64, "linear-gradient(135deg, #1E40AF, #6366F1)", "🗂️", "Proposal profesional siap edit untuk presentasi investor & klien.", "", "", 7],
      ["ebook-copywriting", "Ebook Copywriting untuk Pemula", "ebook", 29000, "", "Terbaru", 4.7, 52, "linear-gradient(135deg, #9A3412, #F97316)", "✍️", "Teknik menulis konten pemasaran yang menarik dan mengubah pembaca.", "", "", 8],
      ["prompt-bisnis", "Prompt AI Bisnis & Pemasaran", "prompt-ai", 24000, "", "", 4.6, 41, "linear-gradient(135deg, #1E293B, #475569)", "🧠", "Prompt khusus untuk riset pasar, konten, dan strategi pemasaran.", "", "", 9],
      ["adm-merdeka", "Administrasi Guru Kurikulum Merdeka", "administrasi-sekolah", 59000, "", "Bestseller", 4.9, 73, "linear-gradient(135deg, #0F766E, #0D9488)", "📝", "Lengkap: modul ajar, ATP, CP, dan perangkat pembelajaran Merdeka.", "", "", 10]
    ];
    sheetDigitalProduk.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  // 11. Pengaturan global (key → value)
  let sheetPengaturan = getOrCreateSheet("Pengaturan", ["key", "value"]);
  if (sheetPengaturan.getLastRow() === 1) {
    const settings = [
      ["digital_global_link", "https://lynk.id/market.digital123"]
    ];
    sheetPengaturan.getRange(2, 1, settings.length, settings[0].length).setValues(settings);
  }

  // Fix any column misalignment issues
  fixCetakSheet();
}

// MIGRATION: Jalankan sekali untuk menambahkan Order ID ke data pesanan yang sudah ada
function migrateAddOrderId() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Migrate Pesanan ATK
  const sheetATK = ss.getSheetByName("Pesanan ATK");
  if (sheetATK) {
    const headersATK = sheetATK.getRange(1, 1, 1, sheetATK.getLastColumn()).getValues()[0];
    if (headersATK[0] !== "Order ID") {
      sheetATK.insertColumnBefore(1);
      sheetATK.getRange(1, 1).setValue("Order ID");
      const lastRow = sheetATK.getLastRow();
      for (let i = 2; i <= lastRow; i++) {
        sheetATK.getRange(i, 1).setValue("YP-ATK-" + String(i - 1).padStart(4, "0"));
      }
      // Update Status kosong jadi "Menunggu"
      const statusCol = sheetATK.getRange(1, 1, 1, sheetATK.getLastColumn()).getValues()[0].indexOf("Status") + 1;
      if (statusCol > 0) {
        for (let i = 2; i <= lastRow; i++) {
          const val = sheetATK.getRange(i, statusCol).getValue();
          if (!val || val === "") sheetATK.getRange(i, statusCol).setValue("Menunggu");
        }
      }
      Logger.log("Pesanan ATK migrated: " + (lastRow - 1) + " orders");
    }
  }
  
  // Migrate Pesanan Cetak
  const sheetCTK = ss.getSheetByName("Pesanan Cetak");
  if (sheetCTK) {
    const headersCTK = sheetCTK.getRange(1, 1, 1, sheetCTK.getLastColumn()).getValues()[0];
    if (headersCTK[0] !== "Order ID") {
      sheetCTK.insertColumnBefore(1);
      sheetCTK.getRange(1, 1).setValue("Order ID");
      const lastRow = sheetCTK.getLastRow();
      for (let i = 2; i <= lastRow; i++) {
        sheetCTK.getRange(i, 1).setValue("YP-CTK-" + String(i - 1).padStart(4, "0"));
      }
      const statusCol = sheetCTK.getRange(1, 1, 1, sheetCTK.getLastColumn()).getValues()[0].indexOf("Status") + 1;
      if (statusCol > 0) {
        for (let i = 2; i <= lastRow; i++) {
          const val = sheetCTK.getRange(i, statusCol).getValue();
          if (!val || val === "") sheetCTK.getRange(i, statusCol).setValue("Menunggu");
        }
      }
      Logger.log("Pesanan Cetak migrated: " + (lastRow - 1) + " orders");
    }
  }
}

// MIGRATION: Fix column alignment for Pesanan Cetak sheet
// Now handled automatically by getOrCreateSheet() — just ensure headers are correct
function fixCetakSheet() {
  const CORRECT_HEADERS = [
    "Order ID", "Waktu", "Nama Pemesan", "No. WhatsApp",
    "Alamat", "Link Maps", "Metode Bayar",
    "Layanan", "Nama File", "Link File",
    "Jumlah Halaman", "Mode Warna", "Estimasi Harga", "Jumlah Salinan",
    "Laminasi", "Catatan", "Total Harga", "Status"
  ];
  getOrCreateSheet("Pesanan Cetak", CORRECT_HEADERS);
}


/* ================= API ENDPOINTS ================= */

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "getAllDataCustomer") {
    return jsonResponse({
      result: "success",
      products: getSheetData("Produk ATK"),
      gallery: getSheetData("Galeri Buku"),
      services: getSheetData("Layanan Cetak"),
      testimonials: getApprovedTestimonials(),
      banners: getSheetData("Banners").filter(b => b.active === true || b.active === "TRUE" || b.active === "true")
    });
  }

  if (action === "getAllDataAdmin") {
    return jsonResponse({
      result: "success",
      products: getSheetData("Produk ATK"),
      gallery: getSheetData("Galeri Buku"),
      services: getSheetData("Layanan Cetak"),
      ordersATK: getSheetData("Pesanan ATK"),
      ordersCetak: getSheetData("Pesanan Cetak"),
      testimonials: getSheetData("Testimoni"),
      banners: getSheetData("Banners"),
      digitalKategori: getSheetData("Market Digital Kategori"),
      digitalProduk: getSheetData("Market Digital Produk"),
      pengaturan: getPengaturan()
    });
  }
  
  if (action === "getProducts") return jsonResponse(getSheetData("Produk ATK"));
  if (action === "getGallery") return jsonResponse(getSheetData("Galeri Buku"));
  if (action === "getServices") return jsonResponse(getSheetData("Layanan Cetak"));
  if (action === "getTestimonials") return jsonResponse(getApprovedTestimonials());
  if (action === "getBanners") return jsonResponse(getSheetData("Banners").filter(b => b.active === true || b.active === "TRUE" || b.active === "true"));

  // Endpoint Admin
  if (action === "getOrdersATK") return jsonResponse(getSheetData("Pesanan ATK"));
  if (action === "getOrdersCetak") return jsonResponse(getSheetData("Pesanan Cetak"));
  if (action === "getTestimonialsAdmin") return jsonResponse(getSheetData("Testimoni"));
  if (action === "getBannersAdmin") return jsonResponse(getSheetData("Banners"));

  // Endpoint Market Digital — publik (dipakai oleh digital.js)
  if (action === "getDigital") {
    return jsonResponse({
      result: "success",
      kategori: getSheetData("Market Digital Kategori"),
      produk: getSheetData("Market Digital Produk"),
      pengaturan: getPengaturan()
    });
  }

  // Endpoint Pelanggan — cari pesanan berdasarkan no. WhatsApp
  if (action === "getOrdersByPhone") {
    const phone = (e.parameter.phone || "").replace(/\D/g, "");
    if (!phone || phone.length < 8) {
      return jsonResponse({ result: "error", message: "Nomor WhatsApp tidak valid" });
    }
    const atk = getSheetData("Pesanan ATK").filter(o => {
      const stored = String(o["No. WhatsApp"] || "").replace(/\D/g, "");
      return stored === phone || stored.endsWith(phone.slice(-9)) || phone.endsWith(stored.slice(-9));
    });
    const cetak = getSheetData("Pesanan Cetak").filter(o => {
      const stored = String(o["No. WhatsApp"] || "").replace(/\D/g, "");
      return stored === phone || stored.endsWith(phone.slice(-9)) || phone.endsWith(stored.slice(-9));
    });
    const orders = [
      ...atk.map(o => ({ ...o, _type: "ATK", _harga: Number(o.Subtotal) || 0 })),
      ...cetak.map(o => ({ ...o, _type: "Cetak", _harga: Number(o["Total Harga"]) || Number(o["Estimasi Harga"]) || 0 }))
    ].sort((a, b) => new Date(b.Waktu) - new Date(a.Waktu));
    return jsonResponse({ result: "success", orders: orders });
  }

  return jsonResponse({ result: "success", message: "YourPrint backend aktif." });
}

function doPost(e) {
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch(err) {
      return jsonResponse({ result: "error", message: "Invalid JSON" });
    }

    // 1. ADMIN LOGIN
    if (data.type === "admin-login") {
      if (data.username === getAdminUser() && data.password === getAdminPass()) {
        var expiry = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
        return jsonResponse({ result: "success", token: "token-" + Date.now(), expiry: expiry });
      }
      return jsonResponse({ result: "error", message: "Username atau password salah" });
    }

    // 1.5 USER REGISTRATION & LOGIN
    if (data.type === "user-register") {
      if (!data.name || !data.phone || !data.password) {
        return jsonResponse({ result: "error", message: "Data tidak lengkap" });
      }
      const phoneClean = data.phone.replace(/\D/g, "");
      const sheet = getOrCreateSheet("Pelanggan", ["id", "Nama", "No. WhatsApp", "Password", "Waktu Daftar"]);
      const rows = sheet.getDataRange().getValues();
      
      // Check if already registered
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][2]).replace(/\D/g, "") === phoneClean) {
          return jsonResponse({ result: "error", message: "Nomor WhatsApp sudah terdaftar. Silakan login." });
        }
      }
      
      const userId = "u-" + Date.now();
      sheet.appendRow([userId, data.name, phoneClean, data.password, new Date()]);
      var expiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
      return jsonResponse({ result: "success", token: userId, expiry: expiry, name: data.name, phone: phoneClean });
    }
    
    if (data.type === "user-login") {
      if (!data.phone || !data.password) {
        return jsonResponse({ result: "error", message: "Data tidak lengkap" });
      }
      const phoneClean = data.phone.replace(/\D/g, "");
      const sheet = getOrCreateSheet("Pelanggan", ["id", "Nama", "No. WhatsApp", "Password", "Waktu Daftar"]);
      const rows = sheet.getDataRange().getValues();
      
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][2]).replace(/\D/g, "") === phoneClean && String(rows[i][3]) === String(data.password)) {
          var expiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
          return jsonResponse({ result: "success", token: rows[i][0], expiry: expiry, name: rows[i][1], phone: phoneClean });
        }
      }
      return jsonResponse({ result: "error", message: "Nomor WhatsApp atau password salah" });
    }

    // 2. PUBLIC CHECKOUT (ATK / CETAK)
    if (data.type === "order" || data.type === "print") {
      if (data.type === "order") {
        var oid = saveOrder(data);
      } else {
        var oid = savePrintJob(data);
      }
      return jsonResponse({ result: "success", orderId: oid });
    }

    // 3. ADMIN CRUD ACTIONS
    if (!data.token || !data.token.startsWith("token-")) {
      return jsonResponse({ result: "error", message: "Unauthorized" });
    }

    if (data.type === "upsert-product") return handleUpsert(data, "Produk ATK", "id", ["id", "name", "price", "image", "emoji", "bg", "category", "description"]);
    if (data.type === "delete-product") return handleDelete(data, "Produk ATK", "id");
    
    if (data.type === "upsert-gallery") return handleUpsert(data, "Galeri Buku", "code", ["code", "title", "image", "description", "priceA4", "priceA5", "priceB5"]);
    if (data.type === "delete-gallery") return handleDelete(data, "Galeri Buku", "code");
    
    if (data.type === "upsert-service") return handleUpsert(data, "Layanan Cetak", "id", ["id", "service", "priceBw", "priceColor", "description", "image", "fallbackGradient", "iconSvg"]);
    if (data.type === "delete-service") return handleDelete(data, "Layanan Cetak", "id");

    if (data.type === "upsert-digital-kategori") return handleUpsert(data, "Market Digital Kategori", "id", ["id", "title", "desc", "icon", "iconClass", "order"]);
    if (data.type === "delete-digital-kategori") return handleDelete(data, "Market Digital Kategori", "id");

    if (data.type === "upsert-digital-produk") return handleUpsert(data, "Market Digital Produk", "id", ["id", "name", "category", "price", "oldPrice", "badge", "rating", "ratingCount", "cover", "emoji", "desc", "link", "image", "order"]);
    if (data.type === "delete-digital-produk") return handleDelete(data, "Market Digital Produk", "id");

    if (data.type === "upsert-pengaturan") return handleUpsertSetting(data);

    if (data.type === "upsert-banner") return handleUpsert(data, "Banners", "id", ["id", "image", "link", "active"]);
    if (data.type === "delete-banner") return handleDelete(data, "Banners", "id");

    if (data.type === "update-status") return handleUpdateStatus(data);
    if (data.type === "clear-all-data") return handleClearAllData(data);

    if (data.type === "upsert-testimonial") return handleUpsert(data, "Testimoni", "id", ["id", "name", "rating", "text", "date", "approved"]);
    if (data.type === "delete-testimonial") return handleDelete(data, "Testimoni", "id");
    if (data.type === "approve-testimonial") return handleApproveTestimonial(data);

    return jsonResponse({ result: "error", message: "Tipe data tidak dikenali." });

  } catch (err) {
    return jsonResponse({ result: "error", message: err.message });
  }
}

/* ================= ACTIONS ================= */

function saveOrder(data) {
  const sheet = getOrCreateSheet("Pesanan ATK", ["Order ID", "Waktu", "Nama Pemesan", "No. WhatsApp", "Detail Produk", "Subtotal", "Status"]);
  const orderId = generateOrderId("atk");
  const itemsText = (data.items || []).map(i => `${i.name} x${i.qty} (Rp${(i.qty * i.price).toLocaleString("id-ID")})`).join("\n");
  sheet.appendRow([orderId, new Date(data.timestamp || Date.now()), data.customerName || "-", data.customerPhone || "-", itemsText, data.subtotal || 0, "Menunggu"]);
  return orderId;
}

function savePrintJob(data) {
  const sheet = getOrCreateSheet("Pesanan Cetak", ["Order ID", "Waktu", "Nama Pemesan", "No. WhatsApp", "Alamat", "Link Maps", "Metode Bayar", "Layanan", "Nama File", "Link File", "Jumlah Halaman", "Mode Warna", "Estimasi Harga", "Jumlah Salinan", "Laminasi", "Catatan", "Total Harga", "Status"]);
  const orderId = generateOrderId("cetak");
  let fileUrl = "-";
  if (data.fileData) {
    const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    const contentType = data.fileType || "application/octet-stream";
    const bytes = Utilities.base64Decode(data.fileData);
    const blob = Utilities.newBlob(bytes, contentType, data.fileName || "file-tanpa-nama");
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fileUrl = file.getUrl();
  }
  var lamLabel = "Tidak ada";
  if (data.lamination === "glossy") lamLabel = "Glossy";
  else if (data.lamination === "doff") lamLabel = "Doff";
  sheet.appendRow([
    orderId,
    new Date(data.timestamp || Date.now()),
    data.customerName || "-",
    data.customerPhone || "-",
    data.address || "-",
    data.mapsLink || "-",
    data.paymentMethod || "Tunai",
    data.service || "-",
    data.fileName || "-",
    fileUrl,
    data.pageCount || "-",
    data.colorMode === "color" ? "Warna" : (data.colorMode === "bw" ? "Hitam Putih" : "-"),
    data.estimatedPrice ? Number(data.estimatedPrice) : "-",
    data.quantity || 1,
    lamLabel,
    data.notes || "-",
    data.totalPrice ? Number(data.totalPrice) : "-",
    "Menunggu"
  ]);
  return orderId;
}

function handleUpsert(data, sheetName, idCol, cols) {
  const sheet = getOrCreateSheet(sheetName, cols);
  const rows = sheet.getDataRange().getValues();
  const idIndex = cols.indexOf(idCol);
  const imageIndex = cols.indexOf("image");
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]) === String(data.item[idCol])) {
      rowIndex = i + 1;
      break;
    }
  }

  // Jika ada imageFile yang diupload, proses dan simpan ke Drive
  if (data.item.imageFile && data.item.imageFile.data) {
    const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
    const bytes = Utilities.base64Decode(data.item.imageFile.data);
    const blob = Utilities.newBlob(bytes, data.item.imageFile.mimeType, data.item.imageFile.name || "image.png");
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    // Gunakan CDN Google lh3.googleusercontent.com agar gambar bisa tampil langsung di tag <img> tanpa terblokir
    data.item.image = "https://lh3.googleusercontent.com/d/" + file.getId();
  }

  const newRowData = cols.map(col => data.item[col] !== undefined ? data.item[col] : "");
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, cols.length).setValues([newRowData]);
  } else {
    if (!data.item[idCol]) newRowData[idIndex] = "id_" + Date.now();
    sheet.appendRow(newRowData);
  }
  return jsonResponse({ result: "success" });
}

function getPengaturan() {
  const sheet = getOrCreateSheet("Pengaturan", ["key", "value"]);
  if (sheet.getLastRow() === 1) {
    sheet.appendRow(["digital_global_link", "https://lynk.id/market.digital123"]);
  }
  const rows = getSheetData("Pengaturan");
  const out = {};
  rows.forEach(r => {
    if (r.key !== undefined && r.value !== undefined) out[r.key] = r.value;
  });
  return out;
}

function handleUpsertSetting(data) {
  if (data.key === undefined) return jsonResponse({ result: "error", message: "key tidak valid" });
  const sheet = getOrCreateSheet("Pengaturan", ["key", "value"]);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.key)) {
      sheet.getRange(i + 1, 2).setValue(data.value === undefined ? "" : data.value);
      return jsonResponse({ result: "success" });
    }
  }
  sheet.appendRow([data.key, data.value === undefined ? "" : data.value]);
  return jsonResponse({ result: "success" });
}

function handleDelete(data, sheetName, idCol) {
  const sheet = getOrCreateSheet(sheetName, []);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIndex = headers.indexOf(idCol);
  
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ result: "success" });
    }
  }
  return jsonResponse({ result: "error", message: "Item not found" });
}

function handleUpdateStatus(data) {
  const validStatuses = VALID_STATUSES;
  if (validStatuses.indexOf(data.newStatus) === -1) {
    return jsonResponse({ result: "error", message: "Status tidak valid: " + data.newStatus });
  }
  const sheetName = data.category === "atk" ? "Pesanan ATK" : "Pesanan Cetak";
  const sheet = getOrCreateSheet(sheetName, []);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return jsonResponse({ result: "error", message: "Belum ada data pesanan" });
  
  const headers = rows[0];
  let statusIndex = -1;
  let phoneIndex = -1;
  let orderIdIndex = -1;
  for (let c = 0; c < headers.length; c++) {
    const h = String(headers[c]).trim().toLowerCase();
    if (h === "status") statusIndex = c + 1;
    if (h === "no. whatsapp" || h === "no wa") phoneIndex = c + 1;
    if (h === "order id") orderIdIndex = c + 1;
  }
  
  if (statusIndex === -1) {
    statusIndex = headers.length + 1;
    sheet.getRange(1, statusIndex).setValue("Status");
  }
  
  const rowIndex = Number(data.rowIndex) + 2;
  
  if (rowIndex >= 2 && rowIndex <= sheet.getLastRow()) {
    sheet.getRange(rowIndex, statusIndex).setValue(data.newStatus);

    return jsonResponse({ result: "success", newStatus: data.newStatus });
  }
  return jsonResponse({ result: "error", message: "Baris pesanan tidak valid" });
}

function clearAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ["Pesanan ATK", "Pesanan Cetak"];
  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  });
  Logger.log("clearAllData: All order data cleared");
}

function handleClearAllData(data) {
  if (!data.token || !data.token.startsWith("token-")) {
    return jsonResponse({ result: "error", message: "Unauthorized" });
  }
  clearAllData();
  return jsonResponse({ result: "success", message: "Semua data pesanan dihapus" });
}

function getApprovedTestimonials() {
  const all = getSheetData("Testimoni");
  return all.filter(t => t.approved === true || t.approved === "TRUE" || t.approved === "true");
}

function handleApproveTestimonial(data) {
  const sheet = getOrCreateSheet("Testimoni", []);
  const rows = sheet.getDataRange().getValues();
  const rowIndex = data.rowIndex + 2;
  const headers = rows[0];
  const approvedIndex = headers.indexOf("approved") + 1;

  if (rowIndex <= sheet.getLastRow()) {
    sheet.getRange(rowIndex, approvedIndex).setValue(data.approve ? true : false);
    return jsonResponse({ result: "success" });
  }
  return jsonResponse({ result: "error", message: "Invalid row index" });
}

/* ================= UTILS ================= */

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = { _rowIndex: i - 1 };
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

function getOrCreateSheet(name, headerRow) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    // Sheet baru — buat dari awal
    sheet = ss.insertSheet(name);
    sheet.appendRow(headerRow);
    sheet.setFrozenRows(1);
    return sheet;
  }
  
  if (!headerRow || headerRow.length === 0) return sheet;
  
  // Cek apakah header sudah benar
  const existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  const existingTrimmed = existingHeaders.map(h => String(h).trim());
  const isCorrect = headerRow.length === existingTrimmed.length &&
    headerRow.every((h, i) => h === existingTrimmed[i]);
  
  if (isCorrect) return sheet;

  // AMAN: jika header lama BAGIAN DARI header baru (superset), cukup tambahkan kolom baru — JANGAN rebuild
  const allOldPresent = existingTrimmed.every(h => headerRow.includes(h));
  if (allOldPresent) {
    const newCols = headerRow.filter(h => !existingTrimmed.includes(h));
    if (newCols.length > 0) {
      const nextCol = sheet.getLastColumn() + 1;
      for (let i = 0; i < newCols.length; i++) {
        sheet.getRange(1, nextCol + i).setValue(newCols[i]);
      }
      sheet.setFrozenRows(1);
      Logger.log("getOrCreateSheet: Added columns to '" + name + "': " + newCols.join(", "));
    }
    return sheet;
  }
  
  // REBUILD hanya jika header benar-benar berbeda (rename / reorder)
  Logger.log("getOrCreateSheet: Rebuilding '" + name + "' (headers fundamentally changed)");
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  const oldHeaderMap = {};
  existingHeaders.forEach((h, i) => { oldHeaderMap[String(h).trim()] = i; });
  
  const rawData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  
  const newData = rawData.map(row => {
    return headerRow.map(h => {
      const idx = oldHeaderMap[h];
      return (idx !== undefined && idx < row.length) ? row[idx] : "-";
    });
  });
  
  ss.deleteSheet(sheet);
  const newSheet = ss.insertSheet(name);
  newSheet.appendRow(headerRow);
  newSheet.setFrozenRows(1);
  
  if (newData.length > 0) {
    newSheet.getRange(2, 1, newData.length, headerRow.length).setValues(newData);
  }
  
  Logger.log("getOrCreateSheet: Rebuilt '" + name + "' with " + newData.length + " rows");
  return newSheet;
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}