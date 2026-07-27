// admin.js

// Parse token from sessionStorage
let token = '';
try {
  const tokenData = JSON.parse(sessionStorage.getItem('yp_admin_token') || '{}');
  token = tokenData.token || '';
} catch(e) {
  token = '';
}

// Toast Notification — dibuat segera karena diperlukan oleh semua fungsi
let toastEl = document.createElement('div');
toastEl.className = 'toast';
document.body.appendChild(toastEl);
let toastTimer;

function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// Fetch API Helper — didefinisikan sebelum semua fungsi lain
async function sendRequest(data) {
  if (!window.YOURPRINT_CONFIG || !window.YOURPRINT_CONFIG.GAS_URL) {
    throw new Error('GAS_URL missing in config');
  }
  const url = window.YOURPRINT_CONFIG.GAS_URL.trim();
  if (data) {
    const body = { ...data, token };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }
}

async function fetchGet(action) {
  if (!window.YOURPRINT_CONFIG || !window.YOURPRINT_CONFIG.GAS_URL) {
    console.error('YOURPRINT_CONFIG belum tersedia!');
    return [];
  }
  const url = `${window.YOURPRINT_CONFIG.GAS_URL.trim()}?action=${action}&t=${Date.now()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  } catch (err) {
    console.error('fetchGet error [' + action + ']:', err);
    return [];
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Status badge helper
const STATUSES = ['Menunggu', 'Dikonfirmasi', 'Diproses', 'Siap Diambil', 'Selesai', 'Dibatalkan'];
const STATUS_COLORS = {
  Menunggu: 'bg-yellow-100 text-yellow-700',
  Dikonfirmasi: 'bg-blue-100 text-blue-700',
  Diproses: 'bg-purple-100 text-purple-700',
  'Siap Diambil': 'bg-orange-100 text-orange-700',
  Selesai: 'bg-green-100 text-green-700',
  Dibatalkan: 'bg-red-100 text-red-700',
};
function statusBadge(status) {
  const s = status || 'Menunggu';
  const cls = STATUS_COLORS[s] || STATUS_COLORS.Menunggu;
  return `<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${cls}">${s}</span>`;
}

function renderDashboard(ordersATK, ordersCetak) {
  const allOrders = [
    ...(ordersATK || []).map(o => ({ ...o, _type: 'ATK', _revenue: Number(o.Subtotal) || 0 })),
    ...(ordersCetak || []).map(o => ({ ...o, _type: 'Cetak', _revenue: Number(o['Total Harga']) || Number(o['Estimasi Harga']) || 0 }))
  ];

  const today = new Date().toDateString();
  const todayOrders = allOrders.filter(o => new Date(o.Waktu).toDateString() === today);
  const totalRevenue = allOrders.reduce((sum, o) => sum + o._revenue, 0);
  const pendingOrders = allOrders.filter(o => o.Status !== 'Selesai' && o.Status !== 'Dibatalkan');

  const statTotal = document.getElementById('statTotal');
  const statToday = document.getElementById('statToday');
  const statRevenue = document.getElementById('statRevenue');
  const statPending = document.getElementById('statPending');
  const recentTbody = document.getElementById('dashboardRecentOrders');

  if (statTotal) statTotal.textContent = allOrders.length;
  if (statToday) statToday.textContent = todayOrders.length;
  if (statRevenue) statRevenue.textContent = 'Rp' + totalRevenue.toLocaleString('id-ID');
  if (statPending) statPending.textContent = pendingOrders.length;

  if (recentTbody) {
    const recent = allOrders.sort((a, b) => new Date(b.Waktu) - new Date(a.Waktu)).slice(0, 5);
    if (recent.length === 0) {
      recentTbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-soft">Belum ada pesanan</td></tr>';
    } else {
      recentTbody.innerHTML = recent.map(o => `
        <tr class="${o.Status === 'Selesai' ? 'bg-slate-50 opacity-60' : ''}">
          <td class="p-4 text-xs font-mono">${o['Order ID'] || '-'}</td>
          <td class="p-4 text-xs">${new Date(o.Waktu).toLocaleString('id-ID')}</td>
          <td class="p-4 text-sm font-medium">${o['Nama Pemesan'] || '-'}</td>
          <td class="p-4 text-xs"><span class="px-2 py-0.5 rounded-full text-xs font-semibold ${o._type === 'ATK' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">${o._type}</span></td>
          <td class="p-4 text-xs font-semibold">${statusBadge(o.Status)}</td>
        </tr>
      `).join('');
    }
  }
}

// Data loading
let _isLoading = false;
async function loadData(silent = false) {
  if (_isLoading) return; // Prevent concurrent fetches
  _isLoading = true;
  
  // Show loading indicator on active tab tables
  if (!silent) {
    document.querySelectorAll('tbody').forEach(tb => {
      if (tb.closest('.tab-content:not(.hidden)')) {
        const cols = tb.closest('table')?.querySelector('thead tr')?.children?.length || 4;
        tb.innerHTML = `<tr><td colspan="${cols}" class="p-8 text-center text-slate-soft">⏳ Memuat data...</td></tr>`;
      }
    });
  }

  try {
    const results = await Promise.allSettled([
      fetchGet('getProducts'),
      fetchGet('getGallery'),
      fetchGet('getServices'),
      fetchGet('getOrdersATK'),
      fetchGet('getOrdersCetak'),
      fetchGet('getTestimonialsAdmin'),
      fetchGet('getBannersAdmin')
    ]);
    const products = Array.isArray(results[0].value) ? results[0].value : [];
    const gallery = Array.isArray(results[1].value) ? results[1].value : [];
    const services = Array.isArray(results[2].value) ? results[2].value : [];
    const ordersATK = Array.isArray(results[3].value) ? results[3].value : [];
    const ordersCetak = Array.isArray(results[4].value) ? results[4].value : [];
    const testimonials = Array.isArray(results[5].value) ? results[5].value : [];
    const banners = Array.isArray(results[6].value) ? results[6].value : [];

    const renderers = [
      ['renderProducts',     () => renderProducts(products)],
      ['renderGallery',      () => renderGallery(gallery)],
      ['renderServices',     () => renderServices(services)],
      ['renderOrdersATK',    () => renderOrdersATK(ordersATK)],
      ['renderOrdersCetak',  () => renderOrdersCetak(ordersCetak)],
      ['renderTestimonials', () => renderTestimonialsAdmin(testimonials)],
      ['renderBanners',      () => renderBannersAdmin(banners)],
      ['renderDashboard',    () => renderDashboard(ordersATK, ordersCetak)],
      ['renderPromoHub',     () => renderPromoHub()]
    ];
    for (const [label, fn] of renderers) {
      try { fn(); } catch (e) { console.error(label + ' error:', e); }
    }

    if (!silent) showToast('✅ Data berhasil dimuat');
  } catch (err) {
    console.error('loadData error:', err);
    if (!silent) showToast('⚠️ Gagal memuat data, coba refresh halaman');
  } finally {
    _isLoading = false;
  }
}

function renderProducts(data) {
  window._currentProducts = Array.isArray(data) ? data : [];
  const tbody = document.querySelector('#table-products tbody');
  if (!window._currentProducts.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-soft">Tidak ada produk</td></tr>';
    return;
  }
  tbody.innerHTML = window._currentProducts.map(p => `
    <tr>
      <td class="p-4 text-2xl">${p.emoji || ''}</td>
      <td class="p-4 font-medium">${p.name}</td>
      <td class="p-4">Rp${Number(p.price).toLocaleString('id-ID')}</td>
      <td class="p-4 text-xs">${p.category || '-'}</td>
      <td class="p-4">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="w-12 h-12 rounded object-cover border border-line" onerror="this.style.display='none'">` : '<span class="text-slate-soft text-xs">-</span>'}
      </td>
      <td class="p-4 text-right">
        <button class="text-slate-soft hover:text-ink mr-2" onclick="editProduct('${p.id}')">Edit</button>
        <button class="text-stamp hover:text-stamp-dark" onclick="deleteItem('delete-product', '${p.id}')">Hapus</button>
      </td>
    </tr>
  `).join('');
}

function renderGallery(data) {
  data = Array.isArray(data) ? data : [];
  window._currentGallery = data;
  const tbody = document.querySelector('#table-gallery tbody');
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-soft">Tidak ada galeri</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(g => {
    const safeCode = String(g.code).replace(/'/g, "\\'");
    return `
    <tr>
      <td class="p-4 font-mono text-xs">${g.code}</td>
      <td class="p-4 font-medium">${g.title}</td>
      <td class="p-4">
        ${g.image ? `<img src="${g.image}" alt="${g.title}" class="w-12 h-12 rounded object-cover border border-line" onerror="this.style.display='none'">` : '<span class="text-slate-soft text-xs">-</span>'}
      </td>
      <td class="p-4 text-right">
        <button class="text-slate-soft hover:text-ink mr-2" onclick="editGallery('${safeCode}')">Edit</button>
        <button class="text-stamp hover:text-stamp-dark" onclick="deleteItem('delete-gallery', '${safeCode}')">Hapus</button>
      </td>
    </tr>
  `}).join('');
}

function renderServices(data) {
  data = Array.isArray(data) ? data : [];
  window._currentServices = data;
  const tbody = document.querySelector('#table-services tbody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-soft">Tidak ada layanan</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(s => `
    <tr>
      <td class="p-4 font-medium">${s.service}</td>
      <td class="p-4">Rp${s.priceBw} / Rp${s.priceColor}</td>
      <td class="p-4 text-xs">${s.description}</td>
      <td class="p-4 text-right">
        <button class="text-slate-soft hover:text-ink mr-2" onclick="editService('${s.id}')">Edit</button>
        <button class="text-stamp hover:text-stamp-dark" onclick="deleteItem('delete-service', '${s.id}')">Hapus</button>
      </td>
    </tr>
  `).join('');
}

function renderOrdersATK(data) {
  data = Array.isArray(data) ? data : [];
  window._currentOrdersATK = data;
  const tbody = document.querySelector('#table-orders-atk tbody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-soft">Belum ada pesanan</td></tr>';
    return;
  }
  const sorted = [...data].reverse();
  tbody.innerHTML = sorted.map(o => {
    const currentStatus = o.Status || 'Menunggu';
    const statusOptions = STATUSES.map(s =>
      `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`
    ).join('');
    return `
    <tr class="${currentStatus === 'Selesai' ? 'bg-slate-50 opacity-60' : ''} ${currentStatus === 'Dibatalkan' ? 'bg-red-50 opacity-60' : ''}">
      <td class="p-4 text-xs font-mono">${o['Order ID'] || '-'}</td>
      <td class="p-4 text-xs">${new Date(o.Waktu).toLocaleString('id-ID')}</td>
      <td class="p-4 text-sm font-medium">${o['Nama Pemesan']}<br><a href="https://wa.me/${o['No. WhatsApp']}" target="_blank" class="text-xs font-normal text-blue-600">${o['No. WhatsApp']}</a></td>
      <td class="p-4 text-xs whitespace-pre-wrap max-w-xs">${o['Detail Produk']}</td>
      <td class="p-4 text-sm font-bold text-stamp">Rp${Number(o.Subtotal).toLocaleString('id-ID')}</td>
      <td class="p-4">
        <select class="text-xs border border-line rounded px-2 py-1 bg-white font-semibold cursor-pointer" onchange="updateOrderStatus('atk', ${o._rowIndex}, this.value, this)">
          ${statusOptions}
        </select>
      </td>
      <td class="p-4 text-xs">${statusBadge(currentStatus)}</td>
    </tr>
  `}).join('');
}

function sendStatusWhatsApp(orderId, customerName, phone, status) {
  const cfg = window.YOURPRINT_CONFIG || {};
  const waNumber = cfg.WHATSAPP_NUMBER || '6285242410880';
  let message = '';
  
  if (status === 'Dikonfirmasi') {
    message = `Halo ${customerName}, pesanan Anda dengan Order ID *${orderId}* sudah kami konfirmasi dan akan segera diproses. Terima kasih!`;
  } else if (status === 'Diproses') {
    message = `Halo ${customerName}, pesanan *${orderId}* sedang dalam proses cetak. Mohon ditunggu.`;
  } else if (status === 'Siap Diambil') {
    message = `Halo ${customerName}, pesanan *${orderId}* sudah SIAP DIAMBIL! Silakan datang ke toko kami. Terima kasih! 🙏`;
  } else if (status === 'Selesai') {
    message = `Halo ${customerName}, pesanan *${orderId}* sudah selesai. Terima kasih atas kunjungan Anda! 🙏`;
  } else if (status === 'Dibatalkan') {
    message = `Halo ${customerName}, pesanan *${orderId}* dibatalkan. Hubungi kami jika ada pertanyaan.`;
  }
  
  if (message) {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
}

function renderOrdersCetak(data) {
  data = Array.isArray(data) ? data : [];
  window._currentOrdersCetak = data;
  const tbody = document.querySelector('#table-orders-cetak tbody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-soft">Belum ada pesanan</td></tr>';
    return;
  }
  const sorted = [...data].reverse();
  tbody.innerHTML = sorted.map(o => {
    const currentStatus = o.Status || 'Menunggu';
    const statusOptions = STATUSES.map(s =>
      `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`
    ).join('');
    const qty = o['Jumlah Salinan'] || '-';
    const lam = o.Laminasi || 'Tidak ada';
    const catatan = o.Catatan || '-';
    const totalHarga = o['Total Harga'] || o['Estimasi Harga'] || 0;
    const alamat = o.Alamat || '-';
    const metodeBayar = o['Metode Bayar'] || '-';
    const mapsLink = o['Link Maps'] || '';
    const waLink = o['No. WhatsApp'] ? `https://wa.me/${o['No. WhatsApp']}` : '#';
    
    const showConfirmBtn = currentStatus === 'Menunggu';
    const confirmBtn = showConfirmBtn
      ? `<button onclick="sendStatusWhatsApp('${o['Order ID']}', '${(o['Nama Pemesan'] || '').replace(/'/g, "\\'")}', '${o['No. WhatsApp']}', 'Dikonfirmasi')" 
           class="mt-2 text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 whitespace-nowrap">
           ✅ Konfirmasi WA
         </button>`
      : '';
    
    const showNotifyBtn = ['Dikonfirmasi', 'Diproses'].includes(currentStatus);
    const notifyLabel = currentStatus === 'Dikonfirmasi' ? '📦 Proses Cetak' : '✅ Siap Diambil';
    const notifyStatus = currentStatus === 'Dikonfirmasi' ? 'Siap Diambil' : 'Selesai';
    const notifyBtn = showNotifyBtn
      ? `<button onclick="sendStatusWhatsApp('${o['Order ID']}', '${(o['Nama Pemesan'] || '').replace(/'/g, "\\'")}', '${o['No. WhatsApp']}', '${notifyStatus}')" 
           class="mt-2 text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 whitespace-nowrap">
           ${notifyLabel}
         </button>`
      : '';
    
    return `
    <tr class="${currentStatus === 'Selesai' ? 'bg-slate-50 opacity-60' : ''} ${currentStatus === 'Dibatalkan' ? 'bg-red-50 opacity-60' : ''}">
      <td class="p-4 text-xs font-mono">${o['Order ID'] || '-'}</td>
      <td class="p-4 text-xs">${new Date(o.Waktu).toLocaleString('id-ID')}</td>
      <td class="p-4 text-sm font-medium">${o['Nama Pemesan']}<br><a href="${waLink}" target="_blank" class="text-xs font-normal text-blue-600">${o['No. WhatsApp']}</a></td>
      <td class="p-4 text-xs">
        <div class="max-w-[120px]">${alamat}</div>
        ${mapsLink && mapsLink !== '-' ? `<a href="${mapsLink}" target="_blank" class="text-blue-600 underline text-[10px]">📍 Lihat di Maps</a>` : ''}
        <div class="text-[10px] text-slate-soft mt-1">💳 ${metodeBayar}</div>
      </td>
      <td class="p-4 text-xs">
        <span class="font-semibold">${o.Layanan}</span><br>
        ${o['Link File'] !== '-' ? `<a href="${o['Link File']}" target="_blank" class="text-blue-600 underline">Download File</a>` : o['Nama File']}
      </td>
      <td class="p-4 text-xs text-slate-soft">
        Hal: ${o['Jumlah Halaman']} | ${o['Mode Warna']}<br>
        Salinan: ${qty} | Laminasi: ${lam}
      </td>
      <td class="p-4 text-xs max-w-[150px] truncate" title="${catatan}">${catatan}</td>
      <td class="p-4 text-xs font-semibold text-ink">Rp${Number(totalHarga).toLocaleString('id-ID')}</td>
      <td class="p-4">
        <select class="text-xs border border-line rounded px-2 py-1 bg-white font-semibold cursor-pointer" onchange="updateOrderStatus('cetak', ${o._rowIndex}, this.value, this)">
          ${statusOptions}
        </select>
        ${confirmBtn}
        ${notifyBtn}
      </td>
      <td class="p-4 text-xs">${statusBadge(currentStatus)}</td>
    </tr>
  `}).join('');
}

function renderTestimonialsAdmin(data) {
  data = Array.isArray(data) ? data : [];
  window._currentTestimonials = data;
  const tbody = document.querySelector('#table-testimonials tbody');
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-soft">Belum ada testimoni</td></tr>';
    return;
  }
  const sorted = [...data].reverse();
  tbody.innerHTML = sorted.map(t => {
    const approved = t.approved === true || t.approved === "TRUE" || t.approved === "true";
    const stars = '★'.repeat(Number(t.rating) || 5);
    return `
    <tr class="${!approved ? 'bg-yellow-50' : ''}">
      <td class="p-4 text-sm font-medium">${t.name}</td>
      <td class="p-4 text-xs text-yellow-500">${stars}</td>
      <td class="p-4 text-xs max-w-xs">${t.text}</td>
      <td class="p-4 text-xs">${t.date || '-'}</td>
      <td class="p-4 text-xs font-semibold">${approved ? '✅ Disetujui' : '⏳ Pending'}</td>
      <td class="p-4 text-right">
        ${!approved
          ? `<button class="text-green-600 hover:text-green-800 mr-2" onclick="toggleApproveTestimonial('${t.id}', ${t._rowIndex}, true)">Setujui</button>`
          : `<button class="text-yellow-600 hover:text-yellow-800 mr-2" onclick="toggleApproveTestimonial('${t.id}', ${t._rowIndex}, false)">Sembunyikan</button>`}
        <button class="text-stamp hover:text-stamp-dark" onclick="deleteItem('delete-testimonial', '${t.id}')">Hapus</button>
      </td>
    </tr>
  `}).join('');
}

async function toggleApproveTestimonial(id, rowIndex, approve) {
  try {
    const res = await sendRequest({ type: 'approve-testimonial', rowIndex, approve });
    if (res.result === 'success') {
      showToast(approve ? 'Testimoni disetujui' : 'Testimoni disembunyikan');
      await loadData(true);
    } else {
      showToast('Gagal update testimoni');
    }
  } catch (e) {
    showToast('Terjadi kesalahan');
  }
}

// Banners
function renderBannersAdmin(data) {
  window._currentBanners = data || [];
  const tbody = document.querySelector('#table-banners tbody');
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-soft">Tidak ada banner. Klik "+ Tambah" untuk menambah banner baru.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(b => {
    const active = b.active === true || b.active === "TRUE" || b.active === "true";
    const imgSrc = b.image || '';
    return `
    <tr>
      <td class="p-4">
        ${imgSrc ? `<img src="${imgSrc}" alt="Banner" class="w-24 h-10 rounded object-cover border border-line" onerror="this.style.display='none'">` : '<span class="text-slate-soft text-xs">Tidak ada gambar</span>'}
      </td>
      <td class="p-4 text-xs max-w-[200px] truncate">${b.link || '<span class="text-slate-soft">-</span>'}</td>
      <td class="p-4 text-xs font-semibold ${active ? 'text-green-600' : 'text-slate-soft'}">${active ? '✅ Aktif' : '⏸ Nonaktif'}</td>
      <td class="p-4 text-right">
        <button class="text-slate-soft hover:text-ink mr-2" onclick="editBanner('${b.id}')">Edit</button>
        <button class="text-stamp hover:text-stamp-dark" onclick="deleteItem('delete-banner', '${b.id}')">Hapus</button>
      </td>
    </tr>
  `; }).join('');
}

function editBanner(id) {
  const b = (window._currentBanners || []).find(x => x.id === id);
  if (!b) return;
  document.getElementById('modal-banner-title').textContent = 'Edit Banner';
  document.getElementById('b-id').value = b.id;
  document.getElementById('b-image').value = b.image || '';
  document.getElementById('b-image-url').value = '';
  document.getElementById('b-link').value = b.link || '';
  document.getElementById('b-active').value = (b.active === true || b.active === "TRUE" || b.active === "true") ? 'true' : 'false';
  openModal('modal-banner');
}

// Actions
async function updateOrderStatus(category, rowIndex, newStatus, selectEl) {
  if (selectEl) {
    selectEl.disabled = true;
  }
  try {
    const res = await sendRequest({ type: 'update-status', category, rowIndex, newStatus });
    if (res.result === 'success') {
      showToast('Status diperbarui: ' + newStatus);
      await loadData(true);
    } else {
      showToast('Gagal update status: ' + (res.message || ''));
      if (selectEl) selectEl.disabled = false;
    }
  } catch (e) {
    showToast('Terjadi kesalahan koneksi');
    if (selectEl) selectEl.disabled = false;
  }
}

async function deleteItem(type, id) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  try {
    const res = await sendRequest({ type, id });
    if (res.result === 'success') {
      showToast('Data dihapus');
      loadData();
    } else {
      showToast('Gagal hapus data');
    }
  } catch(e) {
    showToast('Terjadi kesalahan');
  }
}

async function clearAllOrders() {
  if (!confirm('YAKIN menghapus SEMUA riwayat pesanan?\n\nIni termasuk:\n• Semua Pesanan ATK\n• Semua Pesanan Cetak\n\nTindakan ini tidak bisa dibatalkan!')) return;
  if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA data?')) return;
  try {
    const res = await sendRequest({ type: 'clear-all-data' });
    if (res.result === 'success') {
      showToast('Semua data berhasil dihapus');
      loadData();
    } else {
      showToast('Gagal: ' + (res.message || ''));
    }
  } catch(e) {
    showToast('Terjadi kesalahan');
  }
}


// ============================================================
// INISIALISASI \u2014 Dijalankan SETELAH semua fungsi terdefinisi
// ============================================================
document.addEventListener('DOMContentLoaded', function() {

  // ---- Logout ----
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('yp_admin_token');
      window.location.replace('admin-login.html');
    });
  }

  // ---- Tabs ----
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(t => t.classList.add('hidden'));
      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.remove('hidden');
      if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebarNav');
        if (sidebar) sidebar.classList.add('hidden');
      }
    });
  });

  // ---- Mobile Menu ----
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebarNav');
      if (sidebar) sidebar.classList.toggle('hidden');
    });
  }

  // ---- Tutup sidebar saat klik di luar (mobile) ----
  document.addEventListener('click', (e) => {
    if (window.innerWidth >= 768) return;
    const sidebar = document.getElementById('sidebarNav');
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (sidebar && !sidebar.classList.contains('hidden')) {
      if (!sidebar.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
        sidebar.classList.add('hidden');
      }
    }
  });

  // ---- Promo filter buttons ----
  document.querySelectorAll('.promo-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.promo-filter-btn').forEach(b => {
        b.classList.remove('active', 'bg-stamp', 'text-white');
        b.classList.add('bg-white', 'text-slate-soft');
      });
      btn.classList.add('active', 'bg-stamp', 'text-white');
      btn.classList.remove('bg-white', 'text-slate-soft');
      currentPromoFilter = btn.dataset.filter;
      renderPromoHub();
    });
  });

  // ---- Modal close buttons ----
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // ---- Form submit handlers ----
  const formProduct = document.getElementById('form-product');
  if (formProduct) {
    formProduct.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('p-image-file');
      const urlInput = document.getElementById('p-image-url').value.trim();
      let finalImage = document.getElementById('p-image').value;
      let imageFile = null;

      if (fileInput.files.length > 0) {
        showToast('Memproses & mengompres gambar...');
        const result = await compressImage(fileInput.files[0]);
        if (result) {
          imageFile = { data: result.dataUrl.split(',')[1], mimeType: result.mimeType, name: fileInput.files[0].name };
          finalImage = '';
        }
      } else if (urlInput) {
        finalImage = urlInput;
      }

      const item = {
        id: document.getElementById('p-id').value,
        name: document.getElementById('p-name').value,
        price: parseInt(document.getElementById('p-price').value) || 0,
        emoji: document.getElementById('p-emoji').value,
        image: finalImage,
        category: document.getElementById('p-category').value,
        bg: document.getElementById('p-bg').value,
        description: document.getElementById('p-description').value,
        imageFile: imageFile
      };

      const submitBtn = formProduct.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';
      await sendUpsert('upsert-product', item);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan';
    });
  }

  const formGallery = document.getElementById('form-gallery');
  if (formGallery) {
    formGallery.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('g-image-file');
      const urlInput = document.getElementById('g-image-url').value.trim();
      let finalImage = document.getElementById('g-image').value;
      let imageFile = null;

      if (fileInput.files.length > 0) {
        showToast('Memproses & mengompres gambar...');
        const result = await compressImage(fileInput.files[0]);
        if (result) {
          imageFile = { data: result.dataUrl.split(',')[1], mimeType: result.mimeType, name: fileInput.files[0].name };
          finalImage = '';
        }
      } else if (urlInput) {
        finalImage = urlInput;
      }

      const item = {
        code: document.getElementById('g-code').value,
        title: document.getElementById('g-title').value,
        description: document.getElementById('g-description').value,
        priceA4: document.getElementById('g-priceA4').value || '',
        priceA5: document.getElementById('g-priceA5').value || '',
        priceB5: document.getElementById('g-priceB5').value || '',
        image: finalImage,
        imageFile: imageFile
      };

      const submitBtn = formGallery.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';
      await sendUpsert('upsert-gallery', item);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan';
      document.getElementById('g-code').readOnly = false;
    });
  }

  const formService = document.getElementById('form-service');
  if (formService) {
    formService.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('s-image-file');
      const urlInput = document.getElementById('s-image-url').value.trim();
      let finalImage = document.getElementById('s-image').value;
      let imageFile = null;

      if (fileInput.files.length > 0) {
        showToast('Memproses & mengompres gambar...');
        const result = await compressImage(fileInput.files[0]);
        if (result) {
          imageFile = { data: result.dataUrl.split(',')[1], mimeType: result.mimeType, name: fileInput.files[0].name };
          finalImage = '';
        }
      } else if (urlInput) {
        finalImage = urlInput;
      }

      const item = {
        id: document.getElementById('s-id').value,
        service: document.getElementById('s-name').value,
        priceBw: parseInt(document.getElementById('s-bw').value) || 0,
        priceColor: parseInt(document.getElementById('s-color').value) || 0,
        description: document.getElementById('s-desc').value,
        image: finalImage,
        fallbackGradient: document.getElementById('s-gradient').value,
        iconSvg: document.getElementById('s-svg').value,
        imageFile: imageFile
      };

      const submitBtn = formService.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';
      await sendUpsert('upsert-service', item);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan';
    });
  }

  const formBanner = document.getElementById('form-banner');
  if (formBanner) {
    formBanner.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('b-image-file');
      const urlInput = document.getElementById('b-image-url').value.trim();
      let finalImage = document.getElementById('b-image').value;
      let imageFile = null;

      if (fileInput.files.length > 0) {
        showToast('Memproses gambar...');
        const result = await compressBannerImage(fileInput.files[0]);
        if (result) {
          imageFile = { data: result.dataUrl.split(',')[1], mimeType: result.mimeType, name: fileInput.files[0].name };
          finalImage = '';
        }
      } else if (urlInput) {
        finalImage = urlInput;
      }

      const item = {
        id: document.getElementById('b-id').value,
        image: finalImage,
        link: document.getElementById('b-link').value,
        active: document.getElementById('b-active').value === 'true',
        imageFile: imageFile
      };

      const submitBtn = formBanner.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';
      await sendUpsert('upsert-banner', item);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan';
    });
  }

  // ---- Muat data pertama kali ----
  loadData();
});

// Promo Hub (Gudang Iklan)
let currentPromoFilter = 'all';
window._promoImageOverrides = {};

function getPromoImgSrc(item) {
  let rawImage = (item.image || '').trim();
  if (!rawImage) return '';
  if (rawImage.includes('drive.google.com') || rawImage.includes('googleusercontent.com')) {
    const matchD = rawImage.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const matchId = rawImage.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = matchD ? matchD[1] : (matchId ? matchId[1] : null);
    if (fileId) return 'https://lh3.googleusercontent.com/d/' + fileId;
  }
  return rawImage;
}

function getPromoEffectiveSrc(item, idx) {
  const override = window._promoImageOverrides[item._type + '-' + idx];
  if (override) return override;
  return getPromoImgSrc(item);
}

window.promoOverrideImage = function(idx, type) {
  const input = document.getElementById('promo-file-' + type + '-' + idx);
  if (input) input.click();
};

window.promoResetImage = function(idx, type, e) {
  e.stopPropagation();
  delete window._promoImageOverrides[type + '-' + idx];
  const wrap = document.getElementById('promo-img-' + type + '-' + idx);
  const resetBtn = document.getElementById('promo-reset-' + type + '-' + idx);
  if (wrap) {
    const img = wrap.querySelector('img');
    const item = window._currentPromoItems[idx];
    if (img && item) img.src = getPromoImgSrc(item);
  }
  if (resetBtn) resetBtn.classList.remove('show');
  showToast('🖼️ Gambar dikembalikan ke asli');
};

window.promoHandleFile = function(idx, type, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('❌ File harus berupa gambar');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    window._promoImageOverrides[type + '-' + idx] = dataUrl;
    const wrap = document.getElementById('promo-img-' + type + '-' + idx);
    const resetBtn = document.getElementById('promo-reset-' + type + '-' + idx);
    if (wrap) {
      let img = wrap.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        const placeholder = wrap.querySelector('span');
        if (placeholder) placeholder.style.display = 'none';
        wrap.style.cssText = 'position:relative;width:100%;height:8rem;border-radius:0.5rem;overflow:hidden;margin-bottom:0.75rem;background:#f1f5f9;';
        wrap.insertBefore(img, wrap.firstChild);
      }
      img.src = dataUrl;
      const overlay = wrap.querySelector('.promo-img-overlay');
      if (overlay && !overlay.getAttribute('onclick')) {
        overlay.setAttribute('onclick', 'promoOverrideImage(' + idx + ', \'' + type + '\')');
        overlay.querySelector('span').textContent = '📷 Ganti Gambar';
      }
    }
    if (resetBtn) resetBtn.classList.add('show');
    showToast('✅ Gambar iklan berhasil diganti');
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
};

document.querySelectorAll('.promo-filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.promo-filter-btn').forEach(b => {
      b.classList.remove('active', 'bg-stamp', 'text-white');
      b.classList.add('bg-white', 'text-slate-soft');
    });
    btn.classList.add('active', 'bg-stamp', 'text-white');
    btn.classList.remove('bg-white', 'text-slate-soft');
    currentPromoFilter = btn.dataset.filter;
    renderPromoHub();
  });
});

function generateCopywriting(item, type, style) {
  let title = item.name || item.title || item.service || '';
  let price = item.price || item.priceA5 || item.priceA4 || item.priceBw || 0;
  let priceStr = price > 0 ? 'Rp' + Number(price).toLocaleString('id-ID') : '';
  let desc = item.description || '';
  
  let link = 'https://' + window.location.host;
  if (type === 'gallery') link += '/buku-custom-detail.html?code=' + encodeURIComponent(item.code);
  else if (type === 'product') link += '/index.html#produk';
  else if (type === 'service') link += '/index.html#cetak';

  if (style === 'hard') {
    return `🔥 PROMO SPESIAL HARI INI 🔥\n\nCari ${title}? Pesan sekarang juga di YourPrint!\n${priceStr ? '💰 Harga mulai dari ' + priceStr + ' saja!\n' : ''}\nKualitas terjamin, proses cepat, dan harga bersahabat. Jangan sampai kehabisan, langsung order sekarang!\n\n👉 Klik link untuk pesan: ${link}\n\n#YourPrint #PercetakanOnline #${title.replace(/\\s+/g, '')} #PromoCetak`;
  } else if (style === 'story') {
    if (type === 'gallery') {
      return `Buku tulis anak sering tertukar di sekolah? 🥺\nAtau mau kasih kado spesial yang beda dari yang lain?\n\nKenalin nih, ${title}! Buku custom yang bisa dikasih nama, foto, atau tulisan bebas di covernya. Anak pasti seneng banget bawanya ke sekolah! 🥰\n\n${desc}\n${priceStr ? 'Harganya terjangkau banget, mulai dari ' + priceStr + ' aja.\n' : ''}\nYuk, buat buku custom anak sekarang!\n👉 Pesan di sini: ${link}\n\n#BukuCustom #HadiahAnak #BukuSekolah #YourPrint`;
    } else {
      return `Pernah ngerasa ribet harus antre lama di percetakan cuma buat cetak dokumen atau beli ATK? 😭\n\nSekarang nggak perlu lagi! Di YourPrint, kamu bisa pesan ${title} langsung dari HP kamu. ${desc ? '\\n' + desc + '\\n' : ''}\n${priceStr ? 'Hemat waktu, dan pastinya hemat di kantong (cuma ' + priceStr + ')!\n' : ''}\nCobain gampangnya cetak online tanpa antre.\n👉 Pesan sekarang: ${link}\n\n#PercetakanOnline #CetakTanpaAntre #YourPrint`;
    }
  } else {
    // casual
    return `Hai bestie! 👋 Ada yang baru nih dari YourPrint!\n\n✨ ${title} ✨\n${desc}\n\n${priceStr ? 'Harganya mumer banget, cuma ' + priceStr + ' lho! 💸\n' : ''}\nNggak usah mikir lama-lama, langsung aja checkout lewat website kita biar langsung diproses ya!\n\n👉 Cek di sini: ${link}\n\n#YourPrint #PercetakanMurah #Kekinian #CetakOnline`;
  }
}

function renderPromoHub() {
  const grid = document.getElementById('promoGrid');
  if (!grid) return;
  
  let items = [];
  if (currentPromoFilter === 'all' || currentPromoFilter === 'gallery') {
    (window._currentGallery || []).forEach(g => items.push({ ...g, _type: 'gallery' }));
  }
  if (currentPromoFilter === 'all' || currentPromoFilter === 'product') {
    (window._currentProducts || []).forEach(p => items.push({ ...p, _type: 'product' }));
  }
  if (currentPromoFilter === 'all' || currentPromoFilter === 'service') {
    (window._currentServices || []).forEach(s => items.push({ ...s, _type: 'service' }));
  }

  if (items.length === 0) {
    grid.innerHTML = '<div class="col-span-full p-8 text-center text-slate-soft bg-white rounded-xl border border-line">Tidak ada data untuk dipromosikan.</div>';
    return;
  }

  // Reverse so newest is first
  items.reverse();
  window._currentPromoItems = items;

  grid.innerHTML = items.map((item, idx) => {
    let title = item.name || item.title || item.service || '';
    let imgSrc = getPromoEffectiveSrc(item, idx);
    let typeKey = item._type + '-' + idx;
    
    let imgHtml = imgSrc
      ? `<div class="promo-img-wrap" id="promo-img-${typeKey}">
           <img src="${imgSrc}" onerror="this.style.display='none'">
           <div class="promo-img-overlay" onclick="promoOverrideImage(${idx}, '${item._type}')">
             <span>📷 Ganti Gambar</span>
           </div>
         </div>
         <button class="promo-img-reset ${window._promoImageOverrides[typeKey] ? 'show' : ''}" id="promo-reset-${typeKey}" onclick="promoResetImage(${idx}, '${item._type}', event)" title="Kembalikan gambar asli">✕</button>
         <input type="file" id="promo-file-${typeKey}" accept="image/*" class="hidden" onchange="promoHandleFile(${idx}, '${item._type}', this)">`
      : `<div class="promo-img-wrap" id="promo-img-${typeKey}" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;cursor:pointer;" onclick="promoOverrideImage(${idx}, '${item._type}')">
           <span class="text-slate-soft text-xs">📷 Tambah Gambar</span>
           <div class="promo-img-overlay">
             <span>📷 Upload Gambar</span>
           </div>
         </div>
         <button class="promo-img-reset" id="promo-reset-${typeKey}" style="display:none;" onclick="promoResetImage(${idx}, '${item._type}', event)" title="Kembalikan gambar asli">✕</button>
         <input type="file" id="promo-file-${typeKey}" accept="image/*" class="hidden" onchange="promoHandleFile(${idx}, '${item._type}', this)">`;
    
    let defaultText = generateCopywriting(item, item._type, 'casual');
    
    let typeLabel = item._type === 'gallery' ? 'Buku Custom' : item._type === 'product' ? 'Produk ATK' : 'Layanan Cetak';
    let typeColor = item._type === 'gallery' ? 'bg-purple-100 text-purple-700' : item._type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';

    return `
      <div class="bg-white rounded-xl border border-line p-5 shadow-sm flex flex-col">
        <div class="flex justify-between items-start mb-2">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeColor}">${typeLabel}</span>
          <select class="text-[10px] border border-line rounded px-1.5 py-1 outline-none font-medium" onchange="updatePromoText(${idx}, '${item._type}', this.value)">
            <option value="casual">Gaya: Santai</option>
            <option value="hard">Gaya: Promo</option>
            <option value="story">Gaya: Storytelling</option>
          </select>
        </div>
        <h3 class="font-display font-semibold text-sm mb-2 truncate" title="${title}">${title}</h3>
        ${imgHtml}
        <textarea id="promo-text-${idx}" class="w-full text-xs text-ink bg-white border border-line rounded p-2 flex-1 resize-y mb-3 focus:outline-stamp focus:ring-1 focus:ring-stamp" rows="6" placeholder="Ketik atau sesuaikan teks promosi di sini...">${defaultText}</textarea>
        <p class="text-[10px] text-slate-soft -mt-2 mb-2 italic">Teks bisa diedit manual sebelum di-share.</p>
        
        <div class="grid grid-cols-2 gap-2 mt-auto">
          <button onclick="copyPromoText(${idx})" class="w-full text-xs border border-line hover:border-stamp hover:text-stamp rounded py-1.5 flex items-center justify-center gap-1 font-medium transition-colors">
            📋 Copy Teks
          </button>
          <a href="${imgSrc || '#'}" ${imgSrc ? 'target="_blank" download' : 'onclick="return false"'} class="w-full text-xs border border-line hover:border-stamp hover:text-stamp rounded py-1.5 flex items-center justify-center gap-1 font-medium transition-colors ${!imgSrc ? 'opacity-50 cursor-not-allowed' : ''}">
            📥 Buka Gambar
          </a>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button onclick="sharePromoWA(${idx})" class="w-full text-[11px] bg-[#25D366] hover:bg-[#1DA851] text-white rounded py-1.5 flex items-center justify-center gap-1 font-medium transition-colors">
            💬 Share WA
          </button>
          <button onclick="sharePromoFB(${idx})" class="w-full text-[11px] bg-[#1877F2] hover:bg-[#155fc2] text-white rounded py-1.5 flex items-center justify-center gap-1 font-medium transition-colors">
            📘 Share FB
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.updatePromoText = function(idx, type, style) {
  const item = window._currentPromoItems[idx];
  const textarea = document.getElementById('promo-text-' + idx);
  if (!item || !textarea) return;
  
  // Check if user has manually edited the text
  const defaultText = generateCopywriting(item, type, 'casual');
  const currentText = textarea.value;
  // Only warn if user has meaningfully changed the text from any auto-generated version
  const isAutoGenerated = ['casual', 'hard', 'story'].some(s => 
    currentText.trim() === generateCopywriting(item, type, s).trim() ||
    currentText.trim() === generateCopywriting(item, item._type, s).trim()
  );
  if (!isAutoGenerated && currentText.trim().length > 10) {
    if (!confirm('Teks Anda akan diganti dengan template baru. Lanjutkan?')) {
      // Reset select to match current style
      return;
    }
  }
  textarea.value = generateCopywriting(item, type, style);
};

window.copyPromoText = function(idx) {
  const textarea = document.getElementById('promo-text-' + idx);
  if (!textarea) return;
  const text = textarea.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ Teks promosi disalin ke clipboard!');
    }).catch(() => {
      // Fallback
      textarea.select();
      document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
      showToast('✅ Teks promosi disalin!');
    });
  } else {
    textarea.select();
    document.execCommand('copy');
    window.getSelection()?.removeAllRanges();
    showToast('✅ Teks promosi disalin!');
  }
};

window.sharePromoWA = function(idx) {
  const text = document.getElementById('promo-text-' + idx).value;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
};

window.sharePromoFB = function(idx) {
  const item = window._currentPromoItems[idx];
  if (!item) return;
  let link = 'https://' + window.location.host;
  if (item._type === 'gallery') link += '/buku-custom-detail.html?code=' + encodeURIComponent(item.code);
  else if (item._type === 'product') link += '/index.html#produk';
  else if (item._type === 'service') link += '/index.html#cetak';
  // FB Share dialog URL
  window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link), '_blank', 'noopener');
};



// closeModal & openModal harus tetap sebagai fungsi biasa (dipanggil dari onclick HTML)
function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.add('hidden');
  document.querySelectorAll('.modal-box').forEach(m => m.classList.add('hidden'));
}

function openModal(id) {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('hidden');
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

// Edit functions — global agar bisa dipanggil dari onclick di HTML
function editProduct(id) {
  const p = (window._currentProducts || []).find(x => String(x.id) === String(id));
  if (!p) return;
  document.getElementById('modal-product-title').textContent = 'Edit Produk';
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-emoji').value = p.emoji || '';
  document.getElementById('p-image').value = p.image || '';
  document.getElementById('p-image-url').value = (p.image && !p.image.startsWith('data:')) ? p.image : '';
  document.getElementById('p-image-file').value = '';
  document.getElementById('p-category').value = p.category || 'Alat Tulis';
  document.getElementById('p-bg').value = p.bg || '';
  document.getElementById('p-description').value = p.description || '';
  openModal('modal-product');
}

function editGallery(code) {
  const g = (window._currentGallery || []).find(x => String(x.code) === String(code));
  if (!g) return;
  document.getElementById('modal-gallery-title').textContent = 'Edit Galeri';
  document.getElementById('g-code').value = g.code;
  document.getElementById('g-code').readOnly = true;
  document.getElementById('g-title').value = g.title;
  document.getElementById('g-description').value = g.description || '';
  document.getElementById('g-priceA4').value = g.priceA4 || '';
  document.getElementById('g-priceA5').value = g.priceA5 || '';
  document.getElementById('g-priceB5').value = g.priceB5 || '';
  document.getElementById('g-image').value = g.image || '';
  document.getElementById('g-image-url').value = (g.image && !g.image.startsWith('data:')) ? g.image : '';
  document.getElementById('g-image-file').value = '';
  openModal('modal-gallery');
}

function editService(id) {
  const s = (window._currentServices || []).find(x => String(x.id) === String(id));
  if (!s) return;
  document.getElementById('modal-service-title').textContent = 'Edit Layanan';
  document.getElementById('s-id').value = s.id;
  document.getElementById('s-name').value = s.service;
  document.getElementById('s-bw').value = s.priceBw;
  document.getElementById('s-color').value = s.priceColor;
  document.getElementById('s-desc').value = s.description;
  document.getElementById('s-image').value = s.image || '';
  document.getElementById('s-image-url').value = (s.image && !s.image.startsWith('data:')) ? s.image : '';
  document.getElementById('s-image-file').value = '';
  document.getElementById('s-gradient').value = s.fallbackGradient || '';
  document.getElementById('s-svg').value = s.iconSvg || '';
  openModal('modal-service');
}

function editBanner(id) {
  const b = (window._currentBanners || []).find(x => x.id === id);
  if (!b) return;
  document.getElementById('modal-banner-title').textContent = 'Edit Banner';
  document.getElementById('b-id').value = b.id;
  document.getElementById('b-image').value = b.image || '';
  document.getElementById('b-image-url').value = '';
  document.getElementById('b-image-file').value = '';
  document.getElementById('b-link').value = b.link || '';
  document.getElementById('b-active').value = (b.active === true || b.active === 'TRUE' || b.active === 'true') ? 'true' : 'false';
  openModal('modal-banner');
}

function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.90) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({ dataUrl, mimeType });
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function compressBannerImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxW = 1920;
        const maxH = 800;

        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        let quality = 0.92;
        const MAX_BYTES = 5 * 1024 * 1024;
        let result = canvas.toDataURL(mimeType, quality);

        while (result.length * 0.75 > MAX_BYTES && quality > 0.5) {
          quality -= 0.05;
          result = canvas.toDataURL(mimeType, quality);
        }

        resolve({ dataUrl: result, mimeType });
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// sendUpsert - fungsi helper untuk simpan data

async function sendUpsert(type, item) {
  try {
    const res = await sendRequest({ type, item });
    if (res.result === 'success') {
      showToast('✅ Data berhasil disimpan');
      closeModal();
      
      // Reset only the relevant form based on type
      if (type === 'upsert-product') {
        resetProductForm();
      } else if (type === 'upsert-gallery') {
        resetGalleryForm();
      } else if (type === 'upsert-service') {
        resetServiceForm();
      } else if (type === 'upsert-banner') {
        resetBannerForm();
      }
      
      loadData(true); // Silent reload to not flash toast
    } else {
      showToast('⚠️ Gagal menyimpan: ' + (res.message || 'Coba lagi'));
    }
  } catch(e) {
    console.error('sendUpsert error:', e);
    showToast('⚠️ Kesalahan koneksi, coba lagi');
  }
}

// Form Reset Functions
function resetProductForm() {
  document.getElementById('form-product').reset();
  document.getElementById('p-id').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-image-file').value = '';
  document.getElementById('p-image-url').value = '';
  document.getElementById('p-description').value = '';
  document.getElementById('modal-product-title').textContent = 'Tambah Produk';
}

function resetGalleryForm() {
  document.getElementById('form-gallery').reset();
  document.getElementById('g-code').readOnly = false;
  document.getElementById('g-description').value = '';
  document.getElementById('g-priceA4').value = '';
  document.getElementById('g-priceA5').value = '';
  document.getElementById('g-priceB5').value = '';
  document.getElementById('g-image').value = '';
  document.getElementById('g-image-file').value = '';
  document.getElementById('g-image-url').value = '';
  document.getElementById('modal-gallery-title').textContent = 'Tambah Galeri';
}

function resetServiceForm() {
  document.getElementById('form-service').reset();
  document.getElementById('s-id').value = '';
  document.getElementById('s-image').value = '';
  document.getElementById('s-image-file').value = '';
  document.getElementById('s-image-url').value = '';
  document.getElementById('modal-service-title').textContent = 'Tambah Layanan';
}

function resetBannerForm() {
  document.getElementById('form-banner').reset();
  document.getElementById('b-id').value = '';
  document.getElementById('b-image').value = '';
  document.getElementById('b-image-file').value = '';
  document.getElementById('b-image-url').value = '';
  document.getElementById('modal-banner-title').textContent = 'Tambah Banner';
}

