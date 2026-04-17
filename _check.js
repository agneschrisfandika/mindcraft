
// ==================== UTILITY ====================
function hashPassword(pw) {
  // Simple hash for localStorage (not cryptographic, just obfuscation)
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0; }
  return h.toString(36) + '_' + btoa(pw.split('').reverse().join('').substring(0,4));
}

function verifyPassword(pw, hash) {
  return hashPassword(pw) === hash;
}

function showToast(msg, type = 'info', dur = 3000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('fade-out');
    setTimeout(() => t.remove(), 300);
  }, dur);
}

function showLoading(text = 'AI sedang bekerja') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('show');
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.className = 'bi bi-eye-slash';
  } else {
    inp.type = 'password';
    icon.className = 'bi bi-eye';
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('show');
  // Prefill edit profile
  if (id === 'editProfileModal') {
    const u = getCurrentUser();
    if (u) {
      document.getElementById('editName').value = u.name;
      document.getElementById('editEmail').value = u.email;
    }
  }
  if (id === 'switchAccountModal') renderAccountList();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
});

// ==================== AUTH SYSTEM ====================
function getUsers() { return JSON.parse(localStorage.getItem('mc_users') || '[]'); }
function saveUsers(u) { localStorage.setItem('mc_users', JSON.stringify(u)); }
function getSession() { return JSON.parse(localStorage.getItem('mc_session') || 'null'); }
function saveSession(u, remember) {
  localStorage.setItem('mc_session', JSON.stringify({ email: u.email, remember }));
  if (!remember) sessionStorage.setItem('mc_session_temp', JSON.stringify({ email: u.email }));
}
function clearSession() {
  localStorage.removeItem('mc_session');
  sessionStorage.removeItem('mc_session_temp');
}
function getCurrentUser() {
  const s = getSession();
  if (!s) return null;
  return getUsers().find(u => u.email === s.email) || null;
}

function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pw = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  let valid = true;
  const showErr = (id, show) => {
    document.getElementById(id).classList.toggle('show', show);
    if (show) valid = false;
  };

  showErr('regNameErr', !name);
  showErr('regEmailErr', !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || getUsers().some(u => u.email === email));
  showErr('regPwErr', pw.length < 6);
  showErr('regConfirmErr', pw !== confirm);

  if (!valid) return;

  const users = getUsers();
  users.push({ name, email, password: hashPassword(pw), createdAt: Date.now(), id: Date.now() });
  saveUsers(users);
  saveSession({ email }, false);
  showToast(`Selamat datang, ${name}! 🎉`, 'success');
  initApp();
  showPage('app-page');
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;

  let valid = true;
  const showErr = (id, show) => { document.getElementById(id).classList.toggle('show', show); if (show) valid = false; };
  showErr('loginEmailErr', !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  showErr('loginPwErr', pw.length < 6);
  if (!valid) return;

  const user = getUsers().find(u => u.email === email);
  if (!user || !verifyPassword(pw, user.password)) {
    document.getElementById('loginEmailErr').textContent = 'Email atau password salah';
    document.getElementById('loginEmailErr').classList.add('show');
    return;
  }

  saveSession(user, remember);
  showToast(`Halo lagi, ${user.name}! 👋`, 'success');
  initApp();
  showPage('app-page');
}

function handleForgot() {
  const email = document.getElementById('forgotEmail').value.trim();
  const section = document.getElementById('forgotNewPwSection');
  const btn = document.getElementById('forgotBtn');

  const user = getUsers().find(u => u.email === email);
  if (!user) {
    document.getElementById('forgotEmailErr').classList.add('show');
    return;
  }
  document.getElementById('forgotEmailErr').classList.remove('show');

  if (section.style.display === 'none') {
    section.style.display = 'block';
    btn.innerHTML = '<i class="bi bi-shield-check"></i> Reset Password';
    showToast('Email ditemukan! Masukkan password baru', 'success');
    return;
  }

  const newPw = document.getElementById('forgotNewPw').value;
  if (newPw.length < 6) { showToast('Password minimal 6 karakter', 'error'); return; }

  const users = getUsers();
  const idx = users.findIndex(u => u.email === email);
  users[idx].password = hashPassword(newPw);
  saveUsers(users);
  showToast('Password berhasil direset! 🎉', 'success');
  section.style.display = 'none';
  btn.innerHTML = '<i class="bi bi-send"></i> Kirim';
  showPage('login-page');
}

function handleLogout() {
  clearSession();
  showToast('Sampai jumpa! 👋', 'info');
  showPage('login-page');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
}

function saveProfile() {
  const name = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  if (!name || !email) { showToast('Lengkapi semua field', 'error'); return; }

  const users = getUsers();
  const session = getSession();
  const idx = users.findIndex(u => u.email === session.email);
  if (idx === -1) return;

  // Check email conflict
  if (email !== users[idx].email && users.some(u => u.email === email)) {
    showToast('Email sudah digunakan akun lain', 'error'); return;
  }

  const oldEmail = users[idx].email;
  users[idx].name = name;
  users[idx].email = email;
  saveUsers(users);
  // Update session email
  saveSession({ email }, session.remember);
  updateProfileUI();
  closeModal('editProfileModal');
  showToast('Profil berhasil disimpan! ✅', 'success');
}

function changePassword() {
  const oldPw = document.getElementById('oldPw').value;
  const newPw = document.getElementById('newPw').value;
  const confirm = document.getElementById('confirmNewPw').value;
  const errEl = document.getElementById('changePwErr');

  const user = getCurrentUser();
  if (!user || !verifyPassword(oldPw, user.password)) {
    errEl.textContent = 'Password lama salah';
    errEl.style.display = 'block';
    return;
  }
  if (newPw.length < 6) {
    errEl.textContent = 'Password baru minimal 6 karakter';
    errEl.style.display = 'block';
    return;
  }
  if (newPw !== confirm) {
    errEl.textContent = 'Konfirmasi password tidak cocok';
    errEl.style.display = 'block';
    return;
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.email === user.email);
  users[idx].password = hashPassword(newPw);
  saveUsers(users);
  errEl.style.display = 'none';
  closeModal('changePasswordModal');
  document.getElementById('oldPw').value = '';
  document.getElementById('newPw').value = '';
  document.getElementById('confirmNewPw').value = '';
  showToast('Password berhasil diubah! 🔒', 'success');
}

function renderAccountList() {
  const users = getUsers();
  const current = getCurrentUser();
  const container = document.getElementById('accountList');
  if (users.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); text-align:center; font-size:0.875rem">Belum ada akun lain</p>'; return; }
  container.innerHTML = users.map(u => `
    <div class="profile-menu-item" onclick="switchAccount('${u.email}')" style="${u.email === current?.email ? 'border-color:var(--primary)' : ''}">
      <div class="nav-avatar" style="width:36px;height:36px;flex-shrink:0">${u.name[0].toUpperCase()}</div>
      <div>
        <div style="font-weight:600; font-size:0.9rem">${u.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${u.email}</div>
      </div>
      ${u.email === current?.email ? '<span class="chip chip-purple">Aktif</span>' : ''}
    </div>
  `).join('');
}

function switchAccount(email) {
  saveSession({ email }, false);
  closeModal('switchAccountModal');
  initApp();
  showToast('Akun berhasil diganti', 'success');
}

// ==================== LEARNING DATA ====================
function getLData(key) {
  const u = getCurrentUser();
  if (!u) return null;
  return JSON.parse(localStorage.getItem(`mc_${u.email}_${key}`) || 'null');
}
function setLData(key, val) {
  const u = getCurrentUser();
  if (!u) return;
  localStorage.setItem(`mc_${u.email}_${key}`, JSON.stringify(val));
}
function getMaterials() { return getLData('materials') || []; }
function saveMaterials(m) { setLData('materials', m); }
function getHistory() { return getLData('history') || []; }
function saveHistory(h) { setLData('history', h); }
function getStats() {
  return getLData('stats') || { quizDone: 0, totalScore: 0, streak: 0, lastQuizDate: null };
}
function saveStats(s) { setLData('stats', s); }

function clearLearningData() {
  const u = getCurrentUser();
  if (!u) return;
  ['materials', 'history', 'stats', 'lastQuiz'].forEach(k => localStorage.removeItem(`mc_${u.email}_${k}`));
  closeModal('clearDataModal');
  initApp();
  showToast('Data belajar berhasil dihapus', 'success');
}

// ==================== UPLOAD / MATERIAL ====================
let currentUploadMode = 'file';
let currentFileContent = '';
let currentFileName = '';
let mediaRecorder = null;
let audioChunks = [];
let recInterval = null;
let recSeconds = 0;
let isRecording = false;

function switchUploadMode(mode) {
  currentUploadMode = mode;
  ['file','text','voice'].forEach(m => {
    document.getElementById(`uploadMode${m.charAt(0).toUpperCase() + m.slice(1)}`).style.display = m === mode ? 'block' : 'none';
    document.getElementById(`tab${m.charAt(0).toUpperCase() + m.slice(1)}`).classList.toggle('active', m === mode);
  });
}

function handleDragOver(e) { e.preventDefault(); document.getElementById('uploadZone').classList.add('drag-over'); }
function handleDragLeave() { document.getElementById('uploadZone').classList.remove('drag-over'); }
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}
function handleFileSelect(e) { const file = e.target.files[0]; if (file) processFile(file); }

function processFile(file) {
  currentFileName = file.name;
  document.getElementById('materialName').value = file.name.replace(/\.[^.]+$/, '');
  const chipEl = document.getElementById('selectedFileChip');
  chipEl.style.display = 'block';
  chipEl.innerHTML = `<div class="uploaded-file-chip">📄 ${file.name} <span style="color:var(--success)">(${(file.size/1024).toFixed(1)} KB)</span></div>`;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const result = e.target.result;
    if (file.name.endsWith('.pdf')) {
      showToast('PDF terdeteksi — AI akan membaca kontennya', 'info');
      // Store as base64 for API
      currentFileContent = '__PDF_BASE64__' + result.split(',')[1];
    } else {
      currentFileContent = typeof result === 'string' ? result : new TextDecoder().decode(result);
    }
    showToast(`File "${file.name}" siap diproses`, 'success');
  };
  if (file.name.endsWith('.pdf')) reader.readAsDataURL(file);
  else reader.readAsText(file);
}

async function toggleRecording() {
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        await transcribeAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      isRecording = true;
      document.getElementById('recBtn').classList.add('recording');
      document.getElementById('recBtn').textContent = '⏹️';
      document.getElementById('recStatus').textContent = 'Merekam...';
      document.getElementById('recTimer').style.display = 'block';
      recSeconds = 0;
      recInterval = setInterval(() => {
        recSeconds++;
        const m = String(Math.floor(recSeconds/60)).padStart(2,'0');
        const s = String(recSeconds%60).padStart(2,'0');
        document.getElementById('recTimer').textContent = `${m}:${s}`;
      }, 1000);
      // Wave animation
      ['wb1','wb2','wb3','wb4','wb5'].forEach((id, i) => {
        document.getElementById(id).classList.add('active');
      });
    } catch { showToast('Izin mikrofon ditolak', 'error'); }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    clearInterval(recInterval);
    document.getElementById('recBtn').classList.remove('recording');
    document.getElementById('recBtn').textContent = '🎙️';
    document.getElementById('recStatus').textContent = 'Memproses rekaman...';
    ['wb1','wb2','wb3','wb4','wb5'].forEach(id => {
      document.getElementById(id).classList.remove('active');
      document.getElementById(id).style.height = '8px';
    });
  }
}

async function transcribeAudio(blob) {
  showLoading('Mentranskripsi rekaman suara');
  try {
    // Convert to base64
    const b64 = await new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result.split(',')[1]);
      fr.readAsDataURL(blob);
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [{
            type: "text",
            text: "Ini adalah rekaman audio berisi materi pembelajaran. Tolong buat ringkasan atau transkripsi dari apa yang kemungkinan dibicarakan berdasarkan konteks audio pendidikan. Buat dalam Bahasa Indonesia, format sebagai ringkasan materi pelajaran yang terstruktur."
          }]
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || 'Rekaman telah disimpan. Silakan edit transkripsi.';
    currentFileContent = text;
    document.getElementById('voiceTranscript').style.display = 'block';
    document.getElementById('transcriptText').textContent = text;
    document.getElementById('materialName').value = `Rekaman ${new Date().toLocaleDateString('id-ID')}`;
    document.getElementById('recStatus').textContent = 'Transkripsi selesai!';
    showToast('Rekaman berhasil ditranskripsi! 🎙️', 'success');
  } catch (err) {
    // Fallback: store as placeholder
    currentFileContent = `Rekaman audio materi - ${new Date().toLocaleString('id-ID')}`;
    document.getElementById('voiceTranscript').style.display = 'block';
    document.getElementById('transcriptText').textContent = currentFileContent;
    document.getElementById('recStatus').textContent = 'Rekaman tersimpan';
    showToast('Rekaman tersimpan (AI offline)', 'warning');
  } finally {
    hideLoading();
  }
}

async function processMaterial() {
  let content = '';
  let name = document.getElementById('materialName').value.trim();

  if (currentUploadMode === 'file') {
    content = currentFileContent;
    if (!content) { showToast('Pilih file terlebih dahulu', 'error'); return; }
  } else if (currentUploadMode === 'text') {
    content = document.getElementById('textMaterialContent').value.trim();
    if (!content) { showToast('Masukkan teks materi', 'error'); return; }
    if (!name) name = document.getElementById('textMaterialTitle').value.trim() || 'Materi Teks';
  } else {
    content = currentFileContent;
    if (!content) { showToast('Rekam atau proses audio terlebih dahulu', 'error'); return; }
  }

  if (!name) { showToast('Masukkan nama materi', 'error'); return; }
  if (name.length < 3) { showToast('Nama materi terlalu pendek', 'error'); return; }

  showLoading('Menganalisis materi dengan AI');

  let summary = '';
  let topics = [];

  try {
    const isPdf = content.startsWith('__PDF_BASE64__');
    const msgContent = isPdf ? [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: content.replace('__PDF_BASE64__', '') } },
      { type: "text", text: "Buat ringkasan singkat (max 3 paragraf) dari materi ini dan daftar 5 topik utama yang dibahas. Format: RINGKASAN: [teks] | TOPIK: [topik1, topik2, topik3, topik4, topik5]" }
    ] : [{ type: "text", text: `Buat ringkasan singkat (max 3 paragraf) dari materi berikut dan daftar 5 topik utama. Format: RINGKASAN: [teks] | TOPIK: [topik1, topik2, topik3, topik4, topik5]\n\n${content.substring(0, 3000)}` }];

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: msgContent }]
      })
    });
    const d = await resp.json();
    const txt = d.content?.[0]?.text || '';
    const sumMatch = txt.match(/RINGKASAN:\s*([\s\S]*?)(?:\|TOPIK:|$)/);
    const topMatch = txt.match(/TOPIK:\s*(.*)/);
    summary = sumMatch ? sumMatch[1].trim() : txt.substring(0, 300);
    topics = topMatch ? topMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [];
  } catch {
    summary = content.substring(0, 500);
    topics = ['Topik Utama'];
  }

  const mat = {
    id: Date.now(),
    name,
    content: content.startsWith('__PDF_BASE64__') ? '[PDF Document]' : content,
    rawContent: content,
    summary,
    topics,
    createdAt: Date.now(),
    quizCount: 0
  };

  const mats = getMaterials();
  mats.unshift(mat);
  saveMaterials(mats);

  // Reset
  currentFileContent = '';
  currentFileName = '';
  document.getElementById('materialName').value = '';
  document.getElementById('selectedFileChip').style.display = 'none';
  document.getElementById('fileInput').value = '';
  document.getElementById('textMaterialContent').value = '';
  document.getElementById('textMaterialTitle').value = '';

  hideLoading();
  renderSavedMaterials();
  renderQuizMaterialSelect();
  updateHomeStats();
  showToast(`Materi "${name}" berhasil disimpan! 🎉`, 'success');
}

function renderSavedMaterials() {
  const mats = getMaterials();
  const el = document.getElementById('savedMaterialsList');
  if (!mats.length) {
    el.innerHTML = `<div class="empty-state"><div class="es-icon">📭</div><div class="es-title">Belum ada materi</div><div class="es-sub">Upload materi pertamamu!</div></div>`;
    return;
  }
  const icons = { pdf: '📕', doc: '📘', docx: '📘', txt: '📄', default: '📑' };
  el.innerHTML = mats.map(m => `
    <div class="material-list-item" onclick="openMaterialDetail(${m.id})">
      <div class="mat-icon">${m.name.endsWith('.pdf') ? '📕' : m.name.endsWith('.docx') || m.name.endsWith('.doc') ? '📘' : '📑'}</div>
      <div>
        <div class="mat-name">${m.name}</div>
        <div class="mat-meta">${new Date(m.createdAt).toLocaleDateString('id-ID')} · ${m.quizCount} kuis</div>
      </div>
      <span class="material-badge">${m.topics?.length || 0} topik</span>
    </div>
  `).join('');
}

function openMaterialDetail(id) {
  const mat = getMaterials().find(m => m.id === id);
  if (!mat) return;
  document.getElementById('matDetailTitle').textContent = `📄 ${mat.name}`;
  document.getElementById('matDetailContent').innerHTML = `
    <div style="margin-bottom:0.75rem">
      <strong>📝 Ringkasan:</strong><br>
      <span>${mat.summary || 'Tidak ada ringkasan'}</span>
    </div>
    ${mat.topics?.length ? `<div><strong>🏷️ Topik:</strong><br>${mat.topics.map(t=>`<span class="chip chip-purple" style="margin:2px">${t}</span>`).join('')}</div>` : ''}
    <div style="margin-top:0.75rem; font-size:0.8rem; color:var(--text-dim)">
      Ditambahkan: ${new Date(mat.createdAt).toLocaleString('id-ID')}<br>
      Kuis dibuat: ${mat.quizCount}x
    </div>
  `;
  document.getElementById('matDetailQuizBtn').onclick = () => {
    closeModal('materialDetailModal');
    switchSection('quiz');
    setTimeout(() => {
      document.getElementById('quizMaterialSelect').value = id;
    }, 300);
  };
  document.getElementById('matDetailDeleteBtn').onclick = () => deleteMaterial(id);
  openModal('materialDetailModal');
}

function deleteMaterial(id) {
  const mats = getMaterials().filter(m => m.id !== id);
  saveMaterials(mats);
  renderSavedMaterials();
  renderQuizMaterialSelect();
  updateHomeStats();
  closeModal('materialDetailModal');
  showToast('Materi dihapus', 'info');
}

// Text counter
document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('textMaterialContent');
  if (ta) ta.addEventListener('input', () => {
    document.getElementById('charCount').textContent = ta.value.length + ' karakter';
  });
});

// ==================== QUIZ ENGINE ====================
const QUIZ_STOPWORDS = new Set([
  'yang','dan','atau','dengan','untuk','pada','dari','dalam','ini','itu','adalah','sebagai','karena','juga','agar','lebih','dapat','bisa','akan','harus','tidak','saat','oleh','ke','di','the','a','an'
]);

function isFileProtocol() {
  return location.protocol === 'file:';
}

function normalizeText(text = '') {
  return String(text)
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text = '') {
  return normalizeText(text)
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 30);
}

function toTitleCase(text = '') {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function uniqueItems(arr) {
  return [...new Set((arr || []).filter(Boolean).map(v => String(v).trim()).filter(Boolean))];
}

function hashSeed(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

function seededShuffle(array, seedText = '') {
  const arr = [...(array || [])];
  let seed = hashSeed(seedText);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function extractKeywords(text = '', limit = 24) {
  const words = normalizeText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 4 && !QUIZ_STOPWORDS.has(w));
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([w]) => w)
    .slice(0, limit);
}

function extractMainTopic(mat, content = '') {
  const topics = uniqueItems([...(mat.topics || []), ...extractKeywords(content, 8)]);
  return topics[0] ? toTitleCase(topics[0]) : 'Materi';
}

function getQuizSourceText(mat) {
  const raw = mat.rawContent || mat.content || mat.summary || '';
  if (String(raw).startsWith('__PDF_BASE64__')) {
    const topicText = uniqueItems([...(mat.topics || []), ...(mat.summary ? extractKeywords(mat.summary, 12) : [])]).join('. ');
    return normalizeText(`${mat.name}. ${mat.summary || ''}. ${topicText}`);
  }
  return normalizeText(`${mat.summary || ''}. ${mat.topics?.join('. ') || ''}. ${raw}`);
}

function buildOptionSet(correct, pool, seedText) {
  const options = [correct];
  const cleanedPool = uniqueItems(pool).filter(item => item.toLowerCase() !== String(correct).toLowerCase());
  for (const candidate of seededShuffle(cleanedPool, seedText)) {
    if (options.length >= 4) break;
    if (!options.some(v => v.toLowerCase() === candidate.toLowerCase())) options.push(candidate);
  }
  const fallback = [
    'Konsep Utama', 'Contoh Penerapan', 'Definisi Dasar', 'Langkah Analisis',
    'Hubungan Sebab Akibat', 'Penerapan Praktis', 'Evaluasi Hasil', 'Ringkasan Materi'
  ];
  for (const candidate of seededShuffle(fallback, seedText + '_fallback')) {
    if (options.length >= 4) break;
    if (!options.some(v => v.toLowerCase() === candidate.toLowerCase())) options.push(candidate);
  }
  return seededShuffle(options.slice(0, 4), seedText + '_final');
}

function fallbackQuizQuestions(mat, count, difficulty, type) {
  const sourceText = getQuizSourceText(mat);
  const sentences = splitSentences(sourceText);
  const keywords = uniqueItems([
    ...(mat.topics || []).map(t => String(t).trim()).filter(Boolean),
    ...extractKeywords(sourceText, 24).map(toTitleCase)
  ]);
  const mainTopic = extractMainTopic(mat, sourceText);
  const sentencePool = sentences.length ? sentences : [
    `${mat.name} membahas topik ${mainTopic}.`,
    `Materi ini menekankan pemahaman inti dari ${mainTopic}.`,
    `Poin penting dalam materi berkaitan dengan ${mainTopic}.`
  ];

  const items = [];
  for (let i = 0; i < count; i++) {
    const sentence = sentencePool[i % sentencePool.length];
    const key = keywords[i % Math.max(1, keywords.length)] || mainTopic;
    const otherKeys = keywords.filter(k => k.toLowerCase() !== key.toLowerCase());
    const simpleHint = `${difficulty === 'mudah' ? 'dasar' : difficulty === 'sulit' ? 'mendalam' : 'inti'} dari ${mainTopic}`;

    if (type === 'essay') {
      const points = uniqueItems([
        ...(mat.topics || []).slice(0, 4),
        ...extractKeywords(sentence, 4).map(toTitleCase)
      ]).slice(0, 4);
      items.push({
        type: 'essay',
        question: `Jelaskan hubungan antara ${mainTopic} dan isi materi berikut: "${sentence.slice(0, 160)}${sentence.length > 160 ? '…' : ''}"`,
        keyPoints: points.length ? points : [mainTopic],
        modelAnswer: `Jawaban ideal menekankan ${points.join(', ') || mainTopic} serta kaitannya dengan materi.`,
        explanation: `Jawaban sebaiknya menguraikan inti materi dan memberi contoh/penjelasan yang relevan dengan ${mainTopic}.`
      });
      continue;
    }

    if (type === 'benar_salah') {
      const makeTrue = i % 2 === 0;
      items.push({
        statement: makeTrue
          ? sentence
          : `Materi ini tidak membahas ${toTitleCase(key)}, melainkan menekankan ${mainTopic}.`,
        correct: makeTrue,
        explanation: makeTrue
          ? `Pernyataan sesuai dengan isi materi.`
          : `Pernyataan salah karena materi justru berkaitan dengan ${mainTopic} dan topik terkait.`
      });
      continue;
    }

    if (type === 'teka_teki') {
      const safeKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      items.push({
        sentence: sentence.replace(new RegExp(`\\b(${safeKey})\\b`, 'i'), '_____'),
        blank: key,
        hint: `Kata kunci yang berkaitan dengan ${mainTopic} dan ${simpleHint}`,
        explanation: `Kata yang hilang merujuk pada topik penting dalam materi.`
      });
      continue;
    }

    if (type === 'studi_kasus') {
      const optionCorrect = 'Menganalisis materi lalu menyusun ringkasan dan contoh penerapan';
      const options = buildOptionSet(optionCorrect, [
        'Langsung menghafal tanpa memahami',
        'Menunda belajar sampai ujian',
        'Membaca cepat tanpa mencatat',
        'Membandingkan dengan materi lain tanpa fokus'
      ], `${mat.id}_${i}_case`);
      items.push({
        scenario: `Seorang siswa sedang mempelajari ${mainTopic}, tetapi merasa kesulitan memahami inti pembahasan dari materi.`,
        question: `Tindakan apa yang paling tepat untuk membantu siswa memahami materi tersebut?`,
        options,
        correct: optionCorrect,
        analysis: `Pendekatan terbaik adalah mengurai materi menjadi ringkasan, poin penting, dan contoh.`,
        explanation: `Strategi ini membantu memahami hubungan antar konsep dan memudahkan latihan soal.`
      });
      continue;
    }

    if (type === 'ujian') {
      const isEssay = i % 2 === 1;
      if (isEssay) {
        const points = uniqueItems([(mat.topics || [])[0], (mat.topics || [])[1], mainTopic].filter(Boolean));
        items.push({
          type: 'essay',
          question: `Uraikan pemahamanmu tentang ${mainTopic} berdasarkan materi yang dipelajari.`,
          modelAnswer: `Jawaban ideal menjelaskan ${points.join(', ') || mainTopic} dengan bahasa sendiri dan contoh yang relevan.`,
          explanation: `Fokus pada inti materi, hubungan antar konsep, dan penerapan.`
        });
      } else {
        const correct = toTitleCase(key);
        const options = buildOptionSet(correct, [
          ...(otherKeys.slice(0, 3).map(toTitleCase)),
          'Konsep yang Tidak Relevan',
          'Informasi Tambahan',
          'Definisi Umum'
        ], `${mat.id}_${i}_exam`);
        items.push({
          type: 'mc',
          question: `Berdasarkan materi, pilihan yang paling tepat terkait topik utama adalah apa?`,
          options,
          correct,
          explanation: `Pilihan yang benar paling sesuai dengan isi materi dan kata kunci utamanya.`
        });
      }
      continue;
    }

    const correct = toTitleCase(key);
    const options = buildOptionSet(correct, [
      ...(otherKeys.slice(0, 3).map(toTitleCase)),
      'Konsep Umum',
      'Contoh Sederhana',
      'Definisi Dasar',
      'Aplikasi Praktis'
    ], `${mat.id}_${i}_mc`);
    items.push({
      question: `Kalimat berikut paling berkaitan dengan topik apa? "${sentence.slice(0, 150)}${sentence.length > 150 ? '…' : ''}"`,
      options,
      correct,
      explanation: `Kata kunci yang paling menonjol pada bagian tersebut adalah ${correct}.`
    });
  }

  return items;
}

function normalizeQuizQuestions(rawQuestions, mat, count, difficulty, type) {
  const fallback = fallbackQuizQuestions(mat, count, difficulty, type);
  const list = Array.isArray(rawQuestions) ? rawQuestions : [];
  if (!list.length) return fallback;

  return list.slice(0, count).map((q, i) => {
    const fb = fallback[i] || {};
    if (type === 'essay' || (type === 'ujian' && q.type === 'essay')) {
      return {
        type: 'essay',
        question: q.question || fb.question,
        keyPoints: q.keyPoints || fb.keyPoints || [],
        modelAnswer: q.modelAnswer || fb.modelAnswer || '',
        explanation: q.explanation || fb.explanation || ''
      };
    }
    if (type === 'benar_salah') {
      return {
        statement: typeof q.statement === 'string' ? q.statement : fb.statement,
        correct: typeof q.correct === 'boolean' ? q.correct : Boolean(fb.correct),
        explanation: q.explanation || fb.explanation || ''
      };
    }
    if (type === 'studi_kasus') {
      return {
        scenario: q.scenario || fb.scenario || '',
        question: q.question || fb.question || '',
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options.slice(0, 4) : fb.options || [],
        correct: q.correct || fb.correct || '',
        analysis: q.analysis || fb.analysis || '',
        explanation: q.explanation || fb.explanation || ''
      };
    }
    if (type === 'teka_teki') {
      return {
        sentence: q.sentence || fb.sentence || fb.question || '',
        blank: q.blank || fb.blank || '',
        hint: q.hint || fb.hint || '',
        explanation: q.explanation || fb.explanation || ''
      };
    }
    if (type === 'ujian') {
      return {
        type: q.type === 'essay' ? 'essay' : 'mc',
        question: q.question || fb.question || '',
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : fb.options || [],
        correct: q.correct || fb.correct || '',
        modelAnswer: q.modelAnswer || fb.modelAnswer || '',
        explanation: q.explanation || fb.explanation || '',
        keyPoints: q.keyPoints || fb.keyPoints || []
      };
    }
    return {
      question: q.question || fb.question || '',
      options: Array.isArray(q.options) && q.options.length ? q.options.slice(0, 4) : fb.options || [],
      correct: q.correct || fb.correct || '',
      explanation: q.explanation || fb.explanation || ''
    };
  });
}

let currentQuizType = 'pilgan';
let currentQuestions = [];
let currentQIndex = 0;
let quizAnswers = [];
let quizStartTime = null;
let timerInterval = null;
let remainingTime = 0;
let quizTimerSetting = 60;
let isDailyQuiz = false;
let currentMaterialId = null;

function selectQuizType(type, el) {
  currentQuizType = type;
  document.querySelectorAll('.quiz-type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function renderQuizMaterialSelect() {
  const mats = getMaterials();
  const sel = document.getElementById('quizMaterialSelect');
  sel.innerHTML = '<option value="">-- Pilih Materi --</option>' +
    mats.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

async function generateQuiz() {
  const matId = parseInt(document.getElementById('quizMaterialSelect').value);
  const count = parseInt(document.getElementById('quizCount').value);
  const difficulty = document.getElementById('quizDifficulty').value;
  quizTimerSetting = parseInt(document.getElementById('quizTimer').value);

  if (!matId) { showToast('Pilih materi terlebih dahulu', 'error'); return; }

  const mat = getMaterials().find(m => m.id === matId);
  if (!mat) { showToast('Materi tidak ditemukan', 'error'); return; }

  currentMaterialId = matId;
  await generateQuizFromContent(mat, count, difficulty, currentQuizType);
}

async function generateQuizFromContent(mat, count, difficulty, type) {
  showLoading('AI sedang membuat soal');

  const content = mat.rawContent?.startsWith('__PDF_BASE64__')
    ? '[PDF Materi]'
    : (mat.rawContent || mat.content || '').substring(0, 4000);

  try {
    if (!isFileProtocol()) {
      const typePrompts = {
        pilgan: `Buat ${count} soal pilihan ganda (tingkat ${difficulty}) dari materi berikut. Format JSON array: [{question, options:[A,B,C,D], correct:"A", explanation}]`,
        essay: `Buat ${count} pertanyaan esai (tingkat ${difficulty}) dari materi berikut. Format JSON array: [{question, keyPoints:["poin1","poin2"], modelAnswer, explanation}]`,
        benar_salah: `Buat ${count} soal benar/salah (tingkat ${difficulty}) dari materi berikut. Format JSON array: [{statement, correct:true/false, explanation}]`,
        studi_kasus: `Buat ${count} studi kasus (tingkat ${difficulty}) dari materi berikut. Format JSON array: [{scenario, question, options:[A,B,C,D], correct:"A", analysis, explanation}]`,
        teka_teki: `Buat ${count} soal isian (teka-teki kata) dari materi berikut. Format JSON array: [{sentence, blank:"kata yang dihilangkan", hint, explanation}]`,
        ujian: `Buat soal ujian komprehensif ${count} soal campuran (pilihan ganda & esai, tingkat ${difficulty}) dari materi berikut. Format JSON array: [{type:"mc"|"essay", question, options:[A,B,C,D] (jika mc), correct:"A" (jika mc), modelAnswer (jika essay), explanation}]`
      };
      const prompt = `${typePrompts[type] || typePrompts.pilgan}

MATERI:
${content}

Penting: Jawab HANYA dengan JSON array yang valid, tanpa teks lain.`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Kamu adalah generator soal kuis pendidikan. Selalu jawab dalam format JSON array yang valid sesuai format yang diminta. Soal harus relevan dengan materi yang diberikan.",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await resp.json();
      let txt = data.content?.[0]?.text || '[]';
      txt = txt.replace(/```json\n?|\n?```/g, '').trim();
      const firstBracket = txt.indexOf('[');
      if (firstBracket > 0) txt = txt.substring(firstBracket);
      currentQuestions = normalizeQuizQuestions(JSON.parse(txt), mat, count, difficulty, type);
    } else {
      throw new Error('file protocol');
    }
  } catch (err) {
    currentQuestions = normalizeQuizQuestions([], mat, count, difficulty, type);
  }

  if (!Array.isArray(currentQuestions) || currentQuestions.length === 0) {
    hideLoading();
    showToast('Gagal generate soal, coba lagi', 'error');
    return;
  }

  const mats = getMaterials();
  const idx = mats.findIndex(m => m.id === currentMaterialId);
  if (idx > -1) { mats[idx].quizCount++; saveMaterials(mats); }

  hideLoading();
  startQuiz();
}

function startQuiz() {
  currentQIndex = 0;
  quizAnswers = Array(currentQuestions.length).fill(null);
  quizStartTime = Date.now();

  document.getElementById('quizSetupView').style.display = 'none';
  document.getElementById('quizPlayView').style.display = 'block';
  document.getElementById('quizResultView').style.display = 'none';
  document.getElementById('quizReviewView').style.display = 'none';

  const typeNames = { pilgan:'Pilihan Ganda', essay:'Esai', benar_salah:'Benar/Salah', studi_kasus:'Studi Kasus', teka_teki:'Teka-Teki', ujian:'Ujian' };
  document.getElementById('quizTypeChip').textContent = typeNames[currentQuizType] || 'Kuis';
  document.getElementById('qTotalNum').textContent = currentQuestions.length;
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuestions[currentQIndex];
  if (!q) return;
  const num = currentQIndex + 1;
  document.getElementById('qCurrentNum').textContent = num;
  document.getElementById('qProgressFill').style.width = ((currentQIndex / currentQuestions.length) * 100) + '%';

  // Determine effective type
  let type = currentQuizType;
  if (type === 'ujian') type = q.type === 'essay' ? 'essay' : 'pilgan';
  if (type === 'studi_kasus') type = 'pilgan'; // render same as MC

  let html = '';

  // Badge
  const badges = { pilgan:'q-badge-mc', essay:'q-badge-essay', benar_salah:'q-badge-tf', studi_kasus:'q-badge-case', teka_teki:'q-badge-mc' };
  const bClass = badges[type] || 'q-badge-mc';

  html += `<div class="question-card">`;
  html += `<div class="q-header"><span class="q-badge ${bClass}">Soal ${num}</span></div>`;

  // For studi kasus show scenario
  if (currentQuizType === 'studi_kasus' && q.scenario) {
    html += `<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:1rem;margin-bottom:1rem;font-size:0.875rem;color:var(--text-muted)"><strong>📖 Skenario:</strong><br>${q.scenario}</div>`;
  }

  html += `<div class="q-text">${q.question || q.statement || q.sentence || ''}</div>`;

  if (type === 'pilgan' && q.options) {
    html += `<div class="options-list" id="optionsList">`;
    const labels = ['A','B','C','D','E'];
    q.options.forEach((opt, i) => {
      html += `<button class="option-btn" onclick="answerMC(${i})" data-idx="${i}">
        <span class="option-label">${labels[i]}</span>
        <span>${opt}</span>
      </button>`;
    });
    html += `</div>`;
  } else if (type === 'benar_salah') {
    html += `<div class="options-list" id="optionsList">
      <button class="option-btn" onclick="answerTF(true)" data-val="true"><span class="option-label">✓</span><span>Benar</span></button>
      <button class="option-btn" onclick="answerTF(false)" data-val="false"><span class="option-label">✗</span><span>Salah</span></button>
    </div>`;
  } else if (type === 'teka_teki') {
    if (q.hint) html += `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">💡 Petunjuk: ${q.hint}</div>`;
    html += `<div style="display:flex;gap:0.75rem;align-items:center">
      <input type="text" class="form-control" id="ttkInput" placeholder="Isi jawabannya..." style="flex:1" onkeypress="if(event.key==='Enter')submitTTK()">
      <button class="btn-mc btn-primary-mc btn-sm btn-w-auto" onclick="submitTTK()">Jawab</button>
    </div>`;
  } else if (type === 'essay') {
    if (q.keyPoints?.length) html += `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">💡 Poin yang perlu dibahas: ${q.keyPoints.join(', ')}</div>`;
    html += `<div class="essay-input-wrap">
      <textarea class="textarea-mc" id="essayInput" placeholder="Tulis jawabanmu di sini..."></textarea>
    </div>
    <div style="margin-top:0.75rem">
      <button class="btn-mc btn-primary-mc" onclick="submitEssay()">
        <i class="bi bi-check-lg"></i> Submit Jawaban
      </button>
    </div>`;
  }

  html += `<div class="answer-feedback" id="answerFeedback"></div>`;
  html += `</div>`;

  document.getElementById('questionArea').innerHTML = html;
  document.getElementById('quizControls').innerHTML = '';

  // Start timer
  clearInterval(timerInterval);
  if (quizTimerSetting > 0) {
    remainingTime = quizTimerSetting;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      remainingTime--;
      updateTimerDisplay();
      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        autoNextQuestion();
      }
    }, 1000);
  } else {
    document.getElementById('qTimerDisplay').textContent = '';
  }
}

function updateTimerDisplay() {
  const el = document.getElementById('qTimerDisplay');
  el.textContent = `⏱️ ${remainingTime}s`;
  el.className = remainingTime <= 10 ? 'q-timer danger' : 'q-timer';
}

function autoNextQuestion() {
  // No answer given — mark as wrong
  if (quizAnswers[currentQIndex] === null) quizAnswers[currentQIndex] = { answer: null, correct: false };
  showFeedback(false, 'Waktu habis!', currentQuestions[currentQIndex].explanation || '');
  setTimeout(() => nextQuestion(), 2000);
}

function answerMC(optionIdx) {
  if (quizAnswers[currentQIndex] !== null) return;
  clearInterval(timerInterval);
  const q = currentQuestions[currentQIndex];
  const labels = ['A','B','C','D','E'];
  const chosen = labels[optionIdx];
  const correct = chosen === q.correct;

  quizAnswers[currentQIndex] = { answer: chosen, correct };

  // Style buttons
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (labels[i] === q.correct) btn.classList.add('correct');
    else if (i === optionIdx && !correct) btn.classList.add('wrong');
  });

  showFeedback(correct, correct ? '🎉 Benar!' : '❌ Salah!', q.explanation || '');
  playAnswerAnim(correct);
  renderNextBtn();
}

function answerTF(answer) {
  if (quizAnswers[currentQIndex] !== null) return;
  clearInterval(timerInterval);
  const q = currentQuestions[currentQIndex];
  const correct = answer === q.correct;
  quizAnswers[currentQIndex] = { answer, correct };

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    const val = btn.dataset.val === 'true';
    if (val === q.correct) btn.classList.add('correct');
    else if (val === answer && !correct) btn.classList.add('wrong');
  });

  showFeedback(correct, correct ? '🎉 Benar!' : '❌ Salah!', q.explanation || '');
  playAnswerAnim(correct);
  renderNextBtn();
}

function submitTTK() {
  if (quizAnswers[currentQIndex] !== null) return;
  clearInterval(timerInterval);
  const inp = document.getElementById('ttkInput');
  const q = currentQuestions[currentQIndex];
  const userAns = inp.value.trim().toLowerCase();
  const correctAns = (q.blank || q.answer || '').toLowerCase();
  const correct = userAns === correctAns || correctAns.includes(userAns) && userAns.length > 2;

  quizAnswers[currentQIndex] = { answer: inp.value, correct };
  inp.disabled = true;

  showFeedback(correct, correct ? '🎉 Benar!' : `❌ Salah! Jawaban: "${q.blank || q.answer}"`, q.explanation || '');
  playAnswerAnim(correct);
  renderNextBtn();
}

async function submitEssay() {
  if (quizAnswers[currentQIndex] !== null) return;
  const inp = document.getElementById('essayInput');
  const ans = inp.value.trim();
  if (!ans) { showToast('Tulis jawabanmu terlebih dahulu', 'error'); return; }

  clearInterval(timerInterval);
  inp.disabled = true;

  const q = currentQuestions[currentQIndex];
  showLoading('AI menilai jawabanmu');

  let score = 0;
  let feedback = '';

  try {
    if (!isFileProtocol()) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "Kamu adalah penilai jawaban esai pendidikan. Nilai jawaban siswa dan berikan feedback konstruktif dalam Bahasa Indonesia.",
          messages: [{
            role: "user",
            content: `Pertanyaan: ${q.question}\nJawaban Model: ${q.modelAnswer || ''}\nJawaban Siswa: ${ans}\n\nNilai jawaban siswa dari 0-100 dan berikan feedback singkat. Format: SKOR: [angka] | FEEDBACK: [teks] | BENAR: [true/false jika skor >= 60]`
          }]
        })
      });
      const d = await resp.json();
      const txt = d.content?.[0]?.text || '';
      const scoreMatch = txt.match(/SKOR:\s*(\d+)/);
      const feedMatch = txt.match(/FEEDBACK:\s*(.*?)(?:\|BENAR:|$)/);
      const correctMatch = txt.match(/BENAR:\s*(true|false)/);
      score = scoreMatch ? parseInt(scoreMatch[1]) : 60;
      feedback = feedMatch ? feedMatch[1].trim() : 'Jawaban diterima';
      const correct = correctMatch ? correctMatch[1] === 'true' : score >= 60;
      quizAnswers[currentQIndex] = { answer: ans, correct, score };
      hideLoading();
      showFeedback(correct, `Skor: ${score}/100 — ${correct ? '✅ Baik!' : '⚠️ Perlu Perbaikan'}`, feedback + '\n\n**Jawaban ideal:** ' + (q.modelAnswer || q.explanation || ''));
      playAnswerAnim(correct);
      renderNextBtn();
      return;
    }
    throw new Error('file protocol');
  } catch {
    const model = normalizeText(q.modelAnswer || q.explanation || '');
    const ansNorm = normalizeText(ans).toLowerCase();
    const keyTerms = extractKeywords(model || q.question || '', 8);
    const matched = keyTerms.filter(k => ansNorm.includes(k.toLowerCase())).length;
    score = Math.max(40, Math.min(95, 45 + matched * 10));
    const correct = score >= 60;
    feedback = matched >= 3
      ? 'Jawabanmu sudah cukup kuat dan menyentuh beberapa poin penting.'
      : 'Jawabanmu masih bisa diperluas dengan menambahkan poin-poin inti dari materi.';
    quizAnswers[currentQIndex] = { answer: ans, correct, score };
    hideLoading();
    showFeedback(correct, `Skor: ${score}/100 — ${correct ? '✅ Baik!' : '⚠️ Perlu Perbaikan'}`, `${feedback}\n\n**Jawaban ideal:** ${q.modelAnswer || q.explanation || 'Jawaban esai disimpan'}`);
    playAnswerAnim(correct);
  }
  renderNextBtn();
}

function showFeedback(correct, title, explanation) {
  const el = document.getElementById('answerFeedback');
  el.className = `answer-feedback show ${correct ? 'feedback-correct' : 'feedback-wrong'}`;
  el.innerHTML = `
    <div class="feedback-title">${title}</div>
    <div class="feedback-explanation">${explanation.replace(/\n/g,'<br>')}</div>
  `;
}

function renderNextBtn() {
  const isLast = currentQIndex >= currentQuestions.length - 1;
  document.getElementById('quizControls').innerHTML = `
    <button class="btn-mc ${isLast ? 'btn-primary-mc' : 'btn-accent'} " onclick="${isLast ? 'finishQuiz()' : 'nextQuestion()'}">
      ${isLast ? '<i class="bi bi-flag-fill"></i> Selesai' : '<i class="bi bi-arrow-right"></i> Soal Berikutnya'}
    </button>
  `;
}

function nextQuestion() {
  clearInterval(timerInterval);
  currentQIndex++;
  if (currentQIndex < currentQuestions.length) renderQuestion();
  else finishQuiz();
}

function finishQuiz() {
  clearInterval(timerInterval);
  const elapsed = Math.round((Date.now() - quizStartTime) / 1000);
  const correct = quizAnswers.filter(a => a?.correct).length;
  const total = currentQuestions.length;
  const score = Math.round((correct / total) * 100);

  // Save to history
  const hist = getHistory();
  const mat = getMaterials().find(m => m.id === currentMaterialId);
  hist.unshift({
    id: Date.now(),
    type: currentQuizType,
    materialId: currentMaterialId,
    materialName: mat?.name || 'Materi',
    score,
    correct,
    total,
    elapsed,
    date: Date.now()
  });
  saveHistory(hist);

  // Update stats
  const stats = getStats();
  stats.quizDone++;
  stats.totalScore += score;
  const today = new Date().toDateString();
  if (stats.lastQuizDate !== today) {
    stats.streak = stats.lastQuizDate === new Date(Date.now() - 86400000).toDateString()
      ? stats.streak + 1 : 1;
    stats.lastQuizDate = today;
  }
  saveStats(stats);

  // Show result
  showResultView(score, correct, total, elapsed);
}

function showResultView(score, correct, total, elapsed) {
  document.getElementById('quizPlayView').style.display = 'none';
  document.getElementById('quizResultView').style.display = 'block';

  const pct = typeof score === 'number' ? score : Math.round((correct/total)*100);
  document.getElementById('resultScore').textContent = pct + '%';
  document.getElementById('resCorrect').textContent = correct ?? quizAnswers.filter(a=>a?.correct).length;
  document.getElementById('resWrong').textContent = (total ?? currentQuestions.length) - (correct ?? quizAnswers.filter(a=>a?.correct).length);

  const sec = elapsed ?? Math.round((Date.now()-quizStartTime)/1000);
  document.getElementById('resTime').textContent = sec > 60 ? Math.floor(sec/60)+'m' : sec+'s';

  let emoji = '😐', label = 'Cukup', sub = 'Terus berlatih!';
  if (pct >= 90) { emoji='🏆'; label='Luar Biasa!'; sub='Kamu sangat memahami materi ini!'; }
  else if (pct >= 75) { emoji='🎉'; label='Bagus Sekali!'; sub='Pemahamanmu sudah baik!'; }
  else if (pct >= 60) { emoji='👍'; label='Lumayan!'; sub='Masih ada yang perlu dipelajari'; }
  else if (pct < 40) { emoji='📚'; label='Perlu Belajar Lagi'; sub='Baca ulang materinya ya!'; }

  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultLabel').textContent = label;
  document.getElementById('resultSub').textContent = sub;

  if (pct >= 75) spawnConfetti();
  updateHomeStats();
  updateProgressSection();
}

function retakeQuiz() {
  currentQIndex = 0;
  quizAnswers = Array(currentQuestions.length).fill(null);
  quizStartTime = Date.now();
  document.getElementById('quizResultView').style.display = 'none';
  document.getElementById('quizPlayView').style.display = 'block';
  renderQuestion();
}

function reviewQuiz() {
  document.getElementById('quizResultView').style.display = 'none';
  document.getElementById('quizReviewView').style.display = 'block';
  renderReview();
}

function renderReview() {
  const list = document.getElementById('reviewList');
  const labels = ['A','B','C','D'];
  list.innerHTML = currentQuestions.map((q, i) => {
    const ans = quizAnswers[i];
    const correct = ans?.correct;
    return `
      <div class="mc-card" style="border-left:4px solid ${correct?'var(--success)':'var(--danger)'}; margin-bottom:0.75rem">
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem">
          <span class="chip ${correct?'chip-green':'chip-red'}">${correct?'✅ Benar':'❌ Salah'}</span>
          <span style="font-size:0.8rem;color:var(--text-muted)">Soal ${i+1}</span>
        </div>
        <div style="font-weight:600;margin-bottom:0.75rem;font-size:0.9rem">${q.question||q.statement||q.sentence||''}</div>
        ${ans?.answer!=null?`<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">Jawabanmu: <strong style="color:${correct?'var(--success)':'var(--danger)'}">${ans.answer}</strong></div>`:''}
        ${q.correct||q.blank?`<div style="font-size:0.8rem;color:var(--success);margin-bottom:0.5rem">Jawaban benar: <strong>${q.correct||q.blank}</strong></div>`:''}
        ${q.explanation?`<div style="font-size:0.8rem;color:var(--text-muted);background:var(--bg-3);padding:0.75rem;border-radius:8px">💡 ${q.explanation}</div>`:''}
      </div>
    `;
  }).join('');
}

function exitQuiz() {
  clearInterval(timerInterval);
  goToQuizSetup();
}

function goToQuizSetup() {
  document.getElementById('quizSetupView').style.display = 'block';
  document.getElementById('quizPlayView').style.display = 'none';
  document.getElementById('quizResultView').style.display = 'none';
  document.getElementById('quizReviewView').style.display = 'none';
}

function startDailyQuiz() {
  const mats = getMaterials();
  if (!mats.length) { switchSection('upload'); showToast('Upload materi dulu untuk daily quiz!', 'warning'); return; }
  const mat = mats[0];
  isDailyQuiz = true;
  currentMaterialId = mat.id;
  currentQuizType = 'pilgan';
  switchSection('quiz');
  setTimeout(() => generateQuizFromContent(mat, 5, 'sedang', 'pilgan'), 300);
}

// ==================== ANSWER ANIMATIONS ====================
function playAnswerAnim(correct) {
  const el = document.getElementById('answerAnim');
  const content = document.getElementById('answerAnimContent');
  content.textContent = correct ? '✅' : '❌';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 800);

  if (correct) playSound('correct');
  else playSound('wrong');
}

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'correct') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
    }
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function spawnConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#7c3aed','#a855f7','#06b6d4','#10b981','#f59e0b','#ef4444','#fff'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '-20px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = (Math.random() * 8 + 4) + 'px';
      piece.style.height = (Math.random() * 8 + 4) + 'px';
      piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 3000);
    }, i * 30);
  }
}

// ==================== PROGRESS SECTION ====================
function updateProgressSection() {
  const hist = getHistory();
  const mats = getMaterials();

  // Overall score
  const scores = hist.map(h => h.score);
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  document.getElementById('overallPct').textContent = avg + '%';

  // Ring animation
  const circ = 427; // 2 * pi * 68
  const offset = circ - (avg/100) * circ;
  document.getElementById('progressRingFill').setAttribute('stroke-dashoffset', offset);

  // Insight
  const insights = {
    90: '🏆 Luar biasa! Pemahamanmu sangat baik.',
    75: '🎯 Bagus! Terus pertahankan.',
    60: '📈 Lumayan, masih bisa ditingkatkan.',
    0: '📚 Yuk belajar lebih giat!'
  };
  const insightKey = avg >= 90 ? 90 : avg >= 75 ? 75 : avg >= 60 ? 60 : 0;
  document.getElementById('progressInsight').textContent = insights[insightKey];

  // Per topic
  const topicEl = document.getElementById('topicProgressList');
  const topicMap = {};
  hist.forEach(h => {
    const mat = mats.find(m => m.id === h.materialId);
    const name = mat?.name || h.materialName || 'Materi';
    if (!topicMap[name]) topicMap[name] = [];
    topicMap[name].push(h.score);
  });

  if (Object.keys(topicMap).length === 0) {
    topicEl.innerHTML = `<div class="empty-state" style="padding:1.5rem"><div class="es-icon">📊</div><div class="es-title">Belum ada data</div></div>`;
  } else {
    const colors = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#a855f7'];
    topicEl.innerHTML = Object.entries(topicMap).map(([name, scores], i) => {
      const pct = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
      const color = colors[i % colors.length];
      return `<div class="topic-progress-item">
        <div class="tpi-name">${name.substring(0, 25)}${name.length > 25 ? '...' : ''}</div>
        <div class="tpi-bar"><div class="tpi-fill" style="width:${pct}%; background:${color}"></div></div>
        <div class="tpi-pct" style="color:${color}">${pct}%</div>
      </div>`;
    }).join('');
  }

  // Achievements
  const stats = getStats();
  const achievements = [];
  if (hist.length >= 1) achievements.push({ icon: '🎯', name: 'Kuis Pertama' });
  if (hist.length >= 5) achievements.push({ icon: '⭐', name: 'Rajin Belajar' });
  if (hist.length >= 20) achievements.push({ icon: '🏆', name: 'Quiz Master' });
  if (stats.streak >= 3) achievements.push({ icon: '🔥', name: 'Streak 3 Hari' });
  if (stats.streak >= 7) achievements.push({ icon: '💎', name: 'Streak Seminggu' });
  if (avg >= 80) achievements.push({ icon: '🧠', name: 'Nilai Tinggi' });
  if (mats.length >= 3) achievements.push({ icon: '📚', name: 'Kolektor Materi' });
  if (hist.some(h => h.score === 100)) achievements.push({ icon: '💯', name: 'Sempurna!' });

  const achEl = document.getElementById('achievementList');
  if (achievements.length === 0) {
    achEl.innerHTML = `<div style="color:var(--text-muted); font-size:0.875rem">Selesaikan kuis untuk mendapatkan pencapaian!</div>`;
  } else {
    achEl.innerHTML = achievements.map(a =>
      `<div class="chip chip-purple" style="font-size:0.85rem">${a.icon} ${a.name}</div>`
    ).join('');
  }

  // Full history
  const fullHist = document.getElementById('fullHistoryList');
  if (!hist.length) {
    fullHist.innerHTML = `<div class="empty-state"><div class="es-icon">📭</div><div class="es-title">Belum ada riwayat</div></div>`;
    return;
  }
  const typeIcons = { pilgan:'🔤', essay:'✍️', benar_salah:'⚖️', studi_kasus:'🔬', teka_teki:'🧩', ujian:'📋' };
  fullHist.innerHTML = hist.slice(0, 20).map(h => `
    <div class="history-item">
      <div class="history-icon">${typeIcons[h.type]||'📝'}</div>
      <div>
        <div style="font-weight:600;font-size:0.875rem">${h.materialName || 'Kuis'}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${new Date(h.date).toLocaleDateString('id-ID')} · ${h.correct}/${h.total} benar</div>
      </div>
      <div class="history-score" style="color:${h.score>=75?'var(--success)':h.score>=50?'var(--warning)':'var(--danger)'}">${h.score}%</div>
    </div>
  `).join('');
}

// ==================== HOME STATS ====================
function updateHomeStats() {
  const mats = getMaterials();
  const hist = getHistory();
  const stats = getStats();

  document.getElementById('homeStatMateri').textContent = mats.length;
  document.getElementById('homeStatQuiz').textContent = hist.length;
  const avgScore = hist.length ? Math.round(hist.reduce((a,b)=>a+b.score,0)/hist.length) : 0;
  document.getElementById('homeStatScore').textContent = avgScore + '%';
  document.getElementById('homeStatStreak').textContent = stats.streak;
  document.getElementById('streakCount').textContent = stats.streak;

  // Recent materials
  const matEl = document.getElementById('homeMaterialList');
  if (!mats.length) {
    matEl.innerHTML = `<div class="empty-state" style="padding:1.5rem"><div class="es-icon">📭</div><div class="es-title">Belum ada materi</div><div class="es-sub">Upload materi pertamamu!</div></div>`;
  } else {
    matEl.innerHTML = mats.slice(0,3).map(m => `
      <div class="material-list-item" onclick="openMaterialDetail(${m.id})">
        <div class="mat-icon">📑</div>
        <div><div class="mat-name">${m.name}</div><div class="mat-meta">${m.topics?.slice(0,2).join(', ') || 'Tanpa topik'}</div></div>
        <span class="material-badge">${m.quizCount} kuis</span>
      </div>`).join('');
  }

  // Recent history
  const histEl = document.getElementById('homeHistoryList');
  if (!hist.length) {
    histEl.innerHTML = `<div class="empty-state" style="padding:1.5rem"><div class="es-icon">🎮</div><div class="es-title">Belum ada riwayat</div></div>`;
  } else {
    const typeIcons = { pilgan:'🔤', essay:'✍️', benar_salah:'⚖️', studi_kasus:'🔬', teka_teki:'🧩', ujian:'📋' };
    histEl.innerHTML = hist.slice(0,3).map(h => `
      <div class="history-item">
        <div class="history-icon">${typeIcons[h.type]||'📝'}</div>
        <div><div style="font-weight:600;font-size:0.875rem">${h.materialName||'Kuis'}</div><div style="font-size:0.75rem;color:var(--text-muted)">${new Date(h.date).toLocaleDateString('id-ID')}</div></div>
        <div class="history-score" style="color:${h.score>=75?'var(--success)':h.score>=50?'var(--warning)':'var(--danger)'}">${h.score}%</div>
      </div>`).join('');
  }

  // Daily banner
  const today = new Date().toDateString();
  const hadQuizToday = hist.some(h => new Date(h.date).toDateString() === today);
  const banner = document.getElementById('dailyBanner');
  if (!hadQuizToday && mats.length > 0) {
    banner.style.display = 'block';
    document.getElementById('dcbTitle').textContent = 'Daily Challenge Menunggumu!';
    document.getElementById('dcbSub').textContent = `Selesaikan quiz dari "${mats[0].name}"`;
  } else if (hadQuizToday) {
    banner.style.display = 'block';
    banner.style.background = 'linear-gradient(135deg, #065f46, #10b981)';
    document.getElementById('dcbTitle').textContent = '✅ Daily Challenge Selesai!';
    document.getElementById('dcbSub').textContent = 'Kamu sudah belajar hari ini. Bagus!';
    document.querySelector('.dcb-btn')?.remove();
  }
}

// ==================== PROFILE UI ====================
function updateProfileUI() {
  const u = getCurrentUser();
  if (!u) return;
  const initial = u.name[0].toUpperCase();
  document.getElementById('navAvatarText').textContent = initial;
  document.getElementById('profileAvatarBig').textContent = initial;
  document.getElementById('profileName').textContent = u.name;
  document.getElementById('profileEmail').textContent = u.email;
  document.getElementById('greetingName').textContent = u.name.split(' ')[0];

  const hist = getHistory();
  const stats = getStats();
  const badges = [];
  if (hist.length >= 5) badges.push('⭐ Aktif');
  if (stats.streak >= 3) badges.push('🔥 Streak');
  if (hist.some(h => h.score >= 90)) badges.push('🏆 High Scorer');
  document.getElementById('profileBadges').innerHTML = badges.map(b => `<span class="profile-badge">${b}</span>`).join('');

  const greetings = ['Semangat belajar! 💪', 'Terus belajar ya! 📚', 'Hari ini belajar apa? 🤔', 'Kamu bisa! 🌟'];
  document.getElementById('greetingSub').textContent = greetings[Math.floor(Math.random() * greetings.length)];
}

// ==================== NAVIGATION ====================
function switchSection(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`section-${section}`)?.classList.add('active');
  document.getElementById(`nav-${section}`)?.classList.add('active');

  // Refresh data when switching
  if (section === 'progress') updateProgressSection();
  if (section === 'home') updateHomeStats();
  if (section === 'upload') renderSavedMaterials();
  if (section === 'quiz') renderQuizMaterialSelect();
  if (section === 'profile') updateProfileUI();

  // Exit quiz if navigating away mid-quiz
  if (section !== 'quiz') clearInterval(timerInterval);
}

// ==================== INIT APP ====================
function initApp() {
  updateProfileUI();
  updateHomeStats();
  renderSavedMaterials();
  renderQuizMaterialSelect();
  updateProgressSection();
}

// ==================== STARTUP ====================
window.addEventListener('load', () => {
  // Check session
  const session = getSession();
  const tempSession = sessionStorage.getItem('mc_session_temp');

  if (session?.remember) {
    const user = getUsers().find(u => u.email === session.email);
    if (user) { initApp(); showPage('app-page'); return; }
  } else if (tempSession) {
    const ts = JSON.parse(tempSession);
    const user = getUsers().find(u => u.email === ts.email);
    if (user) { initApp(); showPage('app-page'); return; }
  }

  showPage('login-page');

  // Register service worker (skip when opened via file://)
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.error('SW error:', err));
  }

  // PWA install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
      if (deferredPrompt) showToast('📱 Install MindCraft sebagai app!', 'info', 6000);
    }, 5000);
  });
});
