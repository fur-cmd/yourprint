/* ==========================================================
   YourPrint — stiker.js
   Wizard pemesanan Cetak Stiker (multi-langkah):
   Jenis → Spesifikasi (bentuk/ukuran/bahan/finishing/potongan/jumlah)
   → Desain → Pesanan (ringkasan + checkout WhatsApp).
   Semua pilihan & harga berasal dari sticker-config.js.
   ========================================================== */
(function () {
  'use strict';

  var CFG = window.YOURPRINT_STICKER_CONFIG || {};
  var APP = window.YOURPRINT_CONFIG || {};

  /* ----------------------------------------------------------
     Harga & pilihan bisa ditimpa dari halaman ADMIN:
     kolom "Options Ukuran & Harga (JSON)" pada baris layanan
     "Cetak Stiker" di sheet "Layanan Cetak" (pesanan.html
     meneruskannya lewat window.YP_STICKER_RUNTIME_OPTIONS).
     JSON tersebut di-merge DEEP di atas sticker-config.js.
     Bila kosong / salah format, sticker-config.js tetap dipakai.
     ---------------------------------------------------------- */
  var RUNTIME_CFG = window.YP_STICKER_RUNTIME_OPTIONS || null;
  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
  }
  function deepMerge(base, extra) {
    if (!isPlainObject(extra)) return base;
    if (!isPlainObject(base)) return extra;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra).forEach(function (k) {
      var bv = base[k], ev = extra[k];
      if (isPlainObject(bv) && isPlainObject(ev)) out[k] = deepMerge(bv, ev);
      else out[k] = ev;
    });
    return out;
  }
  if (isPlainObject(RUNTIME_CFG)) {
    CFG = deepMerge(CFG, RUNTIME_CFG);
  }

  var LS_KEY = 'yp_sticker_draft';
  var CHECKOUT_INDEX = 8;

  /* ================= ICONS ================= */
  var SHAPE_ICONS = {
    'kotak': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="10" y="10" width="28" height="28" rx="3" class="shape-fill"/></svg>',
    'persegi-panjang': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="4" y="16" width="40" height="16" rx="3" class="shape-fill"/></svg>',
    'bulat': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="15" class="shape-fill"/></svg>',
    'oval': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><ellipse cx="24" cy="24" rx="19" ry="12" class="shape-fill"/></svg>',
    'custom': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M16 8 C32 5, 42 16, 38 28 C34 39, 12 42, 7 31 C3 21, 7 12, 16 8 Z" class="shape-fill"/></svg>'
  };

  var CUT_ICONS = {
    'lembar': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<rect x="5" y="5" width="38" height="38" rx="3" class="shape-fill"/>' +
      '<g stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.5 2.5" opacity=".55">' +
      '<path d="M5 17h38M5 29h38M17 5v38M29 5v38"/></g></svg>',
    'kiss': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<rect x="5" y="5" width="38" height="38" rx="3" class="shape-fill" opacity=".35"/>' +
      '<rect x="16" y="16" width="16" height="16" rx="2" class="shape-fill" stroke-dasharray="3 2.5" opacity=".9"/></svg>',
    'die': '<svg class="stk-shape-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<circle cx="16" cy="18" r="6" class="shape-fill"/>' +
      '<path d="M26 34 l2.6 5.4 6 .9 -4.3 4.2 1 6 -5.3 -2.8 -5.3 2.8 1 -6 -4.3 -4.2 6 -.9z" class="shape-fill"/>' +
      '<rect x="30" y="8" width="10" height="10" rx="2" class="shape-fill" opacity=".8"/></svg>'
  };

  /* ================= STATE ================= */
  var state = loadState();

  function defaultOrder() {
    return {
      typeId: null,
      shapeId: null,
      sizeMode: 'preset',
      sizePresetIndex: -1,
      customW: '',
      customH: '',
      materialId: null,
      finishingId: null,
      cutId: null,
      qty: '',
      file: null,
      fileOrderId: '',
      designCheck: false,
      submitted: false,
      customer: { name: '', phone: '', address: '', payment: 'Tunai', notes: '' }
    };
  }

  function loadState() {
    var st = { current: 0, order: defaultOrder() };
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.order) {
          st.current = Math.min(Math.max(Number(d.current) || 0, 0), CHECKOUT_INDEX);
          st.order = mergeOrder(d.order);
        }
      }
    } catch (e) {}
    return st;
  }

  function mergeOrder(d) {
    var o = defaultOrder();
    ['typeId', 'shapeId', 'materialId', 'finishingId', 'cutId'].forEach(function (k) {
      if (d[k]) o[k] = d[k];
    });
    ['sizeMode', 'customW', 'customH', 'fileOrderId', 'qty', 'designCheck', 'submitted'].forEach(function (k) {
      if (d[k] !== undefined && d[k] !== null && d[k] !== '') o[k] = d[k];
    });
    o.sizePresetIndex = (typeof d.sizePresetIndex === 'number' && d.sizePresetIndex >= 0) ? d.sizePresetIndex : -1;
    if (d.file) o.file = d.file;
    if (d.customer) {
      ['name', 'phone', 'address', 'payment', 'notes'].forEach(function (k) {
        if (d.customer[k] !== undefined) o.customer[k] = d.customer[k];
      });
    }
    return o;
  }

  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ================= STEPS ================= */
  var STEPS = [
    { id: 'type', group: 0, nav: 'Jenis' },
    { id: 'shape', group: 1, nav: 'Bentuk' },
    { id: 'size', group: 1, nav: 'Ukuran' },
    { id: 'material', group: 1, nav: 'Bahan' },
    { id: 'finishing', group: 1, nav: 'Finishing' },
    { id: 'cut', group: 1, nav: 'Potongan' },
    { id: 'quantity', group: 1, nav: 'Jumlah' },
    { id: 'design', group: 2, nav: 'Desain' },
    { id: 'checkout', group: 3, nav: 'Pesanan' }
  ];
  var SPEC_STEPS = [1, 2, 3, 4, 5, 6];
  var SPEC_NAV = ['Bentuk', 'Ukuran', 'Bahan', 'Finishing', 'Potongan', 'Jumlah'];

  function findBy(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function selType() { return findBy(CFG.types || [], state.order.typeId); }
  function selShape() { return findBy(CFG.shapes || [], state.order.shapeId); }
  function selMaterial() { return findBy(CFG.materials || [], state.order.materialId); }
  function selFinishing() { return findBy(CFG.finishing || [], state.order.finishingId); }
  function selCut() { return findBy(CFG.cutTypes || [], state.order.cutId); }

  function areaFor(shapeId, w, h) {
    if (shapeId === 'bulat') return Math.PI * (w / 2) * (w / 2);
    if (shapeId === 'oval') return Math.PI * (w / 2) * (h / 2);
    return w * h;
  }

  function sizeLabel(shapeId, w, h) {
    if (shapeId === 'bulat') return 'Diameter ' + w + ' cm';
    return w + ' × ' + h + ' cm';
  }

  function resolveSize() {
    var o = state.order;
    var w, h;
    if (o.sizeMode === 'custom') {
      w = parseFloat(o.customW);
      h = (o.shapeId === 'bulat') ? w : parseFloat(o.customH);
      if (!isFinite(w) || w <= 0 || !isFinite(h) || h <= 0) return null;
    } else {
      var list = (CFG.sizes || {})[o.shapeId] || [];
      var s = list[o.sizePresetIndex];
      if (!s) return null;
      w = s.w; h = s.h;
    }
    return { label: sizeLabel(o.shapeId, w, h), w: w, h: h, area: areaFor(o.shapeId, w, h) };
  }

  /* ================= VALIDATION ================= */
  function validateStep(idx) {
    var o = state.order;
    switch (STEPS[idx].id) {
      case 'type': return o.typeId ? '' : 'Silakan pilih jenis kebutuhan stiker terlebih dahulu.';
      case 'shape': return o.shapeId ? '' : 'Silakan pilih bentuk stiker terlebih dahulu.';
      case 'size': return sizeError();
      case 'material': return o.materialId ? '' : 'Silakan pilih bahan stiker terlebih dahulu.';
      case 'finishing': return o.finishingId ? '' : 'Silakan pilih finishing stiker terlebih dahulu.';
      case 'cut': return o.cutId ? '' : 'Silakan pilih jenis potongan terlebih dahulu.';
      case 'quantity': return qtyError();
      case 'design': return o.file ? '' : 'Silakan upload desain stiker terlebih dahulu.';
      case 'checkout': return customerError();
    }
    return '';
  }

  function sizeError() {
    var o = state.order;
    if (o.sizeMode === 'preset') return o.sizePresetIndex >= 0 ? '' : 'Silakan pilih ukuran populer, atau isi ukuran custom.';
    var w = parseFloat(o.customW);
    var h = (o.shapeId === 'bulat') ? w : parseFloat(o.customH);
    if (o.shapeId === 'bulat') {
      if (!isFinite(w) || w <= 0) return 'Silakan masukkan diameter stiker (mis. 5 cm).';
      if (w < CFG.customSize.min || w > CFG.customSize.max) return 'Diameter stiker harus antara ' + CFG.customSize.min + '–' + CFG.customSize.max + ' cm.';
      return '';
    }
    if (!isFinite(w) || w <= 0 || !isFinite(h) || h <= 0) return 'Silakan isi lebar dan tinggi ukuran stiker (lebih dari 0 cm).';
    if (w < CFG.customSize.min || h < CFG.customSize.min || w > CFG.customSize.max || h > CFG.customSize.max) {
      return 'Ukuran stiker harus antara ' + CFG.customSize.min + '–' + CFG.customSize.max + ' cm.';
    }
    return '';
  }

  function qtyError() {
    var q = parseInt(state.order.qty, 10);
    if (!(q > 0)) return 'Silakan pilih atau masukkan jumlah pesanan.';
    if (q < (CFG.minQuantity || 1)) return 'Jumlah minimal ' + (CFG.minQuantity || 1) + ' pcs.';
    if (q > (CFG.maxQuantity || 100000)) return 'Jumlah terlalu besar (maks. ' + (CFG.maxQuantity || 100000) + ' pcs). Hubungi kami untuk pesanan sangat besar.';
    return '';
  }

  function customerError() {
    var c = state.order.customer;
    if (!c.name || !String(c.name).trim()) return 'Mohon isi nama Anda terlebih dahulu.';
    if (!c.phone || !String(c.phone).trim()) return 'Mohon isi nomor WhatsApp Anda terlebih dahulu.';
    return '';
  }

  function firstIncomplete() {
    for (var i = 0; i < CHECKOUT_INDEX; i++) {
      var err = validateStep(i);
      if (err) return i;
    }
    return -1;
  }

  /* ================= PRICING ================= */
  function round100(n) { return Math.round(n / 100) * 100; }

  function computeEstimate() {
    var o = state.order;
    var p = (CFG.pricing) || {};
    if (!o.shapeId || !o.materialId || !o.finishingId || !o.cutId) return null;
    var qtyN = parseInt(o.qty, 10);
    if (!(qtyN > 0)) return null;
    var size = resolveSize();
    if (!size) return null;

    var base;
    var ov = (p.sizePriceOverrides || {});
    var shapeOv = ov[o.shapeId];
    if (shapeOv && shapeOv[size.label] != null) {
      base = Number(shapeOv[size.label]);
    } else {
      base = (Number(p.basePrice) || 0) * (size.area / (Number(p.referenceAreaCm2) || 25));
    }
    if (o.shapeId === 'custom') {
      base = Math.min(base, (Number(p.basePrice) || 0) * (Number(p.customSizeMultiplierMax) || 4));
    }

    var mat = Number((p.materialPrice || {})[o.materialId]) || 0;
    var fin = Number((p.finishingPrice || {})[o.finishingId]) || 0;
    var cut = Number((p.cuttingPrice || {})[o.cutId]) || 0;
    var unit = Math.max(0, Math.round(base + mat + fin + cut));

    var tiers = (p.quantityTiers || []).slice().sort(function (a, b) { return a.from - b.from; });
    var tier = tiers[0] || { from: 1, discountPct: 0 };
    tiers.forEach(function (t) { if (qtyN >= t.from) tier = t; });
    var pct = Number(tier.discountPct) || 0;

    var subtotal = unit * qtyN;
    var discount = Math.round(subtotal * pct / 100);
    var total = round100(Math.max(0, subtotal - discount));

    return {
      size: size.label,
      qty: qtyN,
      base: Math.round(base),
      mat: mat,
      fin: fin,
      cut: cut,
      unit: unit,
      pct: pct,
      subtotal: subtotal,
      discount: discount,
      total: total
    };
  }

  /* ================= FORMATTERS ================= */
  function formatRupiah(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function fmtDelta(n) {
    n = Number(n) || 0;
    if (n === 0) return 'Rp0';
    return (n < 0 ? '−Rp' + Math.abs(n).toLocaleString('id-ID') : '+Rp' + n.toLocaleString('id-ID'));
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function formatSize(bytes) {
    bytes = Number(bytes) || 0;
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + 'KB';
    return bytes ? bytes + 'B' : '';
  }

  /* ================= CARD & SHELL HELPERS ================= */
  function cardHTML(opts) {
    var cls = ['stk-card'];
    if (opts.selected) cls.push('is-selected');
    if (opts.disabled) cls.push('is-disabled');
    return '<button type="button" role="radio" aria-checked="' + (opts.selected ? 'true' : 'false') + '"' +
      (opts.disabled ? ' disabled' : '') +
      ' class="' + cls.join(' ') + '" data-id="' + escapeHtml(opts.id) + '">' +
      (opts.icon ? '<span class="stk-card__icon">' + opts.icon + '</span>' : '') +
      '<span class="stk-card__body">' +
      '<span class="stk-card__title">' + opts.title + '</span>' +
      (opts.desc ? '<span class="stk-card__desc">' + opts.desc + '</span>' : '') +
      (opts.note ? '<span class="stk-card__note">' + opts.note + '</span>' : '') +
      '</span>' +
      '<span class="stk-card__check" aria-hidden="true">✓</span>' +
      '</button>';
  }

  function stepShell(title, sub, bodyHTML, error, footerHTML) {
    var err = error && error.length ? '<div class="stk-error mb-3" role="alert">⚠️ ' + escapeHtml(error) + '</div>' : '';
    return '<div class="stk-step stk-reveal">' +
      err +
      '<h2 class="stk-step-title">' + title + '</h2>' +
      (sub ? '<p class="stk-step-title-sub mt-1 mb-4">' + sub + '</p>' : '<div class="mt-1 mb-4"></div>') +
      bodyHTML +
      footerHTML +
      '</div>';
  }

  function navFooter() {
    var backDisabled = state.current === 0 ? ' disabled' : '';
    return '<div class="flex items-center justify-between gap-3 mt-6" style="padding-bottom:env(safe-area-inset-bottom);">' +
      '<button type="button" class="stk-btn-back" id="stkBack"' + backDisabled + '>← Kembali</button>' +
      '<button type="button" class="stk-btn-primary" id="stkNext">Lanjut →</button>' +
      '</div>';
  }

  function scrollTop() {
    if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================= RENDER STEP (umum) ================= */
  function renderStep(idx, error, extra) {
    if (idx < 0 || idx > CHECKOUT_INDEX) return;
    state.current = idx;
    saveState();
    renderProgress();

    if (STEPS[idx].id === 'design') {
      renderDesignStep(error);
      updateSummary();
      return;
    }

    var box = document.getElementById('stepContent');
    var html = '';
    switch (STEPS[idx].id) {
      case 'type': html = renderTypeStep(error); break;
      case 'shape': html = renderShapeStep(error); break;
      case 'size': html = renderSizeStep(error); break;
      case 'material': html = renderMaterialStep(error); break;
      case 'finishing': html = renderFinishingStep(error); break;
      case 'cut': html = renderCutStep(error); break;
      case 'quantity': html = renderQuantityStep(error); break;
      case 'checkout': html = renderCheckoutStep(error); break;
    }
    box.innerHTML = html;
    bindNav();
    bindStepEvents(STEPS[idx].id);
    updateSummary();
    scrollTop();
  }

  /* ================= RENDER TYPES ================= */
  function renderTypeStep(error) {
    var cards = (CFG.types || []).map(function (t) {
      return cardHTML({ id: t.id, title: t.title, desc: t.desc, icon: t.icon, selected: state.order.typeId === t.id });
    }).join('');
    return stepShell('Mau Buat Stiker Untuk Apa?', 'Pilih jenis kebutuhan Anda agar kami dapat membantu menyesuaikan pesanan.',
      '<div class="stk-grid stk-grid--2" id="typeCards">' + cards + '</div>', error, navFooter());
  }

  function renderShapeStep(error) {
    var cards = (CFG.shapes || []).map(function (s) {
      var note = (s.id === 'custom') ? s.note : '';
      return cardHTML({ id: s.id, title: s.title, desc: s.desc, icon: SHAPE_ICONS[s.id] || '', note: note, selected: state.order.shapeId === s.id });
    }).join('');
    return stepShell('Pilih Bentuk Stiker', 'Bentuk memengaruhi cara stiker dipotong.',
      '<div class="stk-grid stk-grid--2" id="shapeCards">' + cards + '</div>', error, navFooter());
  }

  function renderSizeStep(error) {
    var o = state.order;
    var list = (CFG.sizes || {})[o.shapeId] || [];
    var chips = list.map(function (s, i) {
      var label = s.label || sizeLabel(o.shapeId, s.w, s.h);
      var sel = (o.sizeMode === 'preset' && o.sizePresetIndex === i);
      return '<button type="button" role="radio" aria-checked="' + sel + '" class="stk-size-chip' + (sel ? ' is-selected' : '') + '" data-i="' + i + '">' + label + '</button>';
    }).join('') || '<p class="text-sm text-slate-soft">Tidak ada ukuran populer untuk bentuk ini. Gunakan ukuran custom di bawah.</p>';

    var isBulat = o.shapeId === 'bulat';
    var customInputs = isBulat
      ? '<div><label class="stk-label" for="stkCW">Diameter (cm)</label>' +
        '<input class="stk-input" id="stkCW" type="number" inputmode="decimal" min="' + CFG.customSize.min + '" max="' + CFG.customSize.max + '" placeholder="mis. 5" value="' + escapeHtml(o.customW) + '"></div>'
      : '<div><label class="stk-label" for="stkCW">Lebar (cm)</label>' +
        '<input class="stk-input" id="stkCW" type="number" inputmode="decimal" min="' + CFG.customSize.min + '" max="' + CFG.customSize.max + '" placeholder="mis. 5" value="' + escapeHtml(o.customW) + '"></div>' +
        '<div><label class="stk-label" for="stkCH">Tinggi (cm)</label>' +
        '<input class="stk-input" id="stkCH" type="number" inputmode="decimal" min="' + CFG.customSize.min + '" max="' + CFG.customSize.max + '" placeholder="mis. 7" value="' + escapeHtml(o.customH) + '"></div>';

    var body =
      '<div class="bg-white border border-line rounded-xl p-4 mb-4">' +
      '<p class="stk-label" style="margin-bottom:.6rem;">A. Ukuran Populer</p>' +
      '<div class="flex flex-wrap gap-2" id="sizeChips">' + chips + '</div>' +
      '</div>' +
      '<div class="bg-white border border-line rounded-xl p-4">' +
      '<p class="stk-label" style="margin-bottom:.6rem;">B. Ukuran Custom</p>' +
      '<div class="' + (isBulat ? 'max-w-xs' : 'grid grid-cols-2 gap-3') + '">' + customInputs + '</div>' +
      '<p class="stk-helper">Belum yakin dengan ukuran yang tepat? Pilih ukuran perkiraan, tim YourPrint dapat membantu memeriksa sebelum produksi.</p>' +
      '</div>';

    return stepShell('Tentukan Ukuran Stiker', 'Pilih ukuran yang paling sesuai, atau masukkan ukuran custom Anda.', body, error, navFooter());
  }

  function renderMaterialStep(error) {
    var cards = (CFG.materials || []).map(function (m) {
      return cardHTML({ id: m.id, title: m.name, desc: m.desc, selected: state.order.materialId === m.id });
    }).join('');
    return stepShell('Pilih Bahan Stiker', 'Bahan menentukan daya tahan dan hasil akhir stiker Anda.',
      '<div class="stk-grid stk-grid--2" id="materialCards">' + cards + '</div>', error, navFooter());
  }

  function renderFinishingStep(error) {
    var o = state.order;
    var cards = (CFG.finishing || []).map(function (f) {
      var dis = false, reason = '';
      var disMap = f.disabledFor || {};
      if (disMap[o.materialId]) { dis = true; reason = disMap[o.materialId]; }
      return cardHTML({ id: f.id, title: f.name, desc: reason || f.desc, disabled: dis, selected: !dis && o.finishingId === f.id });
    }).join('');
    return stepShell('Pilih Finishing',
      'Laminasi membantu memberikan perlindungan tambahan dan meningkatkan tampilan stiker.',
      '<div class="stk-grid stk-grid--3" id="finishingCards">' + cards + '</div>' +
      '<p class="stk-helper mt-3">Jika suatu pilihan terkunci, artinya bahan yang Anda pilih sudah memiliki karakteristik tersebut.</p>',
      error, navFooter());
  }

  function renderCutStep(error) {
    var cards = (CFG.cutTypes || []).map(function (c) {
      return cardHTML({ id: c.id, title: c.name, desc: c.desc, icon: CUT_ICONS[c.id] || '', selected: state.order.cutId === c.id });
    }).join('');
    return stepShell('Pilih Jenis Potongan', 'Cara stiker dipotong dan dikemas akan memengaruhi cara Anda menempelkannya.',
      '<div class="stk-grid stk-grid--3" id="cutCards">' + cards + '</div>', error, navFooter());
  }

  function renderQuantityStep(error) {
    var o = state.order;
    var presets = (CFG.quantityPresets || []).map(function (p) {
      var sel = parseInt(o.qty, 10) === p;
      return '<button type="button" role="radio" aria-checked="' + sel + '" class="stk-size-chip" data-qty="' + p + '">' + p.toLocaleString('id-ID') + ' pcs</button>';
    }).join('');
    var body =
      '<div class="bg-white border border-line rounded-xl p-4 mb-4">' +
      '<p class="stk-label" style="margin-bottom:.6rem;">Pilihan Cepat</p>' +
      '<div class="stk-quickpick" id="qtyQuick">' + presets + '</div>' +
      '</div>' +
      '<div class="bg-white border border-line rounded-xl p-4">' +
      '<label class="stk-label" for="stkTqty">Jumlah Custom (pcs)</label>' +
      '<input class="stk-input max-w-xs" id="stkTqty" type="number" inputmode="numeric" min="' + (CFG.minQuantity || 1) + '" max="' + (CFG.maxQuantity || 100000) + '" placeholder="Contoh: 150" value="' + escapeHtml(o.qty) + '">' +
      '<p class="stk-helper">Semakin banyak jumlah pesanan, semakin hemat harga per pcs-nya.</p>' +
      '</div>';
    return stepShell('Berapa Jumlah yang Anda Butuhkan?',
      'Pilih jumlah cepat, atau masukkan jumlah custom (minimal ' + (CFG.minQuantity || 1) + ' pcs).', body, error, navFooter());
  }

  function renderCheckoutStep(error) {
    var o = state.order;
    var est = computeEstimate();
    var t = selType(), s = selShape(), m = selMaterial(), f = selFinishing(), c = selCut();
    var size = resolveSize();

    function row(label, value) {
      return '<div class="summary-row"><span class="s-label">' + label + '</span><span class="s-value">' + escapeHtml(value) + '</span></div>';
    }

    var specHtml =
      row('Jenis', (t ? t.title : '—')) +
      row('Bentuk', (s ? s.title : '—')) +
      row('Ukuran', (size ? size.label : '—')) +
      row('Bahan', (m ? m.name : '—')) +
      row('Finishing', (f ? f.name : '—')) +
      row('Potongan', (c ? c.name : '—')) +
      row('Jumlah', (est ? est.qty.toLocaleString('id-ID') + ' pcs' : '—')) +
      row('File Desain', o.file ? o.file.name : '—') +
      (o.designCheck ? row('Cek Desain', 'Ya') : '');

    var cust = o.customer;
    var form =
      '<div class="bg-white border border-line rounded-xl p-4">' +
      '<p class="stk-label" style="font-size:.95rem;font-family:\'Space Grotesk\',sans-serif;">👤 Data Pemesan</p>' +
      '<div class="mb-3"><label class="stk-label" for="stkName">Nama</label>' +
      '<input class="stk-input" id="stkName" type="text" placeholder="Nama lengkap Anda" value="' + escapeHtml(cust.name) + '"></div>' +
      '<div class="mb-3"><label class="stk-label" for="stkPhone">Nomor WhatsApp</label>' +
      '<input class="stk-input" id="stkPhone" type="tel" placeholder="08xxxxxxxxxx" value="' + escapeHtml(cust.phone) + '"></div>' +
      '<div class="mb-3"><label class="stk-label" for="stkAddress">Alamat Pengiriman <span style="color:var(--slate-soft);font-weight:400;">(opsional)</span></label>' +
      '<input class="stk-input" id="stkAddress" type="text" placeholder="Jalan, No. Rumah, Kelurahan, Kecamatan" value="' + escapeHtml(cust.address) + '"></div>' +
      '<div class="mb-3"><p class="stk-label" style="margin-bottom:.5rem;">Metode Pembayaran</p>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<label class="stk-card' + (cust.payment === 'Tunai' ? ' is-selected' : '') + '" style="padding:.6rem .7rem;">' +
      '<span class="stk-card__body"><span class="stk-card__title" style="font-size:.82rem;">💵 Tunai</span><span class="stk-card__desc">Bayar di tempat</span></span>' +
      '<input type="radio" name="stkPay" value="Tunai" class="sr-only" ' + (cust.payment === 'Tunai' ? 'checked' : '') + '></label>' +
      '<label class="stk-card' + (cust.payment === 'Transfer' ? ' is-selected' : '') + '" style="padding:.6rem .7rem;">' +
      '<span class="stk-card__body"><span class="stk-card__title" style="font-size:.82rem;">🏦 Transfer</span><span class="stk-card__desc">Konfirmasi ke admin</span></span>' +
      '<input type="radio" name="stkPay" value="Transfer" class="sr-only" ' + (cust.payment === 'Transfer' ? 'checked' : '') + '></label>' +
      '</div></div>' +
      '<div class="mb-2"><label class="stk-label" for="stkNotes">Catatan <span style="color:var(--slate-soft);font-weight:400;">(opsional)</span></label>' +
      '<textarea class="stk-input" id="stkNotes" rows="2" placeholder="Permintaan khusus, deadline, dll.">' + escapeHtml(cust.notes) + '</textarea></div>' +
      '</div>';

    var submit = o.submitted ? '' :
      '<button type="button" class="stk-btn-wa w-full mt-4" id="stkSubmit">' +
      '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.51 2 12.04 2Z"/></svg>' +
      'Kirim Pesanan via WhatsApp</button>';

    var success = o.submitted
      ? '<div class="bg-white border border-line rounded-xl p-5 text-center mt-4">' +
        '<div class="text-3xl mb-2">✅</div>' +
        '<p class="font-semibold">Pesanan siap dikirim!</p>' +
        '<p class="text-sm text-slate-soft mt-1">WhatsApp telah dibuka dengan rincian pesanan. Mohon tunggu konfirmasi dari tim YourPrint.</p>' +
        '<a href="index.html" class="stk-btn-primary mt-4">Kembali ke Beranda</a>' +
        '</div>'
      : '';

    var body =
      '<div class="bg-white border border-line rounded-xl p-4 mb-4">' +
      '<p class="stk-label" style="font-size:.95rem;font-family:\'Space Grotesk\',sans-serif;">📋 Ringkasan Pesanan</p>' +
      specHtml +
      '</div>' +
      form + submit +
      '<p class="stk-helper text-center mt-2">Desain dikirim bersamaan dengan pesanan, lalu dicek oleh tim sebelum produksi.</p>' +
      success;

    return stepShell('Ringkasan & Checkout', 'Pastikan semua detail sudah benar sebelum mengirim pesanan.', body, error, '');
  }

  /* ================= DESIGN STEP (async, preview) ================= */
  function renderDesignStep(error) {
    var o = state.order;
    if (!o.file) {
      renderDesignStepInner(error, null, '');
      return;
    }
    var isImg = typeof o.file.type === 'string' && o.file.type.indexOf('image/') === 0;
    if (!isImg || !o.fileOrderId || !window.FileStore || !FileStore.supported()) {
      renderDesignStepInner(error, null, o.file.type);
      return;
    }
    FileStore.load(o.fileOrderId).then(function (recs) {
      renderDesignStepInner(error, (recs && recs.length && recs[0].data) ? recs[0].data : null, o.file.type);
    }).catch(function () {
      renderDesignStepInner(error, null, o.file.type);
    });
  }

  function renderDesignStepInner(error, imgSrc, mime) {
    var o = state.order;
    var body;

    if (o.file) {
      var isImg = typeof o.file.type === 'string' && o.file.type.indexOf('image/') === 0;
      var thumb = imgSrc
        ? '<img class="stk-file__thumb" src="data:' + escapeHtml(mime || o.file.type) + ';base64,' + imgSrc + '" alt="Pratinjau desain">'
        : '<span class="stk-file__thumb stk-file__thumb--doc">' + (isImg ? '🖼️' : '📄') + '</span>';
      body =
        '<div class="stk-file">' + thumb +
        '<div class="min-w-0 flex-1">' +
        '<div class="font-semibold text-sm truncate" title="' + escapeHtml(o.file.name) + '">' + escapeHtml(o.file.name) + '</div>' +
        '<div class="text-xs text-slate-soft mt-0.5">' + formatSize(o.file.size) + ' · ' + escapeHtml(o.file.type || 'file') + '</div>' +
        '</div></div>' +
        '<div class="flex flex-wrap gap-2 mt-3">' +
        '<label class="stk-btn-back" style="cursor:pointer;">Ganti File<input type="file" id="stkFile" class="hidden" accept="' + escapeHtml(CFG.upload.accept || '') + '"></label>' +
        '<button type="button" class="stk-btn-back" id="stkRemoveFile" style="color:var(--danger);border-color:rgba(220,38,38,.4);">Hapus File</button>' +
        '</div>';
    } else {
      body =
        '<div class="stk-dropzone" id="stkDrop" role="button" tabindex="0" aria-label="Upload desain stiker">' +
        '<div class="text-3xl mb-2">📤</div>' +
        '<div class="font-semibold text-sm">Seret &amp; letakkan file di sini</div>' +
        '<div class="text-xs text-slate-soft mt-1">atau klik untuk memilih file</div>' +
        '<div class="text-xs text-slate-soft mt-2 font-mono">PNG · JPG · JPEG · PDF (maks ' + (CFG.upload.maxSizeMB || 10) + 'MB)</div>' +
        '<input type="file" id="stkFile" class="hidden" accept="' + escapeHtml(CFG.upload.accept || '') + '">' +
        '</div>';
    }

    body +=
      '<div class="stk-helper flex items-start gap-2 mt-3"><span>💡</span><span>Pastikan desain memiliki kualitas yang baik agar hasil cetak maksimal.</span></div>' +
      '<label class="stk-checkbox mt-4">' +
      '<input type="checkbox" id="stkDesignCheck" ' + (o.designCheck ? 'checked' : '') + '>' +
      '<span>' + escapeHtml(CFG.designCheck.label || 'Izin tim mengecek desain sebelum dicetak.') + '</span>' +
      '</label>' +
      '<p class="stk-helper">' + escapeHtml(CFG.designCheck.note || 'Desain akan diperiksa sebelum masuk ke proses produksi.') + '</p>';

    var box = document.getElementById('stepContent');
    box.innerHTML = stepShell('Upload Desain Stiker', 'Unggah file desain yang sudah Anda miliki.', body, error, navFooter());
    bindNav();

    var fIn = document.getElementById('stkFile');
    if (fIn) {
      fIn.addEventListener('change', function () { if (fIn.files && fIn.files.length) handleFileSelect(fIn.files[0]); });
      var drop = document.getElementById('stkDrop');
      if (drop) {
        ['dragover', 'dragenter'].forEach(function (ev) {
          drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-dragover'); });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
          drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-dragover'); });
        });
        drop.addEventListener('drop', function (e) {
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
        });
        drop.addEventListener('keydown', function (e) {
          if ((e.key === 'Enter' || e.key === ' ') && !e.target.id) { e.preventDefault(); fIn.click(); }
        });
        drop.addEventListener('click', function () { fIn.click(); });
      }
    }
    var rem = document.getElementById('stkRemoveFile');
    if (rem) rem.addEventListener('click', removeFile);
    var chk = document.getElementById('stkDesignCheck');
    if (chk) chk.addEventListener('change', function () { state.order.designCheck = chk.checked; saveState(); });
    updateSummary();
  }

  /* ================= FILE UPLOAD ================= */
  function handleFileSelect(file) {
    var maxBytes = (CFG.upload.maxSizeMB || 10) * 1024 * 1024;
    var allowed = CFG.upload.types || [];
    var extOk = /\.(png|jpe?g|pdf)$/i.test(file.name);

    if (!extOk || (allowed.length && allowed.indexOf(file.type) === -1)) {
      showToast('Format tidak didukung. Gunakan PNG, JPG, JPEG, atau PDF.');
      return;
    }
    if (allowed.length && allowed.indexOf(file.type) !== -1 && file.type === 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      showToast('Hanya file PDF yang valid.');
      return;
    }
    if (file.size > maxBytes) {
      showToast('Ukuran file maksimal ' + (CFG.upload.maxSizeMB || 10) + 'MB.');
      return;
    }
    if (!window.FileStore || !FileStore.supported()) {
      showToast('Browser Anda tidak mendukung penyimpanan file. Gunakan browser lain.');
      return;
    }

    readAsBase64(file).then(function (data) {
      var orderId = state.order.fileOrderId || 'stkr-' + Date.now();
      var record = { name: file.name, type: file.type || 'image/png', size: file.size, pages: 0, data: data };
      return FileStore.save(orderId, [record]).then(function () {
        state.order.file = { name: file.name, type: file.type || 'image/png', size: file.size };
        state.order.fileOrderId = orderId;
        saveState();
        renderStep(state.current);
        showToast('✓ Desain siap');
      });
    }).catch(function () {
      showToast('Gagal membaca file. Silakan coba lagi.');
    });
  }

  function readAsBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result.split(',')[1]); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function removeFile() {
    var id = state.order.fileOrderId;
    state.order.file = null;
    state.order.fileOrderId = '';
    saveState();
    if (id && window.FileStore && FileStore.supported()) FileStore.clear(id).catch(function () {});
    renderStep(state.current);
  }

  /* ================= NAVIGATION ================= */
  function bindNav() {
    var back = document.getElementById('stkBack');
    var next = document.getElementById('stkNext');
    if (back) back.addEventListener('click', function () { renderStep(state.current - 1); });
    if (next) next.addEventListener('click', nextStep);
  }

  function nextStep() {
    var err = validateStep(state.current);
    if (err) {
      renderStep(state.current, err);
      return;
    }
    if (state.current === CHECKOUT_INDEX) {
      submitOrder(document.getElementById('stkSubmit'));
      return;
    }
    renderStep(state.current + 1);
  }

  function onPrimaryCta() {
    if (state.current === CHECKOUT_INDEX) {
      submitOrder(document.getElementById('stkSubmit'));
      return;
    }
    var fi = firstIncomplete();
    if (fi >= 0) {
      renderStep(fi, validateStep(fi));
    } else {
      renderStep(CHECKOUT_INDEX);
    }
  }

  /* ================= BIND STEP EVENTS ================= */
  function bindStepEvents(stepId) {
    if (stepId === 'type') {
      bindCards('typeCards', function (id) { state.order.typeId = id; saveState(); renderStep(state.current); });
    }
    if (stepId === 'shape') {
      bindCards('shapeCards', function (id) {
        state.order.shapeId = id;
        state.order.sizeMode = 'preset';
        state.order.sizePresetIndex = -1;
        state.order.customW = '';
        state.order.customH = '';
        saveState();
        renderStep(state.current);
      });
    }
    if (stepId === 'size') {
      var chips = document.getElementById('sizeChips');
      if (chips) {
        chips.querySelectorAll('.stk-size-chip[data-i]').forEach(function (chip) {
          chip.addEventListener('click', function () {
            state.order.sizeMode = 'preset';
            state.order.sizePresetIndex = Number(chip.dataset.i);
            saveState();
            renderStep(state.current);
          });
        });
      }
      var cw = document.getElementById('stkCW');
      var ch = document.getElementById('stkCH');
      if (cw) cw.addEventListener('input', function () {
        state.order.customW = cw.value;
        state.order.sizeMode = 'custom';
        state.order.sizePresetIndex = -1;
        if (state.order.shapeId === 'bulat') { state.order.customH = cw.value; if (ch) ch.value = cw.value; }
        saveState();
        updateSummary();
      });
      if (ch) ch.addEventListener('input', function () {
        state.order.customH = ch.value;
        state.order.sizeMode = 'custom';
        state.order.sizePresetIndex = -1;
        saveState();
        updateSummary();
      });
    }
    if (stepId === 'material') {
      bindCards('materialCards', function (id) {
        state.order.materialId = id;
        var fin = selFinishing();
        if (fin && (fin.disabledFor || {})[id]) state.order.finishingId = null;
        saveState();
        renderStep(state.current);
      });
    }
    if (stepId === 'finishing') {
      bindCards('finishingCards', function (id) { state.order.finishingId = id; saveState(); renderStep(state.current); });
    }
    if (stepId === 'cut') {
      bindCards('cutCards', function (id) { state.order.cutId = id; saveState(); renderStep(state.current); });
    }
    if (stepId === 'quantity') {
      var quick = document.getElementById('qtyQuick');
      if (quick) {
        quick.querySelectorAll('.stk-size-chip[data-qty]').forEach(function (chip) {
          chip.addEventListener('click', function () {
            state.order.qty = chip.dataset.qty;
            saveState();
            renderStep(state.current);
          });
        });
      }
      var qIn = document.getElementById('stkTqty');
      if (qIn) qIn.addEventListener('input', function () { state.order.qty = qIn.value.trim(); saveState(); updateSummary(); });
    }
    if (stepId === 'checkout') {
      var n = document.getElementById('stkName');
      var p = document.getElementById('stkPhone');
      var ad = document.getElementById('stkAddress');
      var nt = document.getElementById('stkNotes');
      if (n) n.addEventListener('input', function () { state.order.customer.name = n.value; saveState(); });
      if (p) p.addEventListener('input', function () { state.order.customer.phone = p.value; saveState(); });
      if (ad) ad.addEventListener('input', function () { state.order.customer.address = ad.value; saveState(); });
      if (nt) nt.addEventListener('input', function () { state.order.customer.notes = nt.value; saveState(); });
      document.querySelectorAll('input[name="stkPay"]').forEach(function (r) {
        r.addEventListener('change', function () {
          state.order.customer.payment = r.value;
          saveState();
          document.querySelectorAll('input[name="stkPay"]').forEach(function (rr) {
            var lbl = rr.closest('.stk-card');
            if (lbl) lbl.classList.toggle('is-selected', rr.checked);
          });
        });
      });
      var sub = document.getElementById('stkSubmit');
      if (sub) sub.addEventListener('click', function () { submitOrder(sub); });
    }
  }

  function bindCards(containerId, handler) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.querySelectorAll('.stk-card').forEach(function (card) {
      card.addEventListener('click', function () {
        if (card.disabled) return;
        handler(card.dataset.id, card);
      });
    });
  }

  /* ================= PROGRESS ================= */
  function renderProgress() {
    var g = STEPS[state.current].group;
    document.querySelectorAll('#phaseProgress .stk-progress__item').forEach(function (el, i) {
      el.classList.toggle('is-active', i === g);
      el.classList.toggle('is-done', i < g);
    });
    var sub = document.getElementById('specSubnav');
    if (g === 1) {
      sub.classList.remove('hidden');
      sub.innerHTML = SPEC_NAV.map(function (label, i) {
        var stepIdx = SPEC_STEPS[i];
        var cls = 'stk-subnav__item';
        if (stepIdx < state.current) cls += ' is-done';
        if (stepIdx === state.current) cls += ' is-active';
        return '<span class="' + cls + '">' + (stepIdx < state.current ? '✓ ' : '') + label + '</span>';
      }).join('');
    } else {
      sub.classList.add('hidden');
    }
  }

  /* ================= SUMMARY ================= */
  function identityRows() {
    var o = state.order;
    var t = selType(), s = selShape(), m = selMaterial(), f = selFinishing(), c = selCut();
    var size = resolveSize();
    var q = parseInt(o.qty, 10);
    return [
      ['Jenis', t ? t.title : '—'],
      ['Bentuk', s ? s.title : '—'],
      ['Ukuran', size ? size.label : '—'],
      ['Bahan', m ? m.name : '—'],
      ['Finishing', f ? f.name : '—'],
      ['Potongan', c ? c.name : '—'],
      ['Jumlah', q > 0 ? q.toLocaleString('id-ID') + ' pcs' : '—']
    ];
  }

  function rowHTML(label, value) {
    return '<div class="summary-row"><span class="s-label">' + label + '</span><span class="s-value">' + escapeHtml(value) + '</span></div>';
  }

  function updateSummary() {
    var est = computeEstimate();
    var panel = document.getElementById('summaryPanel');
    var priceEl = document.getElementById('mobileBarPrice');
    var btn = document.getElementById('mobileBarBtn');
    var onCheckout = state.current === CHECKOUT_INDEX;

    if (panel) {
      var rows = identityRows().map(function (r) { return rowHTML(r[0], r[1]); }).join('');
      var lines = '';
      var totalHtml = '<div class="summary-total"><span>Estimasi Harga</span><span class="s-amount">' + (est ? formatRupiah(est.total) : '—') + '</span></div>';
      var note = '<p class="summary-note">Harga dapat disesuaikan kembali apabila terdapat perubahan spesifikasi atau desain.</p>';
      if (est) {
        lines =
          '<div class="summary-line"><span>Ukuran (' + escapeHtml(est.size) + ')</span><span class="s-val">' + formatRupiah(est.base) + '</span></div>' +
          '<div class="summary-line"><span>Bahan</span><span class="s-val">' + fmtDelta(est.mat) + '</span></div>' +
          '<div class="summary-line"><span>Finishing</span><span class="s-val">' + fmtDelta(est.fin) + '</span></div>' +
          '<div class="summary-line"><span>Potongan</span><span class="s-val">' + fmtDelta(est.cut) + '</span></div>' +
          '<div class="summary-divider"></div>' +
          '<div class="summary-line"><span>Satuan</span><span class="s-val">' + formatRupiah(est.unit) + '</span></div>' +
          '<div class="summary-line"><span>' + est.qty.toLocaleString('id-ID') + ' pcs</span><span class="s-val">' + formatRupiah(est.subtotal) + '</span></div>';
        if (est.discount > 0) {
          lines += '<div class="summary-line"><span>Diskon ' + est.pct + '%</span><span class="s-val" style="color:#16A34A;">−' + formatRupiah(est.discount) + '</span></div>';
        }
      }
      var ctaLabel = onCheckout ? 'Kirim Pesanan via WhatsApp' : 'LANJUTKAN PESANAN';
      var ctaCls = onCheckout ? 'stk-btn-wa' : 'stk-btn-primary';
      panel.innerHTML =
        '<p class="font-display font-bold" style="margin-bottom:.4rem;">RINGKASAN PESANAN</p>' +
        rows +
        '<div class="summary-divider"></div>' +
        lines +
        '<div class="summary-divider"></div>' +
        totalHtml +
        note +
        '<button type="button" class="' + ctaCls + ' w-full mt-4" id="summaryCta">' + ctaLabel + '</button>';
      var cta = document.getElementById('summaryCta');
      if (cta) cta.addEventListener('click', onPrimaryCta);
    }

    if (priceEl) priceEl.textContent = est ? formatRupiah(est.total) : '—';
    if (btn) {
      btn.textContent = onCheckout ? 'Kirim Pesanan' : 'Lanjutkan';
      btn.classList.toggle('stk-btn-wa', onCheckout);
      btn.classList.toggle('stk-btn-primary', !onCheckout);
    }
  }

  var mobileBtnEl = document.getElementById('mobileBarBtn');
  if (mobileBtnEl) mobileBtnEl.addEventListener('click', onPrimaryCta);

  /* ================= CHECKOUT ================= */
  function getWaNumber() {
    if (CFG.whatsappNumber) return CFG.whatsappNumber;
    return APP.WHATSAPP_NUMBER || '6285242410880';
  }

  function sendToBackend(payload) {
    if (!APP.GAS_URL || APP.GAS_URL.indexOf('PASTE_URL') !== -1) return Promise.resolve();
    return fetch(APP.GAS_URL.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  function buildWaMessage(est) {
    var o = state.order;
    var t = selType(), s = selShape(), m = selMaterial(), f = selFinishing(), c = selCut();
    var msg = 'Halo YourPrint, saya ingin memesan:\n\n';
    msg += '📦 JENIS PESANAN\n' + (t ? t.title : '-') + '\n\n';
    msg += '🔵 BENTUK\n' + (s ? s.title : '-') + '\n\n';
    msg += '📏 UKURAN\n' + est.size + '\n\n';
    msg += '🧾 BAHAN\n' + (m ? m.name : '-') + '\n\n';
    msg += '✨ FINISHING\n' + (f ? f.name : '-') + '\n\n';
    msg += '✂️ POTONGAN\n' + (c ? c.name : '-') + '\n\n';
    msg += '🔢 JUMLAH\n' + est.qty.toLocaleString('id-ID') + ' pcs\n\n';
    msg += '💰 ESTIMASI HARGA\n' + formatRupiah(est.total) + '\n\n';
    msg += '📎 DESAIN\n' + (o.file ? o.file.name : '-') + '\n\n';
    if (o.designCheck) {
      msg += '✅ CEK DESAIN\nDesain mohon diperiksa tim sebelum produksi.\n\n';
    }
    msg += '👤 NAMA\n' + o.customer.name + '\n';
    msg += '📞 NO. WHATSAPP\n' + o.customer.phone + '\n';
    if (o.customer.address) msg += '🚚 ALAMAT\n' + o.customer.address + '\n';
    msg += '💳 PEMBAYARAN\n' + o.customer.payment + '\n';
    if (o.customer.notes) msg += '📝 CATATAN\n' + o.customer.notes + '\n';
    msg += '\nMohon konfirmasi pesanan saya. Terima kasih.';
    return msg;
  }

  function laminationFor(finId) {
    if (finId === 'glossy') return 'glossy';
    if (finId === 'matte') return 'doff';
    return 'none';
  }

  function submitOrder(btn) {
    var err = customerError();
    if (err) {
      renderStep(state.current, err);
      return;
    }
    var est = computeEstimate();
    if (!est) {
      renderStep(state.current, 'Silakan lengkapi spesifikasi stiker terlebih dahulu.');
      return;
    }
    if (!state.order.file) {
      renderStep(state.current, 'Silakan upload desain stiker terlebih dahulu.');
      return;
    }

    var original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }

    loadUploadedFile().then(function (record) {
      var payload = buildPayload(record, est);
      var msg = buildWaMessage(est);
      var waNum = getWaNumber();
      var waUrl = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);

      function onSent() {
        var oid = state.order.fileOrderId;
        if (oid && window.FileStore && FileStore.supported()) FileStore.clear(oid).catch(function () {});
        try { localStorage.removeItem(LS_KEY); } catch (e) {}
        try { sessionStorage.removeItem('yp_order'); } catch (e) {}
        state.order.submitted = true;
        saveState();
        window.open(waUrl, '_blank');
        renderStep(state.current);
      }

      sendToBackend(payload).then(onSent).catch(onSent);
    }).catch(function () {
      showToast('File desain tidak ditemukan. Silakan upload ulang.');
      if (btn) { btn.disabled = false; btn.textContent = original; }
      renderStep(state.current);
    });
  }

  function buildPayload(record, est) {
    var o = state.order;
    var total = est.total;
    return {
      type: 'print',
      timestamp: Date.now(),
      service: 'Cetak Stiker',
      customerName: o.customer.name.trim(),
      customerPhone: o.customer.phone.trim(),
      address: o.customer.address.trim() || '-',
      mapsLink: '-',
      paymentMethod: o.customer.payment,
      fileName: record ? record.name : (o.file ? o.file.name : 'file'),
      fileType: record ? record.type : (o.file ? o.file.type : 'application/octet-stream'),
      files: record ? [{ name: record.name, type: record.type, data: record.data, pages: 0 }] : [],
      fileCount: record ? 1 : 0,
      pageCount: '-',
      colorMode: 'color',
      colorModeLabel: 'Full Color',
      estimatedPrice: total,
      quantity: est.qty,
      lamination: laminationFor(o.finishingId),
      detailOption: [
        'Jenis: ' + (selType() ? selType().title : '-'),
        'Bentuk: ' + (selShape() ? selShape().title : '-'),
        'Ukuran: ' + est.size,
        'Bahan: ' + (selMaterial() ? selMaterial().name : '-'),
        'Finishing: ' + (selFinishing() ? selFinishing().name : '-'),
        'Potongan: ' + (selCut() ? selCut().name : '-'),
        'Jumlah: ' + est.qty + ' pcs',
        'Cek Desain: ' + (o.designCheck ? 'Ya' : 'Tidak')
      ].join(', '),
      notes: o.customer.notes.trim() || '-',
      totalPrice: total,
      printType: '',
      printTypeLabel: 'Cetak Stiker',
      basePrice: Math.round((est.base + est.mat) * est.qty),
      additionalCost: Math.round((est.fin + est.cut) * est.qty)
    };
  }

  function loadUploadedFile() {
    var o = state.order;
    if (!o.fileOrderId) return Promise.reject(new Error('no file'));
    if (!window.FileStore || !FileStore.supported()) return Promise.reject(new Error('no store'));
    return FileStore.load(o.fileOrderId).then(function (recs) {
      if (!recs || !recs.length) throw new Error('empty');
      var r = recs[0];
      r.name = o.file ? o.file.name : r.name;
      r.type = o.file ? o.file.type : r.type;
      return r;
    });
  }

  /* ================= TOAST ================= */
  function showToast(msg) {
    var t = document.getElementById('stkToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'stkToast';
      t.style.cssText = 'position:fixed;bottom:5rem;left:50%;transform:translateX(-50%) translateY(20px);background:#16233F;color:#F3F5F7;padding:.6rem 1.2rem;border-radius:.5rem;font-size:.85rem;z-index:999;opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;max-width:90vw;box-shadow:0 10px 30px -12px rgba(0,0,0,.4);';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    if (t._timer) clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
  }

  /* ================= INIT ================= */
  function init() {
    // Mode embed (pesanan.html): isi data pemesan dari yang sudah diisi otomatis
    try {
      var pf = window.YP_STICKER_PREFILL;
      if (pf && state.order.customer) {
        if (!state.order.customer.name && pf.name) state.order.customer.name = pf.name;
        if (!state.order.customer.phone && pf.phone) state.order.customer.phone = pf.phone;
        if (!state.order.customer.address && pf.address) state.order.customer.address = pf.address;
        if (!state.order.customer.payment && pf.payment) state.order.customer.payment = pf.payment;
        saveState();
      }
    } catch (e) {}

    var first = firstIncomplete();
    var startIdx = state.current;
    if (state.order.submitted) {
      startIdx = CHECKOUT_INDEX;
    } else if (startIdx === CHECKOUT_INDEX && first >= 0) {
      startIdx = first;
    }
    renderStep(startIdx);
  }

  // Jalankan wizard hanya jika wadah langkahnya tersedia. Di pesanan.html,
  // #stepContent hanya disuntik saat layanan = Cetak Stiker; di halaman
  // standalone wizard, wadah ini selalu ada.
  if (document.getElementById('stepContent')) {
    init();
  }
})();