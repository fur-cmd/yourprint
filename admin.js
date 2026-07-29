(function () {
  'use strict';

  var cfg = window.YOURPRINT_CONFIG || {};
  var GAS_URL = cfg.GAS_URL ? cfg.GAS_URL.trim() : '';
  var tokenData = (function () {
    try { return JSON.parse(sessionStorage.getItem('yp_admin_token')); } catch (e) { return null; }
  })();
  var API_TOKEN = tokenData ? tokenData.token : '';

  function $(id) { return document.getElementById(id); }

  var toastEl = document.querySelector('.toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  var toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3000);
  }

  var allData = null;

  var statusClassMap = {
    'Menunggu': 'bg-yellow-100 text-yellow-700',
    'Dikonfirmasi': 'bg-blue-100 text-blue-700',
    'Diproses': 'bg-indigo-100 text-indigo-700',
    'Siap Diambil': 'bg-green-100 text-green-700',
    'Selesai': 'bg-green-600 text-white',
    'Dibatalkan': 'bg-red-100 text-red-700'
  };

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

  function formatRupiah(num) {
    if (num === undefined || num === null || num === '' || num === '-') return '-';
    return 'Rp' + Number(num).toLocaleString('id-ID');
  }

  function formatDate(d) {
    if (!d) return '-';
    try {
      var dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return d; }
  }

  function formatDateShort(d) {
    if (!d) return '-';
    try {
      var dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return d; }
  }

  /* ==================== API ==================== */

  async function apiGet(action) {
    var url = GAS_URL + '?action=' + encodeURIComponent(action) + '&t=' + Date.now();
    var res = await fetch(url);
    return res.json();
  }

  async function apiPost(payload) {
    var res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function collectImage(prefix) {
    var fileInput = $(prefix + '-image-file');
    var urlInput = $(prefix + '-image-url');
    var hiddenInput = $(prefix + '-image');

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      var file = fileInput.files[0];
      var data = await readFileAsBase64(file);
      return {
        image: '',
        imageFile: { data: data, mimeType: file.type, name: file.name }
      };
    }

    if (urlInput && urlInput.value.trim()) {
      return { image: urlInput.value.trim() };
    }

    if (hiddenInput && hiddenInput.value) {
      return { image: hiddenInput.value };
    }

    return { image: '' };
  }

  /* ==================== Tabs ==================== */

  function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(function (el) {
      el.classList.remove('active');
      el.classList.add('hidden');
    });
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.classList.remove('active');
    });
    var target = $(tabId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }
    var navBtn = document.querySelector('.nav-btn[data-tab="' + tabId + '"]');
    if (navBtn) navBtn.classList.add('active');
  }

  document.querySelectorAll('.nav-btn[data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });

  /* ==================== Mobile Menu ==================== */

  var mobileMenuBtn = $('mobileMenuBtn');
  var sidebarNav = $('sidebarNav');
  if (mobileMenuBtn && sidebarNav) {
    mobileMenuBtn.addEventListener('click', function () {
      sidebarNav.classList.toggle('hidden');
      sidebarNav.classList.toggle('flex');
    });
  }

  /* ==================== Modal ==================== */

  var overlay = $('modalOverlay');

  function openModal(id) {
    document.querySelectorAll('.modal-box').forEach(function (m) { m.classList.add('hidden'); });
    var modal = $(id);
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
  }

  function closeModals() {
    document.querySelectorAll('.modal-box').forEach(function (m) { m.classList.add('hidden'); });
    if (overlay) overlay.classList.add('hidden');
  }

  window.openModal = openModal;
  window.closeModals = closeModals;

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModals();
    });
  }
  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', closeModals);
  });

  /* ==================== Logout ==================== */

  $('logoutBtn').addEventListener('click', function () {
    sessionStorage.removeItem('yp_admin_token');
    window.location.replace('admin-login.html');
  });

  /* ==================== Load Data ==================== */

  async function loadData() {
    try {
      var data = await apiGet('getAllDataAdmin');
      if (data.result !== 'success') {
        showToast('⚠️ Gagal memuat data');
        return;
      }
      allData = data;
      renderDashboard(data);
      renderProducts(data.products || []);
      renderGallery(data.gallery || []);
      renderServices(data.services || []);
      renderOrdersATK(data.ordersATK || []);
      renderOrdersCetak(data.ordersCetak || []);
      renderTestimonials(data.testimonials || []);
      renderBanners(data.banners || []);
      renderPromoHub(data);
    } catch (err) {
      console.error('loadData error:', err);
      showToast('⚠️ Gagal terhubung ke server');
    }
  }

  window.loadData = loadData;

  /* ==================== Dashboard ==================== */

  function renderDashboard(data) {
    var ordersATK = data.ordersATK || [];
    var ordersCetak = data.ordersCetak || [];
    var allOrders = [];
    ordersATK.forEach(function (o) { allOrders.push(Object.assign({}, o, { _type: 'ATK' })); });
    ordersCetak.forEach(function (o) { allOrders.push(Object.assign({}, o, { _type: 'Cetak' })); });

    $('statTotal').textContent = allOrders.length;

    var todayStr = new Date().toISOString().slice(0, 10);
    var todayOrders = allOrders.filter(function (o) {
      var d = o.Waktu ? new Date(o.Waktu) : null;
      return d && !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === todayStr;
    });
    $('statToday').textContent = todayOrders.length;

    var revenue = allOrders.reduce(function (sum, o) {
      return sum + Number(o.Subtotal || o['Total Harga'] || o['Estimasi Harga'] || 0);
    }, 0);
    $('statRevenue').textContent = formatRupiah(revenue);

    var pending = allOrders.filter(function (o) {
      return (o.Status || '').toLowerCase() === 'menunggu';
    }).length;
    $('statPending').textContent = pending;

    var recent = allOrders.slice().sort(function (a, b) {
      var da = a.Waktu ? new Date(a.Waktu) : new Date(0);
      var db = b.Waktu ? new Date(b.Waktu) : new Date(0);
      return db - da;
    }).slice(0, 10);

    var tbody = $('dashboardRecentOrders');
    if (!tbody) return;

    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-soft">Belum ada pesanan</td></tr>';
      return;
    }

    tbody.innerHTML = recent.map(function (o) {
      var status = o.Status || 'Menunggu';
      var sc = statusClassMap[status] || 'bg-gray-100 text-gray-600';
      var typeClass = o._type === 'ATK' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
      return '<tr>' +
        '<td class="p-4 font-mono text-xs">' + (o['Order ID'] || '-') + '</td>' +
        '<td class="p-4 text-xs">' + formatDate(o.Waktu) + '</td>' +
        '<td class="p-4 text-xs">' + (o['Nama Pemesan'] || '-') + '</td>' +
        '<td class="p-4 text-xs"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + typeClass + '">' + o._type + '</span></td>' +
        '<td class="p-4"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + sc + '">' + status + '</span></td>' +
        '</tr>';
    }).join('');
  }

  /* ==================== Products ==================== */

  function renderProducts(products) {
    var tbody = document.querySelector('#table-products tbody');
    if (!tbody) return;
    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-soft">Belum ada produk</td></tr>';
      return;
    }
    tbody.innerHTML = products.map(function (p, i) {
      var imgUrl = fixGoogleDriveUrl(p.image);
      return '<tr>' +
        '<td class="p-4 text-2xl text-center">' + (p.emoji || '📄') + '</td>' +
        '<td class="p-4 font-medium">' + (p.name || '-') + '</td>' +
        '<td class="p-4">' + formatRupiah(p.price) + '</td>' +
        '<td class="p-4 text-xs">' + (p.category || '-') + '</td>' +
        '<td class="p-4">' + (imgUrl ? '<img src="' + imgUrl + '" alt="" class="w-10 h-10 object-cover rounded" onerror="this.style.display=\'none\'">' : '-') + '</td>' +
        '<td class="p-4 text-right">' +
        '<button class="text-xs text-stamp hover:underline mr-2" onclick="editProduct(' + i + ')">Edit</button>' +
        '<button class="text-xs text-red-500 hover:underline" onclick="deleteProduct(' + i + ')">Hapus</button>' +
        '</td></tr>';
    }).join('');
  }

  window.editProduct = function (index) {
    if (!allData || !allData.products) return;
    var p = allData.products[index];
    $('p-id').value = p.id || '';
    $('p-name').value = p.name || '';
    $('p-price').value = p.price || '';
    $('p-emoji').value = p.emoji || '';
    $('p-category').value = p.category || 'Kertas';
    $('p-bg').value = p.bg || '';
    $('p-description').value = p.description || '';
    $('p-image').value = p.image || '';
    $('p-image-url').value = '';
    $('p-image-file').value = '';
    $('modal-product-title').textContent = 'Edit Produk';
    openModal('modal-product');
  };

  window.resetProductForm = function () {
    $('form-product').reset();
    $('p-id').value = '';
    $('p-image').value = '';
    $('modal-product-title').textContent = 'Tambah Produk';
  };

  window.deleteProduct = async function (index) {
    if (!allData || !allData.products) return;
    var p = allData.products[index];
    if (!confirm('Hapus produk "' + (p.name || '') + '"?')) return;
    try {
      var res = await apiPost({ type: 'delete-product', id: p.id, token: API_TOKEN });
      if (res.result === 'success') {
        showToast('✓ Produk dihapus');
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menghapus'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menghapus');
    }
  };

  $('form-product').addEventListener('submit', async function (e) {
    e.preventDefault();
    var imgData = await collectImage('p');
    var payload = {
      type: 'upsert-product',
      token: API_TOKEN,
      item: {
        id: $('p-id').value || ('p-' + Date.now()),
        name: $('p-name').value,
        price: Number($('p-price').value),
        emoji: $('p-emoji').value,
        bg: $('p-bg').value,
        category: $('p-category').value,
        description: $('p-description').value,
        image: imgData.image,
        imageFile: imgData.imageFile
      }
    };
    try {
      var res = await apiPost(payload);
      if (res.result === 'success') {
        showToast('✓ Produk disimpan');
        closeModals();
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menyimpan'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menyimpan');
    }
  });

  /* ==================== Gallery ==================== */

  function renderGallery(gallery) {
    var tbody = document.querySelector('#table-gallery tbody');
    if (!tbody) return;
    if (!gallery || gallery.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-soft">Belum ada galeri</td></tr>';
      return;
    }
    tbody.innerHTML = gallery.map(function (g, i) {
      var imgUrl = fixGoogleDriveUrl(g.image);
      return '<tr>' +
        '<td class="p-4 font-mono text-xs">' + (g.code || '-') + '</td>' +
        '<td class="p-4 font-medium">' + (g.title || '-') + '</td>' +
        '<td class="p-4">' + (imgUrl ? '<img src="' + imgUrl + '" alt="" class="w-10 h-10 object-cover rounded" onerror="this.style.display=\'none\'">' : '-') + '</td>' +
        '<td class="p-4 text-right">' +
        '<button class="text-xs text-stamp hover:underline mr-2" onclick="editGallery(' + i + ')">Edit</button>' +
        '<button class="text-xs text-red-500 hover:underline" onclick="deleteGallery(' + i + ')">Hapus</button>' +
        '</td></tr>';
    }).join('');
  }

  window.editGallery = function (index) {
    if (!allData || !allData.gallery) return;
    var g = allData.gallery[index];
    $('g-code').value = g.code || '';
    $('g-title').value = g.title || '';
    $('g-description').value = g.description || '';
    $('g-priceA4').value = g.priceA4 || '';
    $('g-priceA5').value = g.priceA5 || '';
    $('g-priceB5').value = g.priceB5 || '';
    $('g-image').value = g.image || '';
    $('g-image-url').value = '';
    $('g-image-file').value = '';
    $('modal-gallery-title').textContent = 'Edit Galeri';
    openModal('modal-gallery');
  };

  window.resetGalleryForm = function () {
    $('form-gallery').reset();
    $('g-image').value = '';
    $('modal-gallery-title').textContent = 'Tambah Galeri Buku';
  };

  window.deleteGallery = async function (index) {
    if (!allData || !allData.gallery) return;
    var g = allData.gallery[index];
    if (!confirm('Hapus galeri "' + (g.title || '') + '"?')) return;
    try {
      var res = await apiPost({ type: 'delete-gallery', id: g.code, token: API_TOKEN });
      if (res.result === 'success') {
        showToast('✓ Galeri dihapus');
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menghapus'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menghapus');
    }
  };

  $('form-gallery').addEventListener('submit', async function (e) {
    e.preventDefault();
    var imgData = await collectImage('g');
    var payload = {
      type: 'upsert-gallery',
      token: API_TOKEN,
      item: {
        code: $('g-code').value || ('bc-' + Date.now()),
        title: $('g-title').value,
        description: $('g-description').value,
        priceA4: Number($('g-priceA4').value) || '',
        priceA5: Number($('g-priceA5').value) || '',
        priceB5: Number($('g-priceB5').value) || '',
        image: imgData.image,
        imageFile: imgData.imageFile
      }
    };
    try {
      var res = await apiPost(payload);
      if (res.result === 'success') {
        showToast('✓ Galeri disimpan');
        closeModals();
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menyimpan'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menyimpan');
    }
  });

  /* ==================== Services ==================== */

  function renderServices(services) {
    var tbody = document.querySelector('#table-services tbody');
    if (!tbody) return;
    if (!services || services.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-soft">Belum ada layanan</td></tr>';
      return;
    }
    tbody.innerHTML = services.map(function (s, i) {
      var priceText = (s.priceBw ? formatRupiah(s.priceBw) : '-') + ' / ' + (s.priceColor ? formatRupiah(s.priceColor) : '-');
      return '<tr>' +
        '<td class="p-4 font-medium">' + (s.service || s.name || '-') + '</td>' +
        '<td class="p-4 text-xs">' + priceText + '</td>' +
        '<td class="p-4 text-xs text-slate-soft max-w-xs truncate">' + (s.description || '-') + '</td>' +
        '<td class="p-4 text-right">' +
        '<button class="text-xs text-stamp hover:underline mr-2" onclick="editService(' + i + ')">Edit</button>' +
        '<button class="text-xs text-red-500 hover:underline" onclick="deleteService(' + i + ')">Hapus</button>' +
        '</td></tr>';
    }).join('');
  }

  window.editService = function (index) {
    if (!allData || !allData.services) return;
    var s = allData.services[index];
    $('s-id').value = s.id || '';
    $('s-name').value = s.service || '';
    $('s-bw').value = s.priceBw || '';
    $('s-color').value = s.priceColor || '';
    $('s-desc').value = s.description || '';
    $('s-image').value = s.image || '';
    $('s-image-url').value = '';
    $('s-image-file').value = '';
    $('s-gradient').value = s.fallbackGradient || '';
    $('s-svg').value = s.iconSvg || '';
    $('modal-service-title').textContent = 'Edit Layanan';
    openModal('modal-service');
  };

  window.resetServiceForm = function () {
    $('form-service').reset();
    $('s-id').value = '';
    $('s-image').value = '';
    $('modal-service-title').textContent = 'Tambah Layanan Cetak';
  };

  window.deleteService = async function (index) {
    if (!allData || !allData.services) return;
    var s = allData.services[index];
    if (!confirm('Hapus layanan "' + (s.service || '') + '"?')) return;
    try {
      var res = await apiPost({ type: 'delete-service', id: s.id, token: API_TOKEN });
      if (res.result === 'success') {
        showToast('✓ Layanan dihapus');
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menghapus'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menghapus');
    }
  };

  $('form-service').addEventListener('submit', async function (e) {
    e.preventDefault();
    var imgData = await collectImage('s');
    var payload = {
      type: 'upsert-service',
      token: API_TOKEN,
      item: {
        id: $('s-id').value || ('s-' + Date.now()),
        service: $('s-name').value,
        priceBw: Number($('s-bw').value) || '',
        priceColor: Number($('s-color').value) || '',
        description: $('s-desc').value,
        fallbackGradient: $('s-gradient').value,
        iconSvg: $('s-svg').value,
        image: imgData.image,
        imageFile: imgData.imageFile
      }
    };
    try {
      var res = await apiPost(payload);
      if (res.result === 'success') {
        showToast('✓ Layanan disimpan');
        closeModals();
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menyimpan'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menyimpan');
    }
  });

  /* ==================== Orders ATK ==================== */

  function renderOrdersATK(orders) {
    var tbody = document.querySelector('#table-orders-atk tbody');
    if (!tbody) return;
    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-soft">Belum ada pesanan ATK</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(function (o, i) {
      var status = o.Status || 'Menunggu';
      var sc = statusClassMap[status] || 'bg-gray-100 text-gray-600';
      var options = ['Menunggu', 'Dikonfirmasi', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan'].map(function (s) {
        return '<option value="' + s + '"' + (s === status ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      return '<tr>' +
        '<td class="p-4 font-mono text-xs">' + (o['Order ID'] || '-') + '</td>' +
        '<td class="p-4 text-xs">' + formatDate(o.Waktu) + '</td>' +
        '<td class="p-4 text-xs">' + (o['Nama Pemesan'] || '-') + '<br><span class="text-[10px] text-slate-soft">' + (o['No. WhatsApp'] || '') + '</span></td>' +
        '<td class="p-4 text-xs whitespace-pre-line max-w-xs">' + (o['Detail Produk'] || '-') + '</td>' +
        '<td class="p-4 text-xs font-semibold">' + formatRupiah(o.Subtotal) + '</td>' +
        '<td class="p-4"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + sc + '">' + status + '</span></td>' +
        '<td class="p-4 text-right">' +
        '<select class="text-xs border border-line rounded px-1 py-0.5" onchange="updateOrderStatus(\'atk\',' + i + ',this.value)">' + options + '</select>' +
        '</td></tr>';
    }).join('');
  }

  window.updateOrderStatus = async function (category, index, newStatus) {
    var orders = category === 'atk' ? allData.ordersATK : allData.ordersCetak;
    if (!orders || !orders[index]) return;
    var o = orders[index];
    try {
      var res = await apiPost({
        type: 'update-status',
        token: API_TOKEN,
        category: category,
        rowIndex: o._rowIndex,
        newStatus: newStatus
      });
      if (res.result === 'success') {
        showToast('✓ Status diubah ke ' + newStatus);
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal update status'));
      }
    } catch (err) {
      showToast('⚠️ Gagal update status');
    }
  };

  /* ==================== Orders Cetak ==================== */

  function renderOrdersCetak(orders) {
    var tbody = document.querySelector('#table-orders-cetak tbody');
    if (!tbody) return;
    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-soft">Belum ada pesanan cetak</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(function (o, i) {
      var status = o.Status || 'Menunggu';
      var sc = statusClassMap[status] || 'bg-gray-100 text-gray-600';
      var options = ['Menunggu', 'Dikonfirmasi', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan'].map(function (s) {
        return '<option value="' + s + '"' + (s === status ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      var fileLink = o['Link File'] && o['Link File'] !== '-' ? '<a href="' + o['Link File'] + '" target="_blank" class="text-stamp underline text-xs">' + (o['Nama File'] || 'File') + '</a>' : (o['Nama File'] || '-');
      var detailCetak = [
        o['Jumlah Halaman'] ? o['Jumlah Halaman'] + ' hlm' : '',
        o['Mode Warna'] || '',
        o['Jumlah Salinan'] ? o['Jumlah Salinan'] + 'x' : '',
        o['Laminasi'] && o['Laminasi'] !== 'Tidak ada' ? o['Laminasi'] : ''
      ].filter(Boolean).join(', ') || '-';
      return '<tr>' +
        '<td class="p-4 font-mono text-xs">' + (o['Order ID'] || '-') + '</td>' +
        '<td class="p-4 text-xs">' + formatDate(o.Waktu) + '</td>' +
        '<td class="p-4 text-xs">' + (o['Nama Pemesan'] || '-') + '<br><span class="text-[10px] text-slate-soft">' + (o['No. WhatsApp'] || '') + '</span></td>' +
        '<td class="p-4 text-xs max-w-xs">' + (o['Alamat'] || '-') + '</td>' +
        '<td class="p-4 text-xs">' + (o['Layanan'] || '-') + '<br>' + fileLink + '</td>' +
        '<td class="p-4 text-xs">' + detailCetak + '</td>' +
        '<td class="p-4 text-xs max-w-xs truncate">' + (o['Catatan'] || '-') + '</td>' +
        '<td class="p-4 text-xs font-semibold">' + formatRupiah(o['Total Harga'] || o['Estimasi Harga']) + '</td>' +
        '<td class="p-4"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + sc + '">' + status + '</span></td>' +
        '<td class="p-4 text-right">' +
        '<select class="text-xs border border-line rounded px-1 py-0.5" onchange="updateOrderStatus(\'cetak\',' + i + ',this.value)">' + options + '</select>' +
        '</td></tr>';
    }).join('');
  }

  /* ==================== Testimonials ==================== */

  function renderTestimonials(testimonials) {
    var tbody = document.querySelector('#table-testimonials tbody');
    if (!tbody) return;
    if (!testimonials || testimonials.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-soft">Belum ada testimoni</td></tr>';
      return;
    }
    tbody.innerHTML = testimonials.map(function (t, i) {
      var approved = t.approved === true || t.approved === 'TRUE' || t.approved === 'true';
      var stars = '';
      for (var s = 0; s < 5; s++) {
        stars += s < Number(t.rating) ? '★' : '☆';
      }
      var statusBadge = approved
        ? '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Disetujui</span>'
        : '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Menunggu</span>';
      return '<tr>' +
        '<td class="p-4 text-xs font-medium">' + (t.name || '-') + '</td>' +
        '<td class="p-4 text-xs text-yellow-500">' + stars + '</td>' +
        '<td class="p-4 text-xs max-w-xs truncate">' + (t.text || '-') + '</td>' +
        '<td class="p-4 text-xs">' + formatDateShort(t.date) + '</td>' +
        '<td class="p-4">' + statusBadge + '</td>' +
        '<td class="p-4 text-right whitespace-nowrap">' +
        (approved ? '' : '<button class="text-xs text-green-600 hover:underline mr-2" onclick="approveTestimonial(' + i + ')">Setujui</button>') +
        '<button class="text-xs text-red-500 hover:underline" onclick="deleteTestimonial(' + i + ')">Hapus</button>' +
        '</td></tr>';
    }).join('');
  }

  window.approveTestimonial = async function (index) {
    if (!allData || !allData.testimonials) return;
    var t = allData.testimonials[index];
    try {
      var res = await apiPost({ type: 'approve-testimonial', token: API_TOKEN, rowIndex: t._rowIndex, approve: true });
      if (res.result === 'success') {
        showToast('✓ Testimoni disetujui');
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal'));
      }
    } catch (err) {
      showToast('⚠️ Gagal');
    }
  };

  window.deleteTestimonial = async function (index) {
    if (!allData || !allData.testimonials) return;
    var t = allData.testimonials[index];
    if (!confirm('Hapus testimoni dari "' + (t.name || '') + '"?')) return;
    try {
      var res = await apiPost({ type: 'delete-testimonial', id: t.id, token: API_TOKEN });
      if (res.result === 'success') {
        showToast('✓ Testimoni dihapus');
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menghapus'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menghapus');
    }
  };

  /* ==================== Banners ==================== */

  function renderBanners(banners) {
    var tbody = document.querySelector('#table-banners tbody');
    if (!tbody) return;
    if (!banners || banners.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-soft">Belum ada banner</td></tr>';
      return;
    }
    tbody.innerHTML = banners.map(function (b, i) {
      var imgUrl = fixGoogleDriveUrl(b.image);
      var active = b.active === true || b.active === 'TRUE' || b.active === 'true';
      var statusBadge = active
        ? '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>'
        : '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Nonaktif</span>';
      return '<tr>' +
        '<td class="p-4">' + (imgUrl ? '<img src="' + imgUrl + '" alt="" class="w-20 h-12 object-cover rounded" onerror="this.style.display=\'none\'">' : '-') + '</td>' +
        '<td class="p-4 text-xs max-w-xs truncate">' + (b.link || '-') + '</td>' +
        '<td class="p-4">' + statusBadge + '</td>' +
        '<td class="p-4 text-right">' +
        '<button class="text-xs text-stamp hover:underline mr-2" onclick="editBanner(' + i + ')">Edit</button>' +
        '<button class="text-xs text-red-500 hover:underline" onclick="deleteBanner(' + i + ')">Hapus</button>' +
        '</td></tr>';
    }).join('');
  }

  window.editBanner = function (index) {
    if (!allData || !allData.banners) return;
    var b = allData.banners[index];
    $('b-id').value = b.id || '';
    $('b-image').value = b.image || '';
    $('b-link').value = b.link || '';
    $('b-active').value = (b.active === true || b.active === 'TRUE' || b.active === 'true') ? 'true' : 'false';
    $('b-image-url').value = '';
    $('b-image-file').value = '';
    $('modal-banner-title').textContent = 'Edit Banner';
    openModal('modal-banner');
  };

  window.resetBannerForm = function () {
    $('form-banner').reset();
    $('b-id').value = '';
    $('b-image').value = '';
    $('b-active').value = 'true';
    $('modal-banner-title').textContent = 'Tambah Banner';
  };

  window.deleteBanner = async function (index) {
    if (!allData || !allData.banners) return;
    var b = allData.banners[index];
    if (!confirm('Hapus banner ini?')) return;
    try {
      var res = await apiPost({ type: 'delete-banner', id: b.id, token: API_TOKEN });
      if (res.result === 'success') {
        showToast('✓ Banner dihapus');
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menghapus'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menghapus');
    }
  };

  $('form-banner').addEventListener('submit', async function (e) {
    e.preventDefault();
    var imgData = await collectImage('b');
    var payload = {
      type: 'upsert-banner',
      token: API_TOKEN,
      item: {
        id: $('b-id').value || ('b-' + Date.now()),
        link: $('b-link').value,
        active: $('b-active').value === 'true' ? true : false,
        image: imgData.image,
        imageFile: imgData.imageFile
      }
    };
    try {
      var res = await apiPost(payload);
      if (res.result === 'success') {
        showToast('✓ Banner disimpan');
        closeModals();
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal menyimpan'));
      }
    } catch (err) {
      showToast('⚠️ Gagal menyimpan');
    }
  });

  /* ==================== Promo Hub ==================== */

  var promoItems = [];
  var activePromoStyle = 'default';
  var selectedPromoIndex = -1;

  function generatePromoText(item, style) {
    var t = item.title || '';
    var sub = item.subtitle || '';
    var d = item.desc || '';
    var label = item._label || '';
    var waNum = cfg.WHATSAPP_NUMBER || '6285242410880';
    var waLink = 'https://wa.me/' + waNum;

    switch (style) {
      case 'promo':
        return '🔥 PROMO SPESIAL! 🔥\n\n' +
          t + '\n' +
          (sub ? '💵 ' + sub + '\n' : '') +
          (d ? '\n' + d + '\n' : '') +
          '\n⏰ Jangan sampai kehabisan! Order sekarang 👇\n' +
          waLink;
      case 'casual':
        return 'Hai! Ada ' + t.toLowerCase() + (sub ? ' — ' + sub : '') + '.\n' +
          (d ? '\n' + d + '\n' : '\n') +
          'Bisa langsung chat aja yuk! 😊\n' +
          waLink;
      case 'professional':
        return '[' + t + ']\n' +
          (sub ? sub + '\n' : '') +
          (d ? '\n' + d + '\n' : '\n') +
          'Tersedia di YourPrint. Informasi & pemesanan:\n' +
          waLink;
      default:
        return t + (sub ? '\n' + sub : '') +
          (d ? '\n\n' + d : '') +
          '\n\nPesan via WhatsApp:\n' +
          waLink;
    }
  }

  function renderPreview(item) {
    var preview = $('promoPreview');
    if (!preview || !item) { return; }

    preview.classList.remove('hidden');

    var thumb = preview.querySelector('#previewThumb div');
    var imgUrl = fixGoogleDriveUrl(item.image);
    if (imgUrl) {
      thumb.innerHTML = '<img src="' + imgUrl + '" alt="" class="w-full h-full object-cover" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + (item.emoji || '📄') + '\'">';
    } else {
      thumb.textContent = item.emoji || '📄';
    }

    $('previewTitle').textContent = item.title || '';
    $('previewMeta').textContent = (item._label || '') + (item.subtitle ? ' — ' + item.subtitle : '');

    var caption = generatePromoText(item, activePromoStyle);
    $('previewCaption').value = caption;
    $('previewStyleIndicator').textContent = 'Gaya: ' + activePromoStyle.charAt(0).toUpperCase() + activePromoStyle.slice(1);
  }

  window.selectPromoItem = function (index) {
    var item = promoItems[index];
    if (!item) return;

    selectedPromoIndex = index;

    document.querySelectorAll('.promo-card').forEach(function (c) { c.classList.remove('is-selected'); });
    var card = document.querySelector('.promo-card[data-index="' + index + '"]');
    if (card) card.classList.add('is-selected');

    renderPreview(item);
  };

  window.copyPromoText = function () {
    var ta = $('previewCaption');
    if (!ta || !ta.value) { showToast('⚠️ Tidak ada teks untuk disalin'); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ta.value.trim()).then(function () {
        showToast('✓ Teks promosi disalin!');
      }).catch(function () { fallbackCopy(ta.value); });
    } else {
      fallbackCopy(ta.value);
    }
  };

  window.sharePromoWa = function () {
    var ta = $('previewCaption');
    if (!ta || !ta.value) { showToast('⚠️ Tidak ada teks untuk dibagikan'); return; }
    var waNum = cfg.WHATSAPP_NUMBER || '6285242410880';
    window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(ta.value.trim()), '_blank', 'noopener');
  };

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('✓ Teks promosi disalin!');
  }

  function renderPromoHub(data) {
    var grid = $('promoGrid');
    if (!grid) return;

    promoItems = [];
    (data.products || []).forEach(function (p) {
      promoItems.push({
        _type: 'product',
        _label: 'Produk ATK',
        title: p.name,
        image: p.image,
        subtitle: formatRupiah(p.price),
        desc: p.description || '',
        badge: p.category || '',
        emoji: p.emoji || '📦'
      });
    });
    (data.gallery || []).forEach(function (g) {
      promoItems.push({
        _type: 'gallery',
        _label: 'Buku Custom',
        title: g.title,
        image: g.image,
        subtitle: g.code,
        desc: g.description || '',
        badge: ''
      });
    });
    (data.services || []).forEach(function (s) {
      promoItems.push({
        _type: 'service',
        _label: 'Layanan Cetak',
        title: s.service,
        image: s.image,
        subtitle: (s.priceBw ? formatRupiah(s.priceBw) : '-') + ' / lembar',
        desc: s.description || '',
        badge: ''
      });
    });

    if (promoItems.length === 0) {
      grid.innerHTML = '<div class="col-span-full p-8 text-center text-slate-soft bg-white rounded-xl border border-line">Belum ada data untuk dipromosikan.</div>';
      $('promoPreview').classList.add('hidden');
      return;
    }

    grid.innerHTML = promoItems.map(function (item, i) {
      var imgUrl = fixGoogleDriveUrl(item.image);
      var imgHtml = imgUrl
        ? '<div class="promo-img-wrap"><img src="' + imgUrl + '" alt="' + item.title + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=\\\\\'w-full h-full flex items-center justify-center text-4xl\\\\\'>' + (item.emoji || '📄') + '</div>\'"><div class="promo-img-overlay"><span>' + item._label + '</span></div></div>'
        : '<div class="promo-img-wrap"><div class="w-full h-full flex items-center justify-center text-4xl">' + (item.emoji || '📄') + '</div></div>';
      return '<div class="bg-white rounded-xl border border-line p-4 promo-card' + (i === selectedPromoIndex ? ' is-selected' : '') + '" data-type="' + item._type + '" data-index="' + i + '">' +
        imgHtml +
        '<h3 class="font-display font-semibold text-sm mb-1">' + item.title + '</h3>' +
        (item.subtitle ? '<p class="text-xs text-stamp font-medium">' + item.subtitle + '</p>' : '') +
        (item.desc ? '<p class="text-xs text-slate-soft mt-1 line-clamp-2">' + item.desc + '</p>' : '') +
        '<div class="flex gap-1.5 mt-3">' +
        '<button class="flex-1 text-xs btn-primary py-1 px-2 rounded" onclick="selectPromoItem(' + i + ')">✏️ Buat Caption</button>' +
        '</div>' +
        '</div>';
    }).join('');

    if (selectedPromoIndex >= 0 && promoItems[selectedPromoIndex]) {
      renderPreview(promoItems[selectedPromoIndex]);
    }
  }

  /* Promo style selector */
  document.addEventListener('click', function (e) {
    var styleBtn = e.target.closest('.promo-style-btn');
    if (!styleBtn) return;

    document.querySelectorAll('.promo-style-btn').forEach(function (b) {
      b.classList.remove('active');
      b.classList.remove('bg-stamp', 'text-white');
      b.classList.add('bg-white', 'border-line', 'text-slate-soft');
    });
    styleBtn.classList.add('active');
    styleBtn.classList.add('bg-stamp', 'text-white');
    styleBtn.classList.remove('bg-white', 'border-line', 'text-slate-soft');

    activePromoStyle = styleBtn.dataset.style;

    if (selectedPromoIndex >= 0 && promoItems[selectedPromoIndex]) {
      renderPreview(promoItems[selectedPromoIndex]);
    } else {
      showToast('✓ Gaya diubah ke ' + styleBtn.textContent.trim());
    }
  });

  /* Preview panel events */
  $('previewCopyBtn').addEventListener('click', copyPromoText);
  $('previewShareBtn').addEventListener('click', sharePromoWa);

  $('previewClose').addEventListener('click', function () {
    $('promoPreview').classList.add('hidden');
    document.querySelectorAll('.promo-card').forEach(function (c) { c.classList.remove('is-selected'); });
    selectedPromoIndex = -1;
  });

  /* Promo filter buttons */
  document.querySelectorAll('.promo-filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.promo-filter-btn').forEach(function (b) {
        b.classList.remove('active');
        b.classList.remove('bg-stamp', 'text-white');
        b.classList.add('bg-white', 'border-line', 'text-slate-soft');
      });
      btn.classList.add('active');
      btn.classList.add('bg-stamp', 'text-white');
      btn.classList.remove('bg-white', 'border-line', 'text-slate-soft');

      var filter = btn.dataset.filter;
      document.querySelectorAll('.promo-card').forEach(function (card) {
        if (filter === 'all' || card.dataset.type === filter) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  /* ==================== Clear All Orders ==================== */

  window.clearAllOrders = async function () {
    if (!confirm('Yakin ingin menghapus SEMUA data pesanan? Tindakan ini tidak bisa dibatalkan.')) return;
    if (!confirm('Konfirmasi ulang: Hapus semua data pesanan ATK dan Cetak?')) return;
    try {
      var res = await apiPost({ type: 'clear-all-data', token: API_TOKEN });
      if (res.result === 'success') {
        showToast('✓ Semua data pesanan dihapus');
        await loadData();
      } else {
        showToast('⚠️ ' + (res.message || 'Gagal'));
      }
    } catch (err) {
      showToast('⚠️ Gagal');
    }
  };

  /* ==================== Init ==================== */

  loadData();
})();
