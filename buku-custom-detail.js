// buku-custom-detail.js — Detail page logic for buku-custom-detail.html

(function () {
  'use strict';

  // ==================== SIZE OPTIONS (Fallback) ====================
  const DEFAULT_SIZE_OPTIONS = [
    { id: 'a4', name: 'A4', dim: '21 × 29,7 cm', price: 45000, label: 'Besar' },
    { id: 'a5', name: 'A5', dim: '14,8 × 21 cm', price: 35000, label: 'Sedang' },
    { id: 'b5', name: 'B5', dim: '17,6 × 25 cm', price: 40000, label: 'Sedang' },
  ];

  const DEFAULT_DESCRIPTION = 'Buku custom personal untuk anak sekolah. Bisa ditulis nama, sekolah, dan kelas di cover. Cocok sebagai hadiah atau perlengkapan sekolah yang unik.';

  // ==================== DOM REFS ====================
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const pageContent = document.getElementById('pageContent');
  const actionBar = document.getElementById('actionBar');
  const headerTitle = document.getElementById('headerTitle');
  const heroImg = document.getElementById('heroImg');
  const heroFallback = document.getElementById('heroFallback');
  const detailHero = document.getElementById('detailHero');
  const detailCode = document.getElementById('detailCode');
  const detailTitle = document.getElementById('detailTitle');
  const detailDesc = document.getElementById('detailDesc');
  const sizeOptionsEl = document.getElementById('sizeOptions');
  const childName = document.getElementById('childName');
  const childSchool = document.getElementById('childSchool');
  const childClass = document.getElementById('childClass');
  const childNotes = document.getElementById('childNotes');
  const orderName = document.getElementById('orderName');
  const orderPhone = document.getElementById('orderPhone');
  const btnOrder = document.getElementById('btnOrder');
  const btnBack = document.getElementById('btnBack');
  const toastEl = document.getElementById('toast');

  // ==================== STATE ====================
  let selectedSize = null;

  // ==================== TOAST ====================
  let toastTimer;
  function showToast(msg) {
    if (window.showToast) { window.showToast(msg); return; }
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3000);
  }

  // ==================== HELPERS ====================
  function fixGoogleDriveUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
      const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = matchD ? matchD[1] : (matchId ? matchId[1] : null);
      if (fileId) return 'https://lh3.googleusercontent.com/d/' + fileId;
    }
    return url;
  }

  function formatRupiah(num) {
    return 'Rp' + num.toLocaleString('id-ID');
  }

  function getBookCode() {
    var params = new URLSearchParams(window.location.search);
    return params.get('code');
  }

  // ==================== RENDER SIZE OPTIONS ====================
  function renderSizes(book) {
    var options = [];
    if (book.priceA4) options.push({ id: 'a4', name: 'A4', dim: '21 × 29,7 cm', price: Number(book.priceA4), label: 'Besar' });
    if (book.priceA5) options.push({ id: 'a5', name: 'A5', dim: '14,8 × 21 cm', price: Number(book.priceA5), label: 'Sedang' });
    if (book.priceB5) options.push({ id: 'b5', name: 'B5', dim: '17,6 × 25 cm', price: Number(book.priceB5), label: 'Sedang' });
    
    if (options.length === 0) {
      options = DEFAULT_SIZE_OPTIONS;
    }

    sizeOptionsEl.innerHTML = options.map(function (size, idx) {
      return '<label class="size-option' + (idx === 0 ? ' selected' : '') + '" data-size="' + size.id + '">' +
        '<input type="radio" name="bookSize" value="' + size.id + '"' + (idx === 0 ? ' checked' : '') + '>' +
        '<div class="size-option__name">' + size.name + '</div>' +
        '<div class="size-option__dim">' + size.dim + '</div>' +
        '<div class="size-option__price">' + formatRupiah(size.price) + '</div>' +
      '</label>';
    }).join('');

    selectedSize = options[0];

    sizeOptionsEl.querySelectorAll('.size-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        sizeOptionsEl.querySelectorAll('.size-option').forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        var sizeId = opt.getAttribute('data-size');
        selectedSize = options.find(function (s) { return s.id === sizeId; });
      });
    });
  }

  // ==================== BUILD WHATSAPP MESSAGE ====================
  function buildMessage(book) {
    var sizeText = selectedSize ? selectedSize.name + ' (' + selectedSize.dim + ')' : '-';
    var priceText = selectedSize ? formatRupiah(selectedSize.price) : '-';

    var msg = 'Halo YourPrint, saya ingin pesan buku custom:\n\n';
    msg += '📖 Kode: ' + book.code + '\n';
    msg += '📝 Judul: ' + book.title + '\n';
    msg += '📐 Ukuran: ' + sizeText + '\n';
    msg += '💰 Harga: ' + priceText + '\n';

    var name = childName.value.trim();
    var school = childSchool.value.trim();
    var cls = childClass.value.trim();
    var notes = childNotes.value.trim();

    if (name || school || cls || notes) {
      msg += '\n👤 Data Anak:\n';
      if (name) msg += '- Nama: ' + name + '\n';
      if (school) msg += '- Sekolah: ' + school + '\n';
      if (cls) msg += '- Kelas: ' + cls + '\n';
      if (notes) msg += '- Catatan: ' + notes + '\n';
    }

    return msg;
  }

  function buildWaLink(message) {
    var cfg = window.YOURPRINT_CONFIG || {};
    var waNumber = cfg.WHATSAPP_NUMBER || '6281234567890';
    return 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(message);
  }

  // ==================== RENDER BOOK DATA ====================
  function renderBook(book) {
    // Header
    headerTitle.textContent = book.title || 'Buku Custom';

    // Hero image
    var imgUrl = fixGoogleDriveUrl(book.image);
    if (imgUrl) {
      heroImg.src = imgUrl;
      heroImg.alt = book.title;
      heroImg.onerror = function () {
        detailHero.classList.add('detail-hero--fallback');
        heroImg.style.display = 'none';
        heroFallback.style.display = 'grid';
      };
    } else {
      detailHero.classList.add('detail-hero--fallback');
      heroImg.style.display = 'none';
      heroFallback.style.display = 'grid';
    }

    // Code & Title
    detailCode.textContent = 'Kode: ' + book.code;
    detailTitle.textContent = book.title;

    // Description
    detailDesc.textContent = book.description || DEFAULT_DESCRIPTION;

    // Render sizes
    renderSizes(book);

    // Show page
    loadingState.classList.add('hidden');
    pageContent.classList.remove('hidden');
    actionBar.style.display = 'flex';
    actionBar.classList.remove('hidden');
  }

  // ==================== ORDER BUTTON ====================
  btnOrder.addEventListener('click', function () {
    if (!selectedSize) {
      showToast('⚠️ Pilih ukuran buku terlebih dahulu');
      return;
    }

    var code = getBookCode();
    var book = null;

    // Try sessionStorage first
    try {
      var sessionData = sessionStorage.getItem('yp_book_detail');
      if (sessionData) {
        var sessionBook = JSON.parse(sessionData);
        if (sessionBook && String(sessionBook.code) === String(code)) book = sessionBook;
      }
    } catch (e) {}

    // Fallback to localStorage
    if (!book) {
      try {
        var gallery = JSON.parse(localStorage.getItem('yp_gallery') || '[]');
        book = gallery.find(function (b) { return String(b.code) === String(code); });
      } catch (e) {}
    }

    if (!book) {
      showToast('❌ Data buku tidak ditemukan');
      return;
    }

    var customerName = orderName.value.trim();
    var customerPhone = orderPhone.value.trim();

    if (!customerName || !customerPhone) {
      showToast('⚠️ Lengkapi Nama Pemesan dan Nomor WhatsApp terlebih dahulu');
      return;
    }

    var originalText = btnOrder.innerHTML;
    btnOrder.innerHTML = 'Memproses...';
    btnOrder.disabled = true;

    var message = buildMessage(book);
    var waUrl = buildWaLink(message);
    
    // Siapkan data untuk dikirim ke backend (kategori Cetak)
    var childData = '';
    if (childName.value.trim()) childData += 'Anak: ' + childName.value.trim() + ' ';
    if (childSchool.value.trim()) childData += 'Sekolah: ' + childSchool.value.trim() + ' ';
    if (childClass.value.trim()) childData += 'Kelas: ' + childClass.value.trim() + ' ';
    if (childNotes.value.trim()) childData += 'Catatan: ' + childNotes.value.trim();

    var payload = {
      type: 'print',
      timestamp: Date.now(),
      customerName: customerName,
      customerPhone: customerPhone,
      service: 'Buku Custom - ' + book.title + ' (Kode: ' + book.code + ')',
      notes: 'Ukuran: ' + selectedSize.name + '. ' + childData,
      totalPrice: selectedSize.price,
      quantity: 1,
      colorMode: '-',
      fileName: '-'
    };

    if (window.YOURPRINT_CONFIG && window.YOURPRINT_CONFIG.GAS_URL) {
      fetch(window.YOURPRINT_CONFIG.GAS_URL.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
      .then(function() {})
      .catch(function(e) { console.error('Gagal mencatat pesanan:', e); })
      .finally(function() {
        btnOrder.innerHTML = originalText;
        btnOrder.disabled = false;
        window.open(waUrl, '_blank', 'noopener');
      });
    } else {
      btnOrder.innerHTML = originalText;
      btnOrder.disabled = false;
      window.open(waUrl, '_blank', 'noopener');
    }
  });

  // ==================== BACK BUTTON ====================
  btnBack.addEventListener('click', function () {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html#galeri';
    }
  });

  // ==================== INIT ====================
  function init() {
    var code = getBookCode();
    if (!code) {
      loadingState.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    // 1) Try sessionStorage (passed from index.html gallery click)
    try {
      var sessionData = sessionStorage.getItem('yp_book_detail');
      if (sessionData) {
        var sessionBook = JSON.parse(sessionData);
        if (sessionBook && String(sessionBook.code) === String(code)) {
          renderBook(sessionBook);
          return;
        }
      }
    } catch (e) {}

    // 2) Try localStorage cache (yp_gallery from index.html)
    try {
      var gallery = JSON.parse(localStorage.getItem('yp_gallery') || '[]');
      var book = gallery.find(function (b) { return String(b.code) === String(code); });
      if (book) {
        renderBook(book);
        return;
      }
    } catch (e) {}

    // 3) Fetch from backend
    if (!window.YOURPRINT_CONFIG || !window.YOURPRINT_CONFIG.GAS_URL) {
      loadingState.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    var cacheBuster = '&t=' + Date.now();
    var url = window.YOURPRINT_CONFIG.GAS_URL.trim() + '?action=getGallery' + cacheBuster;
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var items = Array.isArray(data) ? data : (data.data || data.result || []);
        localStorage.setItem('yp_gallery', JSON.stringify(items));

        var found = items.find(function (b) { return String(b.code) === String(code); });
        if (found) {
          renderBook(found);
        } else {
          loadingState.classList.add('hidden');
          emptyState.classList.remove('hidden');
        }
      })
      .catch(function () {
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
      });
  }

  init();
})();
