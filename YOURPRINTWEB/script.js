/* ==========================================================
   YourPrint — script.js
   Semua logika interaktif: mobile menu, upload simulasi,
   katalog produk, dan keranjang belanja dinamis.
   ========================================================== */

console.log('[YourPrint] 0) isi YOURPRINT_CONFIG yang terbaca browser:', window.YOURPRINT_CONFIG);

// pdf.js butuh worker terpisah supaya parsing PDF tidak nge-block halaman.
// Ini aman dipanggil di luar DOMContentLoaded karena cuma set konfigurasi.
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------
     1) MOBILE MENU
  ------------------------------------------------------ */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileMenu.classList.toggle('hidden');
  });

  // Tutup mobile menu saat salah satu link diklik
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
  });

  // Tutup menu jika klik di luar area
  document.addEventListener('click', (e) => {
    if (!mobileMenu.classList.contains('hidden')) {
      if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenu.classList.add('hidden');
      }
    }
  });


  /* ------------------------------------------------------
     DYNAMIC DATA FROM SHEET
  ------------------------------------------------------ */
  let products = [];
  let bookGallery = [];
  let printServices = [];
  let testimonials = [];
  let banners = [];
  let fetchFailed = false;

  function getCachedData(key) {
    try {
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return null;
  }

  function setCachedData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch(e) {}
  }

  async function fetchDynamicData() {
    fetchFailed = false;
    try {
      const url = window.YOURPRINT_CONFIG.GAS_URL;
      if (!url) throw new Error("GAS_URL not set");

      const cacheBuster = `&t=${Date.now()}`;
      const [pRes, gRes, sRes, tRes, bRes] = await Promise.all([
        fetch(`${url}?action=getProducts${cacheBuster}`).then(res => res.json()),
        fetch(`${url}?action=getGallery${cacheBuster}`).then(res => res.json()),
        fetch(`${url}?action=getServices${cacheBuster}`).then(res => res.json()),
        fetch(`${url}?action=getTestimonials${cacheBuster}`).then(res => res.json()),
        fetch(`${url}?action=getBanners${cacheBuster}`).then(res => res.json())
      ]);

      products = pRes;
      bookGallery = gRes;
      printServices = sRes;
      testimonials = tRes;
      banners = Array.isArray(bRes) ? bRes : [];

      setCachedData('yp_products', products);
      setCachedData('yp_gallery', bookGallery);
      setCachedData('yp_services', printServices);
      setCachedData('yp_testimonials', testimonials);
      setCachedData('yp_banners', banners);

    } catch (err) {
      console.warn("Fetch failed, using cache...", err);
      products = getCachedData('yp_products') || [];
      bookGallery = getCachedData('yp_gallery') || [];
      printServices = getCachedData('yp_services') || [];
      testimonials = getCachedData('yp_testimonials') || [];
      banners = getCachedData('yp_banners') || [];
      if (products.length === 0 && bookGallery.length === 0 && printServices.length === 0) {
        fetchFailed = true;
      }
    }

    renderBanners();
    renderGalleryData();
    renderServicesData();
    renderProducts();
    renderTestimonials();
  }

  /* ------------------------------------------------------
     2) BANNER CAROUSEL
  ------------------------------------------------------ */
  let bannerIndex = 0;
  let bannerInterval = null;

  window.handleBannerImgError = function(img) {
    if (img.dataset.retried) { img.style.display = 'none'; return; }
    img.dataset.retried = '1';
    var m = img.src.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) img.src = 'https://drive.google.com/uc?export=view&id=' + m[1];
    else img.style.display = 'none';
  }

  function renderBanners() {
    const container = document.getElementById('bannerCarousel');
    if (!container) return;

    const activeBanners = banners.filter(b => b.active === true || b.active === "TRUE" || b.active === "true");

    if (activeBanners.length === 0) {
      container.innerHTML = '<div class="banner-empty"><span class="banner-empty-text">YourPrint — ATK & Percetakan Online</span></div>';
      return;
    }

    if (activeBanners.length === 1) {
      const b = activeBanners[0];
      const imgUrl = fixGoogleDriveUrl(b.image);
      container.innerHTML = b.link
        ? '<a href="' + b.link + '" target="_blank" rel="noopener" class="banner-link"><img src="' + imgUrl + '" alt="Banner" class="banner-slide" loading="eager" onerror="handleBannerImgError(this)"></a>'
        : '<img src="' + imgUrl + '" alt="Banner" class="banner-slide" loading="eager" onerror="handleBannerImgError(this)">';
      return;
    }

    container.innerHTML =
      '<div class="banner-slides">' +
      activeBanners.map(function(b, i) {
        var imgUrl = fixGoogleDriveUrl(b.image);
        var slide = '<img src="' + imgUrl + '" alt="Banner ' + (i + 1) + '" class="banner-slide" style="display:' + (i === 0 ? 'block' : 'none') + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" onerror="handleBannerImgError(this)">';
        return b.link ? '<a href="' + b.link + '" target="_blank" rel="noopener" class="banner-link" style="display:' + (i === 0 ? 'block' : 'none') + '">' + slide + '</a>' : slide;
      }).join('') +
      '</div>' +
      '<div class="banner-dots">' +
      activeBanners.map(function(_, i) {
        return '<button class="banner-dot' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '" aria-label="Banner ' + (i + 1) + '"></button>';
      }).join('') +
      '</div>';

    bannerIndex = 0;
    container.querySelectorAll('.banner-dot').forEach(function(dot) {
      dot.addEventListener('click', function() {
        goToBanner(Number(dot.dataset.idx));
        resetBannerInterval();
      });
    });
    container.addEventListener('mouseenter', function() {
      if (bannerInterval) clearInterval(bannerInterval);
    });
    container.addEventListener('mouseleave', function() {
      startBannerInterval();
    });
    startBannerInterval();
  }

  function goToBanner(idx) {
    var container = document.getElementById('bannerCarousel');
    if (!container) return;
    var slides = container.querySelectorAll('.banner-slide');
    var links = container.querySelectorAll('.banner-link');
    var dots = container.querySelectorAll('.banner-dot');
    if (slides.length <= 1) return;
    slides[bannerIndex].style.display = 'none';
    dots[bannerIndex].classList.remove('active');
    var prevLink = links[bannerIndex];
    if (prevLink) prevLink.style.display = 'none';
    bannerIndex = idx;
    slides[bannerIndex].style.display = 'block';
    dots[bannerIndex].classList.add('active');
    var nextLink = links[bannerIndex];
    if (nextLink) nextLink.style.display = 'block';
  }

  function startBannerInterval() {
    if (bannerInterval) clearInterval(bannerInterval);
    bannerInterval = setInterval(function() {
      var container = document.getElementById('bannerCarousel');
      if (!container) return;
      var slides = container.querySelectorAll('.banner-slide');
      goToBanner((bannerIndex + 1) % slides.length);
    }, 4000);
  }

  function resetBannerInterval() {
    startBannerInterval();
  }

  /* ------------------------------------------------------
     3) SIMULASI UNGGAH FILE (Layanan Percetakan)
  ------------------------------------------------------ */
  function formatRupiah(num) {
    return 'Rp' + num.toLocaleString('id-ID');
  }

  function renderErrorState(container, message) {
    container.innerHTML = `
      <div class="col-span-full text-center py-10">
        <p class="text-slate-soft text-sm mb-3">${message}</p>
        <button onclick="location.reload()" class="cta-secondary text-sm" style="padding: .5rem 1rem;">Coba Lagi</button>
      </div>
    `;
  }

  function initPrintCards() {
    document.querySelectorAll('.print-card').forEach(card => {
      const fileInput = card.querySelector('.file-input');
      const uploadZone = card.querySelector('.upload-zone');
      const fileLabel = card.querySelector('.file-label');
      const submitBtn = card.querySelector('.print-card__btn');
      const serviceName = card.dataset.service;

      // --- Smart Print Calculator (opsional, hanya aktif kalau markup-nya ada) ---
      const estimateBox = card.querySelector('.print-estimate');
      const pagesEl = estimateBox ? estimateBox.querySelector('.print-estimate__pages') : null;
      const priceEl = estimateBox ? estimateBox.querySelector('.print-estimate__price') : null;
      const modeInputs = estimateBox ? estimateBox.querySelectorAll('input[type="radio"]') : [];
      const priceBw = Number(card.dataset.priceBw || 0);
      const priceColor = Number(card.dataset.priceColor || 0);
      let currentPageCount = 0;

      function getSelectedColorMode() {
        const checked = Array.from(modeInputs).find(i => i.checked);
        return checked ? checked.value : 'bw';
      }

      function updateEstimatePrice() {
        if (!priceEl) return;
        const rate = getSelectedColorMode() === 'color' ? priceColor : priceBw;
        priceEl.textContent = formatRupiah(currentPageCount * rate);
      }

      modeInputs.forEach(input => {
        input.addEventListener('change', updateEstimatePrice);
      });

      async function readPdfPageCount(file) {
        if (!window.pdfjsLib) return null; // pdf.js gagal dimuat (mis. offline) — kalkulator dilewati
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return pdf.numPages;
      }
      // --- end Smart Print Calculator ---

      const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB — batas aman untuk sessionStorage

      fileInput.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];

          if (file.size > MAX_FILE_SIZE) {
            showToast('Ukuran file terlalu besar! Maksimal 4MB agar pesanan lancar.');
            fileInput.value = '';
            fileLabel.textContent = 'Pilih file untuk diunggah';
            uploadZone.classList.remove('has-file');
            return;
          }

          fileLabel.textContent = `✓ ${file.name}`;
          uploadZone.classList.add('has-file');

          if (file.type === 'application/pdf') {
            showToast('Membaca jumlah halaman...');
            try {
              const [pages, base64] = await Promise.all([
                readPdfPageCount(file),
                fileToBase64(file)
              ]);
              const pageCount = pages || 0;
              sessionStorage.setItem('yp_order', JSON.stringify({
                service: serviceName,
                pageCount: pageCount,
                fileName: file.name,
                fileType: file.type,
                fileData: base64,
                priceBw: priceBw,
                priceColor: priceColor
              }));
              window.location.href = 'pesanan.html';
            } catch (err) {
              showToast('Gagal membaca file PDF. Coba file lain.');
              fileLabel.textContent = 'Pilih file untuk diunggah';
              uploadZone.classList.remove('has-file');
            }
          } else {
            showToast('Upload file PDF untuk melanjutkan ke halaman pesanan.');
            fileLabel.textContent = 'Pilih file untuk diunggah';
            uploadZone.classList.remove('has-file');
          }
        } else {
          fileLabel.textContent = 'Pilih file untuk diunggah';
          uploadZone.classList.remove('has-file');
        }
      });



      submitBtn.addEventListener('click', () => {
        showToast('Upload file PDF untuk melanjutkan ke halaman pesanan.');
      });
    });
  }


  /* ------------------------------------------------------
     RENDER GALLERY
  ------------------------------------------------------ */
  const bookGalleryEl = document.getElementById('bookGallery');

  function buildWaLink(message) {
    const cfg = window.YOURPRINT_CONFIG || {};
    const waNumber = cfg.WHATSAPP_NUMBER || '6281234567890';
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  }

  function fixGoogleDriveUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
      const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = matchD ? matchD[1] : (matchId ? matchId[1] : null);
      if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return url;
  }

  function renderGalleryData() {
    if (!bookGalleryEl) return;
    if (bookGallery.length === 0) {
      if (fetchFailed) {
        renderErrorState(bookGalleryEl, 'Gagal memuat galeri buku. Periksa koneksi internet Anda.');
        return;
      }
      bookGalleryEl.innerHTML = '<p class="text-sm text-slate-soft p-4">Tidak ada galeri untuk ditampilkan.</p>';
      return;
    }

    bookGalleryEl.innerHTML = bookGallery.map(book => {
      const imgUrl = fixGoogleDriveUrl(book.image);
      return `
        <a href="buku-custom-detail.html?code=${encodeURIComponent(book.code)}" class="book-card" data-book='${JSON.stringify({ code: book.code, title: book.title, image: book.image, description: book.description || '', priceA4: book.priceA4, priceA5: book.priceA5, priceB5: book.priceB5 }).replace(/'/g, "&#39;")}'>
          <div class="book-card__thumb">
            <img src="${imgUrl}" alt="${book.title}" loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
            <div class="book-card__thumb-fallback">📘</div>
          </div>
          <div class="book-card__body">
            <span class="book-card__code">Kode: ${book.code}</span>
            <p class="book-card__title">${book.title}</p>
          </div>
        </a>
      `;
    }).join('');

    bookGalleryEl.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', function () {
        var data = this.getAttribute('data-book');
        if (data) sessionStorage.setItem('yp_book_detail', data);
      });
    });
  }

  const galleryPrevBtn = document.getElementById('galleryPrev');
  const galleryNextBtn = document.getElementById('galleryNext');
  if (galleryPrevBtn && galleryNextBtn && bookGalleryEl) {
    const scrollAmount = () => bookGalleryEl.clientWidth * 0.8;
    galleryPrevBtn.addEventListener('click', () => {
      bookGalleryEl.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });
    galleryNextBtn.addEventListener('click', () => {
      bookGalleryEl.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------
     RENDER SERVICES
  ------------------------------------------------------ */
  const printServicesEl = document.getElementById('printServices');
  
  function renderServicesData() {
    if (!printServicesEl) return;
    
    if (printServices.length === 0) {
      if (fetchFailed) {
        renderErrorState(printServicesEl, 'Gagal memuat layanan cetak. Periksa koneksi internet Anda.');
        return;
      }
      printServicesEl.innerHTML = '<p class="text-sm text-slate-soft p-4">Tidak ada layanan cetak.</p>';
      return;
    }

    printServicesEl.innerHTML = printServices.map(s => {
      const hasCalc = parseInt(s.priceBw) > 0 || parseInt(s.priceColor) > 0;
      const imgUrl = fixGoogleDriveUrl(s.image);
      return `
      <div class="print-card" data-service="${s.service}" data-price-bw="${s.priceBw}" data-price-color="${s.priceColor}">
        <div class="print-card__media">
          <img src="${imgUrl}" alt="${s.service}" loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
          <div class="print-card__media-fallback" style="background:${s.fallbackGradient}">
            ${s.iconSvg}
          </div>
        </div>
        <h3 class="font-display font-semibold text-lg mt-4">${s.service}</h3>
        <p class="text-slate-soft text-sm mt-1.5">${s.description}</p>
        <label class="upload-zone">
          <input type="file" class="hidden file-input" ${hasCalc ? 'accept=".pdf,.doc,.docx,.xls,.xlsx"' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0-12 4 4m-4-4-4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
          <span class="file-label">Pilih file untuk diunggah</span>
        </label>
        
        ${hasCalc ? `
        <div class="print-estimate hidden">
          <div class="print-estimate__row">
            <span>Jumlah Halaman</span>
            <span class="print-estimate__pages">—</span>
          </div>
          <div class="print-estimate__modes">
            <label class="print-estimate__mode">
              <input type="radio" name="colorMode-${s.id}" value="bw" checked>
              <span>Hitam Putih <em>Rp${s.priceBw}/lbr</em></span>
            </label>
            <label class="print-estimate__mode">
              <input type="radio" name="colorMode-${s.id}" value="color">
              <span>Warna <em>Rp${s.priceColor}/lbr</em></span>
            </label>
          </div>
          <div class="print-estimate__row print-estimate__total">
            <span>Estimasi Harga</span>
            <span class="print-estimate__price">Rp0</span>
          </div>
        </div>
        ` : ''}

        <button class="print-card__btn">Kirim untuk Dicetak</button>
      </div>
    `}).join('');
    
    // Inisialisasi ulang event listener upload
    initPrintCards();
  }


  /* ------------------------------------------------------
     3) DATA PRODUK ATK (Katalog)
  ------------------------------------------------------ */
  const productGrid = document.getElementById('productGrid');
  const productCountLabel = document.getElementById('productCountLabel');
  const productEmptyMsg = document.getElementById('productEmptyMsg');
  const productSearch = document.getElementById('productSearch');
  const productSearchClear = document.getElementById('productSearchClear');
  const categoryTabs = document.getElementById('categoryTabs');
  let activeCategory = 'Semua';

  let showAllProducts = false;
  const MAX_PRODUCTS = 8;

  function renderProducts(keyword = '') {
    const query = keyword.trim().toLowerCase();
    let filtered = query
      ? products.filter(p => p.name.toLowerCase().includes(query))
      : products;

    if (activeCategory !== 'Semua') {
      filtered = filtered.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());
    }

    if (productCountLabel) {
      productCountLabel.textContent = filtered.length;
    }

    if (filtered.length === 0) {
      if (productGrid) {
        productGrid.innerHTML = '';
        productGrid.classList.add('hidden');
      }
      if (productEmptyMsg) {
        if (fetchFailed && !query) {
          productEmptyMsg.innerHTML = 'Gagal memuat produk. Periksa koneksi internet Anda.<br><button onclick="location.reload()" class="cta-secondary text-sm mt-2" style="padding: .4rem .8rem;">Coba Lagi</button>';
        } else {
          productEmptyMsg.innerHTML = 'Produk tidak ditemukan. Coba kata kunci lain, atau hubungi kami langsung lewat WhatsApp.';
        }
        productEmptyMsg.classList.remove('hidden');
      }
      var showAllWrap = document.getElementById('showAllWrap');
      if (showAllWrap) showAllWrap.classList.add('hidden');
      return;
    }

    var showAllWrap = document.getElementById('showAllWrap');
    var displayProducts = (!showAllProducts && !query && activeCategory === 'Semua' && filtered.length > MAX_PRODUCTS)
      ? filtered.slice(0, MAX_PRODUCTS)
      : filtered;

    if (productGrid) {
      productGrid.classList.remove('hidden');
      productGrid.innerHTML = displayProducts.map(p => {
        const imgUrl = fixGoogleDriveUrl(p.image);
        return `
        <a href="produk-detail.html?id=${p.id}" class="product-card product-card--link">
          <div class="product-card__thumb" style="background:${p.bg}">
            <img src="${imgUrl}" alt="${p.name}" loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
            <span class="product-card__thumb-fallback">${p.emoji}</span>
            <button class="product-card__add" data-id="${p.id}" aria-label="Tambah ke keranjang">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
          <div class="product-card__info">
            <h3 class="product-card__name">${p.name}</h3>
            <p class="product-card__price">${formatRupiah(p.price)}</p>
          </div>
        </a>
      `; }).join('');
    }

    if (showAllWrap) {
      if (!showAllProducts && !query && activeCategory === 'Semua' && filtered.length > MAX_PRODUCTS) {
        showAllWrap.classList.remove('hidden');
      } else {
        showAllWrap.classList.add('hidden');
      }
    }
    
    if (productEmptyMsg) productEmptyMsg.classList.add('hidden');
  }

  if (productSearch) {
    productSearch.addEventListener('input', () => {
      renderProducts(productSearch.value);
      if (productSearchClear) productSearchClear.classList.toggle('hidden', productSearch.value.length === 0);
    });

    productSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const produkSection = document.getElementById('produk');
        if (produkSection) produkSection.scrollIntoView({ behavior: 'smooth' });
        productSearch.blur();
      }
    });
  }

  if (productSearchClear) {
    productSearchClear.addEventListener('click', () => {
      productSearch.value = '';
      productSearchClear.classList.add('hidden');
      renderProducts();
      productSearch.focus();
    });
  }

  if (categoryTabs) {
    categoryTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.quicknav-pill');
      if (!btn) return;
      activeCategory = btn.dataset.category;
      categoryTabs.querySelectorAll('.quicknav-pill').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      showAllProducts = false;
      renderProducts(productSearch ? productSearch.value : '');
    });
  }

  var showAllBtn = document.getElementById('showAllBtn');
  if (showAllBtn) {
    showAllBtn.addEventListener('click', function() {
      showAllProducts = true;
      renderProducts(productSearch ? productSearch.value : '');
      var produkSection = document.getElementById('produk');
      if (produkSection) produkSection.scrollIntoView({ behavior: 'smooth' });
    });
  }


  /* ------------------------------------------------------
     TESTIMONI PELANGGAN
  ------------------------------------------------------ */
  const testimonialGrid = document.getElementById('testimonialGrid');

  function renderTestimonials() {
    if (!testimonialGrid) return;
    if (testimonials.length === 0) {
      if (fetchFailed) {
        renderErrorState(testimonialGrid, 'Gagal memuat testimoni.');
        return;
      }
      testimonialGrid.innerHTML = '<p class="text-sm text-slate-soft">Belum ada testimoni.</p>';
      return;
    }

    testimonialGrid.innerHTML = testimonials.map(t => {
      const stars = '★'.repeat(Number(t.rating) || 5) + '☆'.repeat(5 - (Number(t.rating) || 5));
      return `
        <div class="testimonial-card">
          <div class="testimonial-card__stars">${stars}</div>
          <p class="testimonial-card__text">"${t.text}"</p>
          <p class="testimonial-card__author">— ${t.name}</p>
        </div>
      `;
    }).join('');
  }


  /* ------------------------------------------------------
     4) KERANJANG BELANJA (Cart)
  ------------------------------------------------------ */
  let cart = []; // { id, name, price, qty }

  // Load cart dari localStorage (persistensi antar sesi)
  try {
    const savedCart = localStorage.getItem('yp_cart');
    if (savedCart) cart = JSON.parse(savedCart);
  } catch(e) {}

  const cartItemsEl = document.getElementById('cartItems');
  const cartEmptyMsg = document.getElementById('cartEmptyMsg');
  const cartCountEl = document.getElementById('cartCount');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartTotalEl = document.getElementById('cartTotal');

  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartToggle = document.getElementById('cartToggle');
  const cartClose = document.getElementById('cartClose');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const bottomNavEl = document.getElementById('bottomNav');

  function syncBottomNavVisibility() {
    if (!bottomNavEl) return;
    const cartIsOpen = cartDrawer.classList.contains('open');
    bottomNavEl.style.display = cartIsOpen ? 'none' : '';
  }

  function openCart() {
    renderCart();
    cartDrawer.classList.add('open');
    cartOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    syncBottomNavVisibility();
    
    // Auto-switch ke Pesanan Saya jika user login
    const userInfo = getUserSession();
    if (userInfo && userInfo.phone) {
      switchCartTab('orders');
      if (orderPhoneInput) orderPhoneInput.value = userInfo.phone;
      fetchOrdersByPhone(userInfo.phone);
    } else {
      switchCartTab('cart');
    }
  }
  function closeCart() {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    syncBottomNavVisibility();
  }
  
  if (cartToggle) cartToggle.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    saveCart();
    renderCart();
    showToast(`${product.name} ditambahkan ke keranjang`);
  }

  function changeQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== productId);
    }
    saveCart();
    renderCart();
  }

  function removeItem(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCart();
    renderCart();
  }

  function saveCart() {
    try {
      localStorage.setItem('yp_cart', JSON.stringify(cart));
    } catch(e) {}
  }

  function renderCart() {
    const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

    if (cartCountEl) cartCountEl.textContent = totalItems;

    if (cart.length === 0) {
      if (cartItemsEl) cartItemsEl.innerHTML = '';
      if (cartEmptyMsg) cartEmptyMsg.classList.remove('hidden');
    } else {
      if (cartEmptyMsg) cartEmptyMsg.classList.add('hidden');
      if (cartItemsEl) {
        cartItemsEl.innerHTML = cart.map(item => `
          <div class="cart-item-row">
            <div class="cart-line text-[13px] mb-1.5">
              <span class="pr-2">${item.name}</span>
              <button class="text-slate-soft hover:text-stamp shrink-0" data-remove="${item.id}" aria-label="Hapus item">✕</button>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button class="qty-btn" data-decrease="${item.id}">−</button>
                <span class="w-5 text-center text-xs">${item.qty}</span>
                <button class="qty-btn" data-increase="${item.id}">+</button>
              </div>
              <span class="text-xs font-semibold">${formatRupiah(item.qty * item.price)}</span>
            </div>
          </div>
        `).join('');
      }
    }

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatRupiah(subtotal);
    if (cartTotalEl) cartTotalEl.textContent = formatRupiah(subtotal);
  }

  if (productGrid) {
    productGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.product-card__add');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      addToCart(btn.dataset.id);

      btn.classList.add('just-added');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      setTimeout(() => {
        btn.classList.remove('just-added');
        btn.innerHTML = originalHTML;
      }, 900);
    });
  }

  if (cartItemsEl) {
    cartItemsEl.addEventListener('click', (e) => {
      const inc = e.target.closest('[data-increase]');
      const dec = e.target.closest('[data-decrease]');
      const rem = e.target.closest('[data-remove]');
      if (inc) changeQty(inc.dataset.increase, 1);
      if (dec) changeQty(dec.dataset.decrease, -1);
      if (rem) removeItem(rem.dataset.remove);
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        showToast('Keranjang masih kosong');
        return;
      }

      requireCustomerInfo(async () => {
        const originalText = checkoutBtn.textContent;
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Memproses...';

        const subtotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

        try {
          await sendToBackend({
            type: 'order',
            timestamp: Date.now(),
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            subtotal,
          });
        } catch (err) {
          showToast('Gagal mencatat pesanan, tapi tetap lanjut ke WhatsApp.');
        }

        const lines = cart.map(i => `- ${i.name} x${i.qty} (${formatRupiah(i.qty * i.price)})`).join('%0A');
        const message = `Halo YourPrint, saya ${customerInfo.name} ingin memesan:%0A${lines}%0A%0ATotal: ${formatRupiah(subtotal)}`;
        const waNumber = (window.YOURPRINT_CONFIG && window.YOURPRINT_CONFIG.WHATSAPP_NUMBER) || '6281234567890';
        window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');

        cart = [];
        saveCart();
        renderCart();
        closeCart();

        checkoutBtn.disabled = false;
        checkoutBtn.textContent = originalText;
      });
    });
  }

  renderCart();


  /* ------------------------------------------------------
     5) DATA PEMESAN
  ------------------------------------------------------ */
  let customerInfo = null; // { name, phone }
  let pendingAction = null; 

  const customerModalOverlay = document.getElementById('customerModalOverlay');
  const customerModalClose = document.getElementById('customerModalClose');
  const customerForm = document.getElementById('customerForm');
  const customerNameInput = document.getElementById('customerNameInput');
  const customerPhoneInput = document.getElementById('customerPhoneInput');

  // Load user session from login.html
  (function loadUserSession() {
    try {
      const raw = localStorage.getItem('yp_user_info');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !data.expiry || Date.now() > data.expiry) {
        localStorage.removeItem('yp_user_info');
        return;
      }
      customerInfo = { name: data.name, phone: data.phone };

      // Pre-fill customer modal inputs
      if (customerNameInput) customerNameInput.value = data.name || '';
      if (customerPhoneInput) customerPhoneInput.value = data.phone || '';
    } catch (e) {}
  })();

  function requireCustomerInfo(action) {
    if (customerInfo) {
      action();
      return;
    }
    pendingAction = action;
    if (customerModalOverlay) customerModalOverlay.classList.remove('hidden');
    syncBottomNavVisibility();
  }

  function closeCustomerModal() {
    if (customerModalOverlay) customerModalOverlay.classList.add('hidden');
    pendingAction = null;
    syncBottomNavVisibility();
  }

  if (customerModalClose) {
    customerModalClose.addEventListener('click', closeCustomerModal);
  }
  if (customerModalOverlay) {
    customerModalOverlay.addEventListener('click', (e) => {
      if (e.target === customerModalOverlay) closeCustomerModal();
    });
  }

  if (customerForm) {
    customerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      customerInfo = {
        name: customerNameInput.value.trim(),
        phone: customerPhoneInput.value.trim(),
      };
      if (customerModalOverlay) customerModalOverlay.classList.add('hidden');
      syncBottomNavVisibility();
      if (pendingAction) {
        const action = pendingAction;
        pendingAction = null;
        action();
      }
    });
  }


  /* ------------------------------------------------------
     6) KONEKSI KE GOOGLE SHEET
  ------------------------------------------------------ */
  function sendToBackend(payload) {
    const cfg = window.YOURPRINT_CONFIG || {};
    if (!cfg.GAS_URL || cfg.GAS_URL.indexOf('PASTE_URL') !== -1) {
      return Promise.resolve();
    }

    return fetch(cfg.GAS_URL.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------
     7) TOAST NOTIFICATION
  ------------------------------------------------------ */
  let toastEl = document.getElementById('toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    document.body.appendChild(toastEl);
  }
  let toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }
  window.showToast = showToast;

  /* ------------------------------------------------------
     8) PESANAN SAYA — ORDER TRACKING (inside cart drawer)
  ------------------------------------------------------ */
  const orderPhoneInput = document.getElementById('orderPhoneInput');
  const orderLookupBtn = document.getElementById('orderLookupBtn');
  const orderLookupLoading = document.getElementById('orderLookupLoading');
  const orderLookupEmpty = document.getElementById('orderLookupEmpty');
  const orderLookupError = document.getElementById('orderLookupError');
  const orderList = document.getElementById('orderList');
  const orderLookupForm = document.getElementById('orderLookupForm');

  // Tab switching
  const tabCartBtn = document.getElementById('tabCartBtn');
  const tabOrdersBtn = document.getElementById('tabOrdersBtn');
  const cartTabCart = document.getElementById('cartTabCart');
  const cartTabOrders = document.getElementById('cartTabOrders');
  const cartDrawerTitle = document.getElementById('cartDrawerTitle');
  const cartFooter = document.getElementById('cartFooter');

  function switchCartTab(tab) {
    if (tab === 'orders') {
      cartTabCart.classList.add('hidden');
      cartTabOrders.classList.remove('hidden');
      cartTabOrders.style.display = 'flex';
      cartTabCart.style.display = 'none';
      cartFooter.style.display = 'none';
      cartDrawerTitle.textContent = 'Pesanan Saya';
      tabCartBtn.classList.remove('cart-tab--active');
      tabOrdersBtn.classList.add('cart-tab--active');
    } else {
      cartTabOrders.classList.add('hidden');
      cartTabCart.classList.remove('hidden');
      cartTabCart.style.display = 'flex';
      cartTabOrders.style.display = 'none';
      cartFooter.style.display = '';
      cartDrawerTitle.textContent = 'Keranjang';
      tabOrdersBtn.classList.remove('cart-tab--active');
      tabCartBtn.classList.add('cart-tab--active');
    }
  }

  if (tabCartBtn) tabCartBtn.addEventListener('click', () => switchCartTab('cart'));
  if (tabOrdersBtn) tabOrdersBtn.addEventListener('click', () => switchCartTab('orders'));

  // Initialize: hide orders tab
  if (cartTabOrders) { cartTabOrders.style.display = 'none'; }

  const ORDER_STATUSES = ['Menunggu', 'Dikonfirmasi', 'Diproses', 'Siap Diambil', 'Selesai'];

  function getStatusClass(status) {
    const s = (status || 'Menunggu').toLowerCase();
    if (s === 'dikonfirmasi') return 'dikonfirmasi';
    if (s === 'diproses') return 'diproses';
    if (s === 'siap diambil') return 'siapdiambil';
    if (s === 'selesai') return 'selesai';
    if (s === 'dibatalkan') return 'dibatalkan';
    return 'menunggu';
  }

  function renderProgressBar(currentStatus) {
    if (currentStatus === 'Dibatalkan') {
      return '<div class="text-center text-xs font-semibold text-stamp mt-2">Dibatalkan</div>';
    }
    const currentIdx = ORDER_STATUSES.indexOf(currentStatus);
    const steps = ORDER_STATUSES.map((label, i) => {
      let cls = '';
      if (i < currentIdx) cls = 'is-done';
      else if (i === currentIdx) cls = 'is-active';
      const lineCls = i < currentIdx ? 'is-done' : '';
      return `
        <div class="order-progress__step ${cls}">
          <div class="order-progress__dot"></div>
          <span class="order-progress__label">${label}</span>
        </div>
        ${i < ORDER_STATUSES.length - 1 ? `<div class="order-progress__line ${lineCls}"></div>` : ''}
      `;
    }).join('');
    return `<div class="order-progress">${steps}</div>`;
  }

  function renderOrderCards(orders) {
    if (!orders || orders.length === 0) {
      orderList.innerHTML = '';
      orderLookupEmpty.classList.remove('hidden');
      return;
    }
    orderLookupEmpty.classList.add('hidden');

    orderList.innerHTML = orders.map(o => {
      const status = o.Status || 'Menunggu';
      const statusClass = getStatusClass(status);
      const badgeCls = 'status-badge status-badge--' + statusClass;
      const detail = o._type === 'ATK'
        ? (o['Detail Produk'] || '-')
        : `${o.Layanan || '-'}${o['Nama File'] && o['Nama File'] !== '-' ? '\nFile: ' + o['Nama File'] : ''}`;
      const harga = o._type === 'ATK'
        ? Number(o.Subtotal) || 0
        : Number(o['Total Harga']) || Number(o['Estimasi Harga']) || 0;
      const alamat = o.Alamat || '';
      const metodeBayar = o['Metode Bayar'] || '';
      const mapsLink = o['Link Maps'] || '';
      
      let metaHtml = '';
      if (alamat || metodeBayar) {
        metaHtml = '<div class="order-card__meta">';
        if (metodeBayar) metaHtml += `<span>💳 ${metodeBayar}</span>`;
        if (alamat) metaHtml += `<span>📍 ${alamat.length > 30 ? alamat.substring(0, 30) + '...' : alamat}</span>`;
        if (mapsLink && mapsLink !== '-') metaHtml += `<a href="${mapsLink}" target="_blank" class="text-blue-500 underline">📍 Buka Maps</a>`;
        metaHtml += '</div>';
      }
      
      return `
        <div class="order-card">
          <div class="order-card__header">
            <span class="order-card__id">${o['Order ID'] || '-'}</span>
            <span class="order-card__date">${new Date(o.Waktu).toLocaleString('id-ID')}</span>
          </div>
          <div class="order-card__detail">${detail}</div>
          ${metaHtml}
          ${renderProgressBar(status)}
          <div class="order-card__footer">
            <span class="${badgeCls}">${status}</span>
            <span class="order-card__price">Rp${harga.toLocaleString('id-ID')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateCartBadge(orders) {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const pending = (orders || []).filter(o => 
      o.Status === 'Dikonfirmasi' || o.Status === 'Siap Diambil' || o.Status === 'Diproses'
    ).length;
    if (pending > 0) {
      badge.textContent = pending;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  async function fetchOrdersByPhone(phone) {
    if (!window.YOURPRINT_CONFIG || !window.YOURPRINT_CONFIG.GAS_URL) return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      showToast('Nomor WhatsApp tidak valid');
      return;
    }

    orderLookupLoading.classList.remove('hidden');
    orderLookupEmpty.classList.add('hidden');
    orderLookupError.classList.add('hidden');
    orderList.innerHTML = '';

    try {
      const url = window.YOURPRINT_CONFIG.GAS_URL.trim() + '?action=getOrdersByPhone&phone=' + encodeURIComponent(cleanPhone) + '&t=' + Date.now();
      const res = await fetch(url);
      const data = await res.json();
      orderLookupLoading.classList.add('hidden');

      if (data.result === 'success') {
        renderOrderCards(data.orders);
        updateCartBadge(data.orders);
      } else {
        orderLookupError.classList.remove('hidden');
      }
    } catch (err) {
      console.error('[YourPrint] fetchOrdersByPhone error:', err);
      orderLookupLoading.classList.add('hidden');
      orderLookupError.classList.remove('hidden');
    }
  }

  // Form handler
  if (orderLookupBtn) {
    orderLookupBtn.addEventListener('click', () => {
      const phone = orderPhoneInput.value.trim();
      if (!phone) {
        showToast('Masukkan nomor WhatsApp');
        return;
      }
      fetchOrdersByPhone(phone);
    });
  }
  if (orderPhoneInput) {
    orderPhoneInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        orderLookupBtn.click();
      }
    });
  }

  // Auto-load orders for logged-in users
  function getUserSession() {
    try {
      const raw = localStorage.getItem('yp_user_info');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.phone) return null;
      if (data.expiry && Date.now() > data.expiry) {
        localStorage.removeItem('yp_user_info');
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  (function autoLoadOrders() {
    const userInfo = getUserSession();
    if (!userInfo) return;
    if (orderPhoneInput) orderPhoneInput.value = userInfo.phone;
    setTimeout(() => {
      fetchOrdersByPhone(userInfo.phone);
    }, 500);
  })();

  // JALANKAN FETCH SAAT LOAD
  fetchDynamicData();

});

