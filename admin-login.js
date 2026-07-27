// admin-login.js — Authentication logic for admin-login.html

(function () {
  'use strict';

  // ==================== REDIRECT IF ALREADY LOGGED IN ====================
  const existingToken = sessionStorage.getItem('yp_admin_token');
  if (existingToken) {
    try {
      const parsed = JSON.parse(existingToken);
      if (parsed.token && parsed.expiry && Date.now() < parsed.expiry) {
        window.location.replace('admin.html');
        return;
      }
      sessionStorage.removeItem('yp_admin_token');
    } catch (e) {
      sessionStorage.removeItem('yp_admin_token');
    }
  }

  // ==================== DOM REFERENCES ====================
  const formAdmin = document.getElementById('form-admin');
  const errorMsg = document.getElementById('errorMsg');
  const errorText = document.getElementById('errorText');
  const successMsg = document.getElementById('successMsg');
  const successText = document.getElementById('successText');
  const toastEl = document.getElementById('toast');

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

  // ==================== ADMIN LOGIN ====================
  formAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    const submitBtn = document.getElementById('admin-submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');

    if (!username || !password) {
      showError('Harap isi username dan password.');
      return;
    }

    submitBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Memproses...';

    try {
      const res = await sendLoginRequest({
        type: 'admin-login',
        username: username,
        password: password
      });

      if (res.result === 'success' && res.token) {
        const tokenData = {
          token: res.token,
          expiry: res.expiry || (Date.now() + 12 * 60 * 60 * 1000),
          role: 'admin',
          username: username
        };
        sessionStorage.setItem('yp_admin_token', JSON.stringify(tokenData));

        showSuccess('Login berhasil! Mengalihkan ke Dashboard...');
        showToast('✅ Login berhasil');

        setTimeout(() => {
          window.location.replace('admin.html');
        }, 800);
      } else {
        showError(res.message || 'Username atau password salah.');
        showToast('❌ Login gagal');
      }
    } catch (err) {
      console.error('Login error:', err);
      showError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      showToast('⚠️ Koneksi gagal');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Login Admin';
    }
  });

  // ==================== ENTER KEY SUPPORT ====================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !formAdmin.querySelector('button[type="submit"]').disabled) {
      formAdmin.requestSubmit();
    }
  });

})();
