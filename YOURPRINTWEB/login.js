// login.js — Authentication logic for login.html (Pelanggan only)

(function () {
  'use strict';

  // ==================== DOM REFERENCES ====================
  const formUser = document.getElementById('form-user');
  const errorMsg = document.getElementById('errorMsg');
  const errorText = document.getElementById('errorText');
  const successMsg = document.getElementById('successMsg');
  const successText = document.getElementById('successText');
  const toastEl = document.getElementById('toast');
  const userToggleBtn = document.getElementById('user-toggle-btn');
  const userToggleText = document.getElementById('user-toggle-text');
  const userNameGroup = document.getElementById('user-name-group');
  const userNameInput = document.getElementById('user-name');

  // ==================== TOAST ====================
  let toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  // ==================== MESSAGE HELPERS ====================
  function showError(msg) {
    errorText.textContent = msg;
    errorMsg.classList.add('show');
    successMsg.classList.remove('show');
  }

  function showSuccess(msg) {
    successText.textContent = msg;
    successMsg.classList.add('show');
    errorMsg.classList.remove('show');
  }

  function clearMessages() {
    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');
  }

  // ==================== TOGGLE PASSWORD VISIBILITY ====================
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');

      if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
      } else {
        input.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
      }
    });
  });

  // ==================== API REQUEST HELPER ====================
  async function sendLoginRequest(data) {
    if (!window.YOURPRINT_CONFIG || !window.YOURPRINT_CONFIG.GAS_URL) {
      throw new Error('GAS_URL tidak ditemukan di config.js');
    }
    const url = window.YOURPRINT_CONFIG.GAS_URL.trim();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  // ==================== TOGGLE LOGIN / REGISTER MODE ====================
  if (userToggleBtn) {
    userToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearMessages();
      
      const currentMode = formUser.getAttribute('data-mode');
      if (currentMode === 'login') {
        formUser.setAttribute('data-mode', 'register');
        userNameGroup.style.display = 'block';
        userNameInput.required = true;
        
        userToggleText.textContent = 'Sudah punya akun?';
        userToggleBtn.textContent = 'Masuk di sini';
        formUser.querySelector('.btn-text').textContent = 'Daftar Akun Baru';
      } else {
        formUser.setAttribute('data-mode', 'login');
        userNameGroup.style.display = 'none';
        userNameInput.required = false;
        
        userToggleText.textContent = 'Belum punya akun?';
        userToggleBtn.textContent = 'Daftar di sini';
        formUser.querySelector('.btn-text').textContent = 'Masuk';
      }
    });
  }

  // ==================== USER (PELANGGAN) LOGIN & REGISTER ====================
  formUser.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const mode = formUser.getAttribute('data-mode') || 'login';
    const name = userNameInput.value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const password = document.getElementById('user-password').value;
    const submitBtn = document.getElementById('user-submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');

    if (mode === 'register' && !name) {
      showError('Harap isi nama lengkap Anda.');
      return;
    }
    if (!phone || !password) {
      showError('Harap isi nomor WhatsApp dan password.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      showError('Nomor WhatsApp tidak valid. Pastikan formatnya benar.');
      return;
    }

    submitBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Memproses...';

    try {
      const actionType = mode === 'register' ? 'user-register' : 'user-login';
      const payload = {
        type: actionType,
        phone: phone,
        password: password
      };
      if (mode === 'register') payload.name = name;

      const res = await sendLoginRequest(payload);

      if (res.result === 'success' && res.token) {
        const userData = {
          token: res.token,
          expiry: res.expiry || (Date.now() + 7 * 24 * 60 * 60 * 1000),
          role: 'user',
          name: res.name || name,
          phone: res.phone || cleanPhone
        };
        localStorage.setItem('yp_user_info', JSON.stringify(userData));
        sessionStorage.removeItem('yp_user_info');

        showSuccess(mode === 'register' ? 'Pendaftaran berhasil! Mengalihkan...' : 'Selamat datang kembali! Mengalihkan...');
        showToast(mode === 'register' ? '✅ Akun berhasil dibuat' : '✅ Login berhasil');

        setTimeout(() => {
          window.location.replace('index.html');
        }, 800);
      } else {
        showError(res.message || 'Gagal memproses permintaan.');
        showToast('❌ ' + (mode === 'register' ? 'Gagal mendaftar' : 'Gagal login'));
      }
    } catch (err) {
      console.error('User Auth Error:', err);
      showError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      showToast('⚠️ Koneksi gagal');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = mode === 'register' ? 'Daftar Akun Baru' : 'Masuk';
    }
  });

  // ==================== ENTER KEY SUPPORT ====================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const submitBtn = formUser.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        formUser.requestSubmit();
      }
    }
  });

})();
