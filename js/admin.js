/**
 * ariya.ex3 — Studio Admin Logic
 * Instant native media upload, Blob persistence, cookie sessions, and live sync
 */

const ADMIN_PIN = 'ariya2026';
const AUTH_COOKIE = 'ariya_auth_session';

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabs();
  initPostModals();
  initSiteTextEditor();
  initExportBackup();
});

/* ==========================================================================
   1. Cookie-Based Authentication
   ========================================================================== */
function initAuth() {
  const loginGate = document.getElementById('loginGate');
  const adminDashboard = document.getElementById('adminDashboard');
  const loginForm = document.getElementById('loginForm');
  const passcodeInput = document.getElementById('passcodeInput');
  const rememberMeCheck = document.getElementById('rememberMeCheck');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  // Check existing session cookie
  const sessionToken = CookieManager.get(AUTH_COOKIE);
  if (sessionToken === 'authenticated') {
    unlockDashboard();
  }

  // Handle Login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = passcodeInput.value.trim();

    if (pin === ADMIN_PIN) {
      if (rememberMeCheck.checked) {
        CookieManager.set(AUTH_COOKIE, 'authenticated', 14); // 14 days
      } else {
        CookieManager.set(AUTH_COOKIE, 'authenticated', 1);
      }
      unlockDashboard();
    } else {
      loginError.style.display = 'block';
      passcodeInput.value = '';
      passcodeInput.focus();
    }
  });

  // Handle Logout
  logoutBtn.addEventListener('click', () => {
    CookieManager.delete(AUTH_COOKIE);
    adminDashboard.style.display = 'none';
    loginGate.style.display = 'flex';
    passcodeInput.value = '';
  });

  function unlockDashboard() {
    loginGate.style.display = 'none';
    adminDashboard.style.display = 'flex';
    loadDashboardPosts();
    renderCookieStatus();
  }
}

/* ==========================================================================
   2. Studio Navigation Tabs
   ========================================================================== */
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-content-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.getAttribute('data-tab'));
      if (targetPanel) targetPanel.classList.add('active');

      if (tab.getAttribute('data-tab') === 'tab-cookies') {
        renderCookieStatus();
      }
    });
  });
}

/* ==========================================================================
   3. Loading & Rendering Media Posts
   ========================================================================== */
async function loadDashboardPosts() {
  const posts = await AriyaDB.getAllPosts();
  renderVideos(posts.filter(p => p.type === 'video'));
  renderImages(posts.filter(p => p.type === 'image'));
}

function renderVideos(videos) {
  const grid = document.getElementById('videoCardsGrid');
  grid.innerHTML = '';

  if (videos.length === 0) {
    grid.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No videos uploaded yet. Tap Upload New Video.</p>';
    return;
  }

  videos.forEach(post => {
    const mediaUrl = AriyaDB.getMediaUrl(post);
    const card = document.createElement('article');
    card.className = 'studio-card';
    card.innerHTML = `
      <div class="studio-card-media">
        <video src="${mediaUrl}" controls playsinline preload="metadata"></video>
        ${post.isHero ? '<span class="hero-indicator-badge">&starf; Centerpiece Hero</span>' : ''}
      </div>
      <div class="studio-card-body">
        <span class="studio-card-tag">${post.category || 'Video'}</span>
        <h3 class="studio-card-title">${escapeHtml(post.title)}</h3>
        <p class="studio-card-desc">${escapeHtml(post.caption || '')}</p>
        <div class="studio-card-footer">
          <button class="btn-set-hero ${post.isHero ? 'active' : ''}" data-id="${post.id}">
            ${post.isHero ? 'Active Hero' : 'Set as Hero'}
          </button>
          <button class="btn-card-delete" data-id="${post.id}">Delete</button>
        </div>
      </div>
    `;

    // Set Hero Event
    card.querySelector('.btn-set-hero').addEventListener('click', async () => {
      await AriyaDB.setHeroVideo(post.id);
      loadDashboardPosts();
    });

    // Two-step inline delete (bulletproof, zero reliance on blocked window.confirm)
    const deleteBtn = card.querySelector('.btn-card-delete');
    let deleteTimer = null;

    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!deleteBtn.classList.contains('confirming')) {
        deleteBtn.classList.add('confirming');
        deleteBtn.textContent = 'Confirm Delete?';
        deleteBtn.style.background = '#e04747';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.borderColor = '#e04747';

        deleteTimer = setTimeout(() => {
          deleteBtn.classList.remove('confirming');
          deleteBtn.textContent = 'Delete';
          deleteBtn.style.background = '';
          deleteBtn.style.color = '';
          deleteBtn.style.borderColor = '';
        }, 4000);
      } else {
        clearTimeout(deleteTimer);
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;

        await AriyaDB.deletePost(post.id);

        card.style.transition = 'all 0.25s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.92)';
        setTimeout(() => {
          card.remove();
          loadDashboardPosts();
        }, 250);
      }
    });

    grid.appendChild(card);
  });
}

function renderImages(images) {
  const grid = document.getElementById('imageCardsGrid');
  grid.innerHTML = '';

  if (images.length === 0) {
    grid.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No image posts yet. Tap Upload New Image.</p>';
    return;
  }

  images.forEach(post => {
    const mediaUrl = AriyaDB.getMediaUrl(post);
    const card = document.createElement('article');
    card.className = 'studio-card';
    card.innerHTML = `
      <div class="studio-card-media">
        <img src="${mediaUrl}" alt="${escapeHtml(post.title)}" loading="lazy">
      </div>
      <div class="studio-card-body">
        <span class="studio-card-tag">${post.category || 'Artwork'}</span>
        <h3 class="studio-card-title">${escapeHtml(post.title)}</h3>
        <p class="studio-card-desc">${escapeHtml(post.caption || '')}</p>
        <div class="studio-card-footer">
          <button class="btn-card-delete" data-id="${post.id}">Delete</button>
        </div>
      </div>
    `;

    // Two-step inline delete
    const deleteBtn = card.querySelector('.btn-card-delete');
    let deleteTimer = null;

    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!deleteBtn.classList.contains('confirming')) {
        deleteBtn.classList.add('confirming');
        deleteBtn.textContent = 'Confirm Delete?';
        deleteBtn.style.background = '#e04747';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.borderColor = '#e04747';

        deleteTimer = setTimeout(() => {
          deleteBtn.classList.remove('confirming');
          deleteBtn.textContent = 'Delete';
          deleteBtn.style.background = '';
          deleteBtn.style.color = '';
          deleteBtn.style.borderColor = '';
        }, 4000);
      } else {
        clearTimeout(deleteTimer);
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;

        await AriyaDB.deletePost(post.id);

        card.style.transition = 'all 0.25s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.92)';
        setTimeout(() => {
          card.remove();
          loadDashboardPosts();
        }, 250);
      }
    });

    grid.appendChild(card);
  });
}

/* ==========================================================================
   4. Post Upload & Editor Modal (Instant Blob Handling)
   ========================================================================== */
let activeUploadedFile = null;

function initPostModals() {
  const modal = document.getElementById('postEditorModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const form = document.getElementById('postEditorForm');
  const mediaFileInput = document.getElementById('mediaFileInput');
  const mediaPreviewWrap = document.getElementById('mediaPreviewWrap');
  const dropzoneLabel = document.getElementById('dropzoneLabel');
  const postTypeField = document.getElementById('postTypeField');
  const modalFormTitle = document.getElementById('modalFormTitle');
  const savePostBtn = document.getElementById('savePostBtn');

  // Open buttons
  document.querySelectorAll('.open-create-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type') || 'video';
      postTypeField.value = type;
      modalFormTitle.textContent = type === 'video' ? 'Upload New Video' : 'Upload New Image Post';
      mediaFileInput.accept = type === 'video' ? 'video/mp4,video/*' : 'image/*';
      
      form.reset();
      activeUploadedFile = null;
      mediaPreviewWrap.style.display = 'none';
      mediaPreviewWrap.innerHTML = '';
      dropzoneLabel.textContent = `Tap to select or drop ${type}`;
      savePostBtn.textContent = 'Publish to Site';
      savePostBtn.disabled = false;
      modal.style.display = 'flex';
    });
  });

  // Close modal
  function hideModal() {
    modal.style.display = 'none';
  }
  closeModalBtn.addEventListener('click', hideModal);
  cancelModalBtn.addEventListener('click', hideModal);

  // Drag & Drop onto Dropzone
  const dropzone = document.getElementById('uploadDropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#fff';
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
      });
    });
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        processSelectedFile(e.dataTransfer.files[0]);
      }
    });
  }

  function processSelectedFile(file) {
    activeUploadedFile = file;
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4');
    dropzoneLabel.textContent = `Selected: ${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)`;

    const previewUrl = URL.createObjectURL(file);
    mediaPreviewWrap.style.display = 'block';
    if (isVideo) {
      mediaPreviewWrap.innerHTML = `<video src="${previewUrl}" controls autoplay muted playsinline style="max-height: 200px; width: 100%; border-radius: 6px;"></video>`;
    } else {
      mediaPreviewWrap.innerHTML = `<img src="${previewUrl}" style="max-height: 200px; width: 100%; object-fit: contain; border-radius: 6px;">`;
    }
  }

  // File Preview Handler
  mediaFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processSelectedFile(file);
  });

  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeUploadedFile) {
      alert('Please select an image or video file to upload.');
      return;
    }

    const title = document.getElementById('postTitleInput').value.trim();
    const category = document.getElementById('postCategoryInput').value;
    const caption = document.getElementById('postCaptionInput').value.trim();
    const type = postTypeField.value;

    savePostBtn.textContent = 'Publishing...';
    savePostBtn.disabled = true;

    try {
      // For images, generate permanent Base64 Data URL so it renders instantly everywhere
      let base64Src = '';
      if (type === 'image' && activeUploadedFile) {
        base64Src = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(activeUploadedFile);
        });
      }

      const newPost = {
        id: 'post-' + Date.now(),
        type: type,
        title: title,
        category: category,
        caption: caption,
        src: base64Src || '', // Permanent Base64 for images
        blob: activeUploadedFile, // Native Blob / File saved in IndexedDB
        isHero: false,
        createdAt: Date.now()
      };

      await AriyaDB.savePost(newPost);
      hideModal();
      await loadDashboardPosts();
      
      const targetUrl = type === 'image' ? 'posts.html' : 'index.html#edits';
      const proceed = confirm(`"${title}" published successfully!\n\nWould you like to open the Posts & Reflections page to view your publication live?`);
      if (proceed) {
        window.open(targetUrl, '_blank');
      }
    } catch (err) {
      alert('Error saving post: ' + err.message);
    } finally {
      savePostBtn.textContent = 'Publish to Site';
      savePostBtn.disabled = false;
    }
  });
}

/* ==========================================================================
   5. Site Editorial Text Management
   ========================================================================== */
function initSiteTextEditor() {
  const saveBtn = document.getElementById('saveSiteTextBtn');
  const taglineInput = document.getElementById('siteTaglineInput');
  const aboutLeadInput = document.getElementById('aboutLeadInput');
  const manifestoQuoteInput = document.getElementById('manifestoQuoteInput');

  // Load saved values
  const savedConfig = JSON.parse(localStorage.getItem('ariya_site_config') || '{}');
  if (savedConfig.tagline) taglineInput.value = savedConfig.tagline;
  if (savedConfig.aboutLead) aboutLeadInput.value = savedConfig.aboutLead;
  if (savedConfig.manifestoQuote) manifestoQuoteInput.value = savedConfig.manifestoQuote;

  saveBtn.addEventListener('click', () => {
    const config = {
      tagline: taglineInput.value.trim(),
      aboutLead: aboutLeadInput.value.trim(),
      manifestoQuote: manifestoQuoteInput.value.trim()
    };
    localStorage.setItem('ariya_site_config', JSON.stringify(config));
    AriyaDB.notifySync();
    alert('Site editorial text saved! Visible immediately on live site.');
  });
}

/* ==========================================================================
   6. Cookies & Backup Management
   ========================================================================== */
function renderCookieStatus() {
  const list = document.getElementById('activeCookiesList');
  if (!list) return;

  const rawCookies = document.cookie.split(';').filter(Boolean);
  list.innerHTML = '';

  if (rawCookies.length === 0) {
    list.innerHTML = '<span style="color: rgba(255,255,255,0.5);">No active cookies detected.</span>';
    return;
  }

  rawCookies.forEach(c => {
    const tag = document.createElement('span');
    tag.className = 'cookie-tag';
    tag.textContent = c.trim();
    list.appendChild(tag);
  });

  // Clear cache & reset seed button
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  clearCacheBtn.onclick = async () => {
    if (confirm('Reset media storage to default original seed?')) {
      const db = await AriyaDB.open();
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      tx.objectStore(STORE_MEDIA).clear();
      tx.oncomplete = async () => {
        await AriyaDB.seedDefaults();
        AriyaDB.notifySync();
        loadDashboardPosts();
        alert('Restored default clips successfully!');
      };
    }
  };
}

function initExportBackup() {
  const exportBtn = document.getElementById('exportBackupBtn');
  exportBtn.addEventListener('click', async () => {
    const posts = await AriyaDB.getAllPosts();
    const config = JSON.parse(localStorage.getItem('ariya_site_config') || '{}');
    const backupData = {
      exportedAt: new Date().toISOString(),
      siteConfig: config,
      posts: posts.map(p => ({
        id: p.id,
        type: p.type,
        title: p.title,
        category: p.category,
        caption: p.caption,
        src: typeof p.src === 'string' ? p.src : '',
        isHero: p.isHero,
        createdAt: p.createdAt
      }))
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ariya-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
