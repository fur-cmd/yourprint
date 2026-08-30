window.YOURPRINT_CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbzfeWkKbfUJ-fqW_vwKuJzRqlcdsclioltMAoXg-iOc5uRIeoqSZ10821dKHhjlDO8b/exec",
  WHATSAPP_NUMBER: "6285242410880",
  UNDANGAN_DIGITAL_URL: "https://undangan.yourprint.my.id",
  /* Halaman pembayaran Market Digital di Lynk.id.
     GANTI URL ini jika halaman Lynk.id berubah. */
  DIGITAL_LYNK_URL: "https://lynk.id/market.digital123",
  /* Berapa menit data (produk, layanan, banner, dll) dianggap "segar"
     di localStorage. Selama masih segar, halaman tidak akan fetch ulang
     ke backend sehingga navigasi cepat dan tidak reload data. */
  DATA_TTL_MINUTES: 30
};

/* =========================================================================
   KONFIGURASI HARGA CETAK DOKUMEN — satu-satunya sumber harga.
   Ubah angka di bawah ini, harga di form otomatis menyesuaikan.
   ========================================================================= */
window.YOURPRINT_PRICE_CONFIG = {
  /* A. DOKUMEN BIASA — harga per lembar */
  document: {
    bw: 500,            // Hitam Putih / lembar
    color: 1000,        // Warna / lembar
    duplex: 0,          // Tambahan bolak-balik per lembar (0 = gratis)
    sizes: {            // Tambahan per lembar berdasarkan ukuran
      A4: 0,
      F4: 0,
      A5: 0
    }
  },

  /* B. SERTIFIKAT — harga paket per lembar */
  certificate: {
    standard: 5000,     // STANDARD
    glossy: 7000,       // GLOSSY PREMIUM
    premium: 10000,     // PREMIUM LAMINASI
    sizes: { A4: 0, A5: 0 }  // Tambahan per lembar berdasarkan ukuran
  },

  /* C. SKRIPSI & JILID — harga cetak per lembar + jilid & cover per eksemplar */
  thesis: {
    bw: 500,
    color: 1000,
    mixed: 500,         // Mode Campuran (placeholder — admin sesuaikan harga)
    binding: {          // Per eksemplar
      none: 0,
      spiral: 12000,
      softcover: 15000,
      hardcover: 30000
    },
    cover: {            // Per eksemplar
      none: 0,
      color: 5000,
      lamination: 10000
    }
  },

  /* D. CETAK KHUSUS — bahan per lembar; finishing & jilid per eksemplar */
  special: {
    bw: 500,
    color: 1500,        // Full Color
    paper: {            // Tambahan per lembar
      hvs: 0,
      art: 500,
      ivory: 800
    },
    finishing: {        // Per eksemplar
      none: 0,
      glossy: 2000,
      doff: 2000
    },
    binding: {          // Per eksemplar
      none: 0,
      spiral: 8000,
      heatglue: 12000
    }
  }
};
    