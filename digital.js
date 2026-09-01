/* ==========================================================
   YourPrint — digital.js
   Market Digital (etalase produk digital oleh YourPrint).
   Data kategori & produk kini dimuat dari backend (Google
   Apps Script) via action `getDigital`, dengan cache
   localStorage dan fallback ke data statis jika offline.

   Checkout tetap diarahkan ke halaman pembayaran Lynk.id.
   GANTI URL PEMBAYARAN di config.js → DIGITAL_LYNK_URL.
   (Fallback di bawah hanya dipakai jika config.js tidak ada.)
   ========================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------
     KONFIGURASI
  ------------------------------------------------------ */
  var DIGITAL_LYNK_URL = 'https://lynk.id/market.digital123';
  if (window.YOURPRINT_CONFIG && window.YOURPRINT_CONFIG.DIGITAL_LYNK_URL) {
    DIGITAL_LYNK_URL = window.YOURPRINT_CONFIG.DIGITAL_LYNK_URL;
  }

  function formatRupiah(n) {
    return 'Rp' + Number(n).toLocaleString('id-ID');
  }

  function fixGoogleDriveUrl(url) {
    if (!url) return '';
    if (url.indexOf('drive.google.com') !== -1 || url.indexOf('googleusercontent.com') !== -1) {
      var matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      var matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      var fileId = matchD ? matchD[1] : (matchId ? matchId[1] : null);
      if (fileId) return 'https://lh3.googleusercontent.com/d/' + fileId;
    }
    return url;
  }

  /* ------------------------------------------------------
     DATA KATEGORI MARKET DIGITAL
     STATIC_CATEGORIES dipakai sebagai cadangan (fallback)
     jika backend tidak dapat dihubungi / offline.
  ------------------------------------------------------ */
  var STATIC_CATEGORIES = [
    {
      id: 'ebook',
      title: 'Ebook',
      desc: 'Buku digital panduan & referensi siap baca kapan saja.',
      iconClass: '',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>'
    },
    {
      id: 'template-canva',
      title: 'Template Canva',
      desc: 'Desain siap edit untuk media sosial & keperluan bisnis.',
      iconClass: 'digital-cat-card__icon--stamp',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>'
    },
    {
      id: 'prompt-ai',
      title: 'Prompt AI',
      desc: 'Prompt siap pakai untuk ChatGPT & berbagai tools AI.',
      iconClass: 'digital-cat-card__icon--highlight',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.2L20 10.5l-5.6 2.3L12 19l-2.4-6.2L4 10.5l5.6-2.3L12 2Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></svg>'
    },
    {
      id: 'administrasi-sekolah',
      title: 'Administrasi Sekolah',
      desc: 'Perangkat guru & admin sekolah yang lengkap dan rapi.',
      iconClass: '',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>'
    },
    {
      id: 'template-excel',
      title: 'Template Excel',
      desc: 'Rumus & template otomatis untuk pekerjaan yang lebih rapi.',
      iconClass: 'digital-cat-card__icon--stamp',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>'
    },
    {
      id: 'bundle-bisnis',
      title: 'Bundle Bisnis',
      desc: 'Paket hemat lengkap untuk memulai dan mengelola bisnis.',
      iconClass: 'digital-cat-card__icon--highlight',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 13h20"/></svg>'
    }
  ];

  /* ------------------------------------------------------
     DATA PRODUK DIGITAL (fallback statis bila offline)
     field: id, name, category, price, oldPrice, badge,
            rating, ratingCount, cover (gradient), emoji, desc
  ------------------------------------------------------ */
  var STATIC_PRODUCTS = [
    {
      id: 'dcv-ats',
      name: 'Template CV ATS Modern — Desain ATS-Friendly',
      category: 'template-canva',
      price: 29000,
      oldPrice: 45000,
      badge: 'Diskon',
      rating: 4.9,
      ratingCount: 214,
      cover: 'linear-gradient(135deg, #1E3A8A, #4338CA)',
      emoji: '📄',
      desc: 'Template CV siap edit yang lolos screening ATS, cocok untuk semua profesi.'
    },
    {
      id: 'ebook-umkm',
      name: 'Ebook Panduan Bisnis UMKM dari Nol',
      category: 'ebook',
      price: 39000,
      oldPrice: null,
      badge: 'Bestseller',
      rating: 4.8,
      ratingCount: 178,
      cover: 'linear-gradient(135deg, #B45309, #EA580C)',
      emoji: '📘',
      desc: 'Panduan lengkap memulai dan mengembangkan UMKM untuk pemula.'
    },
    {
      id: 'prompt-500',
      name: 'Prompt AI ChatGPT 500+ Siap Pakai',
      category: 'prompt-ai',
      price: 19000,
      oldPrice: 29000,
      badge: 'Diskon',
      rating: 4.7,
      ratingCount: 321,
      cover: 'linear-gradient(135deg, #0F172A, #334155)',
      emoji: '✨',
      desc: 'Koleksi prompt terkurasi untuk kerja, belajar, dan bisnis.'
    },
    {
      id: 'adm-kelas',
      name: 'Administrasi Kelas Lengkap SD/MI',
      category: 'administrasi-sekolah',
      price: 49000,
      oldPrice: null,
      badge: 'Bestseller',
      rating: 5.0,
      ratingCount: 96,
      cover: 'linear-gradient(135deg, #065F46, #059669)',
      emoji: '📚',
      desc: 'Perangkat administrasi wali kelas lengkap, tinggal print.'
    },
    {
      id: 'xls-rapor',
      name: 'Template Rapor & Nilai Excel Otomatis',
      category: 'template-excel',
      price: 25000,
      oldPrice: null,
      badge: 'Terbaru',
      rating: 4.6,
      ratingCount: 143,
      cover: 'linear-gradient(135deg, #14532D, #16A34A)',
      emoji: '📊',
      desc: 'Rekap nilai & rapor otomatis dengan rumus siap pakai.'
    },
    {
      id: 'bundle-startup',
      name: 'Bundle Bisnis Starter Pack',
      category: 'bundle-bisnis',
      price: 79000,
      oldPrice: 119000,
      badge: 'Diskon',
      rating: 4.9,
      ratingCount: 87,
      cover: 'linear-gradient(135deg, #7C2D12, #C2410C)',
      emoji: '💼',
      desc: 'Paket hemat: proposal, surat, SOP, dan tools bisnis dalam satu bundle.'
    },
    {
      id: 'tpl-proposal',
      name: 'Template Proposal Bisnis Modern',
      category: 'template-canva',
      price: 35000,
      oldPrice: null,
      badge: null,
      rating: 4.8,
      ratingCount: 64,
      cover: 'linear-gradient(135deg, #1E40AF, #6366F1)',
      emoji: '🗂️',
      desc: 'Proposal profesional siap edit untuk presentasi investor & klien.'
    },
    {
      id: 'ebook-copywriting',
      name: 'Ebook Copywriting untuk Pemula',
      category: 'ebook',
      price: 29000,
      oldPrice: null,
      badge: 'Terbaru',
      rating: 4.7,
      ratingCount: 52,
      cover: 'linear-gradient(135deg, #9A3412, #F97316)',
      emoji: '✍️',
      desc: 'Teknik menulis konten pemasaran yang menarik dan mengubah pembaca.'
    },
    {
      id: 'prompt-bisnis',
      name: 'Prompt AI Bisnis & Pemasaran',
      category: 'prompt-ai',
      price: 24000,
      oldPrice: null,
      badge: null,
      rating: 4.6,
      ratingCount: 41,
      cover: 'linear-gradient(135deg, #1E293B, #475569)',
      emoji: '🧠',
      desc: 'Prompt khusus untuk riset pasar, konten, dan strategi pemasaran.'
    },
    {
      id: 'adm-merdeka',
      name: 'Administrasi Guru Kurikulum Merdeka',
      category: 'administrasi-sekolah',
      price: 59000,
      oldPrice: null,
      badge: 'Bestseller',
      rating: 4.9,
      ratingCount: 73,
      cover: 'linear-gradient(135deg, #0F766E, #0D9488)',
      emoji: '📝',
      desc: 'Lengkap: modul ajar, ATP, CP, dan perangkat pembelajaran Merdeka.'
    }
  ];

  /* ------------------------------------------------------
     DATA DINAMIS — dimuat dari backend (getDigital)
     dengan cache localStorage + fallback ke STATIC_*
  ------------------------------------------------------ */
  var GAS_URL = '';
  if (window.YOURPRINT_CONFIG && window.YOURPRINT_CONFIG.GAS_URL) {
    GAS_URL = window.YOURPRINT_CONFIG.GAS_URL;
  }

  var CATEGORIES = [];
  var PRODUCTS = [];

  var ICON_PRESETS = {
    ebook: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>',
    template: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
    prompt: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.2L20 10.5l-5.6 2.3L12 19l-2.4-6.2L4 10.5l5.6-2.3L12 2Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></svg>',
    admin: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>',
    excel: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
    bundle: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 13h20"/></svg>',
    other: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>'
  };

  function iconHTML(c) {
    var svg = ICON_PRESETS[c.icon] || ICON_PRESETS.other;
    return '<div class="digital-cat-card__icon ' + (c.iconClass || '') + '">' + svg + '</div>';
  }

  function sortByOrder(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    });
  }

  function normalizeKategori(list) {
    return (list || []).map(function (c) {
      return { id: c.id, title: c.title, desc: c.desc, icon: c.icon, iconClass: c.iconClass, order: c.order };
    });
  }

  function normalizeProduk(list) {
    return (list || []).map(function (p) {
      return {
        id: p.id, name: p.name, category: p.category, price: p.price,
        oldPrice: p.oldPrice, badge: p.badge, rating: p.rating,
        ratingCount: p.ratingCount, cover: p.cover, emoji: p.emoji,
        desc: p.desc, link: p.link, image: p.image, order: p.order
      };
    });
  }

  var CACHE_TTL = 24 * 60 * 60 * 1000;
  if (window.YOURPRINT_CONFIG && Number(window.YOURPRINT_CONFIG.DATA_TTL_MINUTES) > 0) {
    CACHE_TTL = Number(window.YOURPRINT_CONFIG.DATA_TTL_MINUTES) * 60 * 1000;
  }

  function loadDigitalData(cb) {
    var finish = function () { if (typeof cb === 'function') cb(); };

    // Fallback awal: cache localStorage (hanya jika masih segar) → statis
    var useCached = function () {
      try {
        var ts = Number(localStorage.getItem('yp_digital_ts') || 0);
        if (!ts || Date.now() - ts > CACHE_TTL) return false;
        var ck = JSON.parse(localStorage.getItem('yp_digital_kategori') || 'null');
        var pk = JSON.parse(localStorage.getItem('yp_digital_produk') || 'null');
        if (ck && pk && ck.length && pk.length) {
          CATEGORIES = normalizeKategori(ck);
          PRODUCTS = normalizeProduk(pk);
          return true;
        }
      } catch (e) {}
      return false;
    };

    if (!GAS_URL) {
      if (!useCached()) {
        CATEGORIES = normalizeKategori(STATIC_CATEGORIES);
        PRODUCTS = normalizeProduk(STATIC_PRODUCTS);
      }
      finish();
      return;
    }

    // Cache masih segar → langsung tampil, TANPA fetch ke backend.
    if (useCached()) {
      finish();
      return;
    }

    fetch(GAS_URL + '?action=getDigital&t=' + Date.now())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.result === 'success' && data.kategori && data.produk) {
          if (data.pengaturan && data.pengaturan.digital_global_link) {
            DIGITAL_LYNK_URL = data.pengaturan.digital_global_link;
          }
          CATEGORIES = normalizeKategori(data.kategori);
          PRODUCTS = normalizeProduk(data.produk);
          try {
            localStorage.setItem('yp_digital_kategori', JSON.stringify(CATEGORIES));
            localStorage.setItem('yp_digital_produk', JSON.stringify(PRODUCTS));
            localStorage.setItem('yp_digital_ts', String(Date.now()));
          } catch (e) {}
        } else {
          throw new Error('respon tidak valid');
        }
      })
      .catch(function () {
        if (!useCached()) {
          CATEGORIES = normalizeKategori(STATIC_CATEGORIES);
          PRODUCTS = normalizeProduk(STATIC_PRODUCTS);
        }
      })
      .then(function () { finish(); });
  }

  function getCategory(id) {
    return CATEGORIES.find(function (c) { return c.id === id; }) || null;
  }

  function categoryTitle(id) {
    var c = getCategory(id);
    return c ? c.title : 'Digital';
  }

  function badgeHTML(p) {
    if (!p.badge) return '';
    var cls = 'digital-card__badge--' + p.badge.toLowerCase();
    var label;
    if (p.badge === 'Diskon' && p.oldPrice) {
      var percent = Math.round((1 - p.price / p.oldPrice) * 100);
      label = '🔥 -' + percent + '%';
    } else if (p.badge === 'Bestseller') {
      label = '⭐ Bestseller';
    } else {
      label = '✨ Terbaru';
    }
    return '<span class="digital-card__badge ' + cls + '">' + label + '</span>';
  }

  function ratingStars(rating) {
    var filled = Math.floor(rating || 0);
    var empty = 5 - filled;
    return '<span class="digital-card__stars">' +
      '★'.repeat(filled) +
      '<span class="digital-card__stars-empty">' + '★'.repeat(empty) + '</span>' +
      '</span>';
  }

  /* ------------------------------------------------------
     HTML CARD PRODUK DIGITAL
  ------------------------------------------------------ */
  function productCardHTML(p) {
    var link = p.link || DIGITAL_LYNK_URL;
    var oldPrice = p.oldPrice ? '<span class="digital-card__price-old">' + formatRupiah(p.oldPrice) + '</span>' : '';

    var imgUrl = fixGoogleDriveUrl(p.image);
    var coverMedia;
    if (imgUrl) {
      coverMedia = '<img src="' + imgUrl + '" alt="' + p.name + '" loading="lazy" class="digital-card__cover-img" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'block\';">' +
        '<span class="digital-card__cover-emoji" style="display:none;">' + (p.emoji || '📦') + '</span>';
    } else {
      coverMedia = '<span class="digital-card__cover-emoji">' + (p.emoji || '📦') + '</span>';
    }

    var rating = Number(p.rating) || 0;
    var ratingCount = Number(p.ratingCount) || 0;
    var ratingHtml = '';
    if (rating > 0) {
      ratingHtml = '<div class="digital-card__rating">' +
        ratingStars(rating) +
        '<span>' + rating.toFixed(1) + ' (' + ratingCount + ')</span>' +
        '</div>';
    }

    return '' +
      '<div class="digital-card reveal">' +
        '<div class="digital-card__cover" style="background:' + (p.cover || 'linear-gradient(135deg, #334155, #0F172A)') + '">' +
          badgeHTML(p) +
          coverMedia +
        '</div>' +
        '<div class="digital-card__body">' +
          '<span class="digital-card__cat">' + categoryTitle(p.category) + '</span>' +
          '<h3 class="digital-card__name">' + p.name + '</h3>' +
          '<div class="digital-card__price-row">' +
            '<span class="digital-card__price">' + formatRupiah(p.price) + '</span>' +
            oldPrice +
          '</div>' +
          ratingHtml +
          '<a href="' + link + '" target="_blank" rel="noopener" class="digital-card__buy">' +
            'Beli Sekarang' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------
     HTML BARIS PRODUK DIGITAL (landing page / index.html)
     Baris list yang seluruh area-nya bisa diklik.
  ------------------------------------------------------ */
  function landingProductRowHTML(p) {
    var link = p.link || DIGITAL_LYNK_URL;
    var oldPrice = p.oldPrice ? '<span class="digital-row__price-old">' + formatRupiah(p.oldPrice) + '</span>' : '';

    var imgUrl = fixGoogleDriveUrl(p.image);
    var coverMedia;
    if (imgUrl) {
      coverMedia = '<img src="' + imgUrl + '" alt="' + p.name + '" loading="lazy" class="digital-row__cover-img" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
        '<span class="digital-row__cover-emoji" style="display:none;">' + (p.emoji || '📦') + '</span>';
    } else {
      coverMedia = '<span class="digital-row__cover-emoji">' + (p.emoji || '📦') + '</span>';
    }

    var rating = Number(p.rating) || 0;
    var ratingCount = Number(p.ratingCount) || 0;
    var ratingHtml = '';
    if (rating > 0) {
      ratingHtml = '<span class="digital-row__rating">' +
        ratingStars(rating) +
        '<span class="digital-row__rating-text">' + rating.toFixed(1) + ' (' + ratingCount + ')</span>' +
        '</span>';
    }

    return '' +
      '<a href="' + link + '" target="_blank" rel="noopener" class="digital-row reveal">' +
        '<span class="digital-row__cover" style="background:' + (p.cover || 'linear-gradient(135deg, #334155, #0F172A)') + '">' +
          badgeHTML(p) +
          coverMedia +
        '</span>' +
        '<span class="digital-row__body">' +
          '<span class="digital-row__cat">' + categoryTitle(p.category) + '</span>' +
          '<span class="digital-row__name">' + p.name + '</span>' +
          '<span class="digital-row__price-row">' +
            '<span class="digital-row__price">' + formatRupiah(p.price) + '</span>' +
            oldPrice +
          '</span>' +
          ratingHtml +
        '</span>' +
        '<span class="digital-row__arrow" aria-hidden="true">' +
          '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' +
        '</span>' +
      '</a>';
  }

  /* ------------------------------------------------------
     RENDER: Landing page (index.html)
  ------------------------------------------------------ */
  function renderLandingCategories() {
    var el = document.getElementById('digitalCategories');
    if (!el) return;
    el.innerHTML = sortByOrder(CATEGORIES).map(function (c) {
      return '' +
        '<a href="digital.html?kategori=' + c.id + '" class="digital-cat-card reveal">' +
          iconHTML(c) +
          '<h3 class="font-display font-bold text-[0.95rem] mt-3">' + c.title + '</h3>' +
          '<p class="text-slate-soft text-xs mt-1 leading-relaxed">' + c.desc + '</p>' +
          '<span class="digital-cat-card__link">Lihat Produk' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>' +
          '</span>' +
        '</a>';
    }).join('');
  }

  function renderLandingProducts() {
    var el = document.getElementById('digitalProducts');
    if (!el) return;
    var limit = 8;
    var sorted = sortByOrder(PRODUCTS);
    el.innerHTML = sorted.slice(0, limit).map(landingProductRowHTML).join('');
  }

  /* ------------------------------------------------------
     RENDER: Halaman katalog (digital.html)
  ------------------------------------------------------ */
  var catalogState = {
    cat: 'semua',
    keyword: ''
  };

  function renderCatalogTabs() {
    var el = document.getElementById('digitalCatalogTabs');
    if (!el) return;
    var all = [{ id: 'semua', title: 'Semua' }].concat(sortByOrder(CATEGORIES).map(function (c) {
      return { id: c.id, title: c.title };
    }));
    el.innerHTML = all.map(function (c) {
      var active = c.id === catalogState.cat ? ' is-active' : '';
      return '<button class="quicknav-pill' + active + '" data-cat="' + c.id + '">' + c.title + '</button>';
    }).join('');
  }

  function renderCatalogGrid() {
    var el = document.getElementById('digitalCatalogGrid');
    var countEl = document.getElementById('digitalCatalogCount');
    var emptyEl = document.getElementById('digitalCatalogEmpty');
    if (!el) return;

    var keyword = catalogState.keyword.trim().toLowerCase();
    var list = sortByOrder(PRODUCTS).filter(function (p) {
      var matchCat = catalogState.cat === 'semua' || p.category === catalogState.cat;
      var matchKey = !keyword ||
        p.name.toLowerCase().indexOf(keyword) !== -1 ||
        categoryTitle(p.category).toLowerCase().indexOf(keyword) !== -1;
      return matchCat && matchKey;
    });

    if (countEl) countEl.textContent = list.length;

    if (list.length === 0) {
      el.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    el.innerHTML = list.map(productCardHTML).join('');
  }

  function initCatalog() {
    var params = new URLSearchParams(window.location.search);
    var initial = params.get('kategori');
    if (initial && CATEGORIES.some(function (c) { return c.id === initial; })) {
      catalogState.cat = initial;
    }

    renderCatalogTabs();
    renderCatalogGrid();

    var tabs = document.getElementById('digitalCatalogTabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var btn = e.target.closest('.quicknav-pill');
        if (!btn) return;
        catalogState.cat = btn.dataset.cat;
        renderCatalogTabs();
        renderCatalogGrid();
        var wrap = document.getElementById('digitalCatalogResult');
        if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    var search = document.getElementById('digitalCatalogSearch');
    var clearBtn = document.getElementById('digitalCatalogSearchClear');
    if (search) {
      search.addEventListener('input', function () {
        catalogState.keyword = search.value;
        if (clearBtn) clearBtn.classList.toggle('hidden', search.value.length === 0);
        renderCatalogGrid();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        search.value = '';
        catalogState.keyword = '';
        clearBtn.classList.add('hidden');
        renderCatalogGrid();
        search.focus();
      });
    }
  }

  /* ------------------------------------------------------
     SCROLL REVEAL (animasi ringan)
  ------------------------------------------------------ */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------
     INIT
  ------------------------------------------------------ */
  // Tandai halaman "aktif JS" lebih awal agar animasi reveal
  // tidak membuat konten tersembunyi saat JS tidak berjalan.
  document.documentElement.classList.add('js-digital');

  document.addEventListener('DOMContentLoaded', function () {
    loadDigitalData(function () {
      renderLandingCategories();
      renderLandingProducts();
      initCatalog();
      initReveal();
    });
  });

})();
