/**
 * ariya.ex3 — Dynamic Interactions & Persistent Sync
 */

document.addEventListener('DOMContentLoaded', async () => {
  initCookieBanner();
  initHiddenAdminShortcuts();
  initRealtimeSyncListener();
  await syncDynamicContent();
  initGsapSubtleFade();
  initSmoothScroll();
});

/* ==========================================================================
   1. Realtime Cross-Tab Sync Listeners
   ========================================================================== */
function initRealtimeSyncListener() {
  // Listen for BroadcastChannel updates from Studio tab
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('ariya_sync_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DATA_UPDATED') {
          syncDynamicContent();
        }
      };
    } catch (e) {}
  }

  // Listen for storage events across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'ariya_last_sync' || e.key === 'ariya_site_config') {
      syncDynamicContent();
    }
  });

  // Re-sync whenever visitor returns to this tab
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncDynamicContent();
    }
  });

  window.addEventListener('focus', () => {
    syncDynamicContent();
  });
}

/* ==========================================================================
   2. Cookie Consent Banner (Using CookieManager)
   ========================================================================== */
function initCookieBanner() {
  const banner = document.getElementById('cookieBanner');
  const acceptBtn = document.getElementById('acceptCookieBtn');
  const dismissBtn = document.getElementById('dismissCookieBtn');

  if (!banner || !window.CookieManager) return;

  const consent = CookieManager.get('ariya_cookie_consent');
  if (!consent) {
    banner.style.display = 'block';
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      CookieManager.set('ariya_cookie_consent', 'accepted', 365);
      banner.style.display = 'none';
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      CookieManager.set('ariya_cookie_consent', 'dismissed', 30);
      banner.style.display = 'none';
    });
  }
}

/* ==========================================================================
   3. Secret Admin Panel Shortcuts (Ctrl+Shift+A & Triple-Click)
   ========================================================================== */
function initHiddenAdminShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      window.location.href = 'admin.html';
    }
  });

  const footerBrand = document.getElementById('footerBrandLogo');
  if (footerBrand) {
    let clickCount = 0;
    let clickTimer = null;

    footerBrand.addEventListener('click', () => {
      clickCount++;
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 800);
      } else if (clickCount === 3) {
        clearTimeout(clickTimer);
        clickCount = 0;
        window.location.href = 'admin.html';
      }
    });
  }
}

/* ==========================================================================
   4. Dynamic Content Sync (from AriyaDB & LocalStorage)
   ========================================================================== */
async function syncDynamicContent() {
  if (!window.AriyaDB) return;

  try {
    // 1. Sync Hero Video
    const heroPost = await AriyaDB.getHeroVideo();
    const heroVideo = document.getElementById('heroVideo');
    if (heroPost && heroVideo) {
      const heroUrl = AriyaDB.getMediaUrl(heroPost);
      if (heroUrl && !heroVideo.src.includes(heroUrl)) {
        heroVideo.src = heroUrl;
        heroVideo.load();
        heroVideo.play().catch(() => {});
      }
    }

    // 2. Sync Site Texts
    const savedConfig = JSON.parse(localStorage.getItem('ariya_site_config') || '{}');
    if (savedConfig.tagline) {
      const taglineEl = document.querySelector('.hero-tagline');
      if (taglineEl) taglineEl.textContent = savedConfig.tagline;
    }
    if (savedConfig.aboutLead) {
      const leadEl = document.querySelector('.lead-text');
      if (leadEl) leadEl.textContent = savedConfig.aboutLead;
    }
    if (savedConfig.manifestoQuote) {
      const quoteEl = document.querySelector('.clean-quote');
      if (quoteEl) quoteEl.textContent = `“${savedConfig.manifestoQuote}”`;
    }

    // 3. Sync Video Edits Archive
    const allPosts = await AriyaDB.getAllPosts();
    const videoPosts = allPosts.filter(p => p.type === 'video' && !p.isHero);

    // Custom uploads first (newest to oldest), followed by seed archive edits
    videoPosts.sort((a, b) => {
      const aIsCustom = a.id && a.id.startsWith('post-') && !a.id.match(/^post-0[1-6]$/);
      const bIsCustom = b.id && b.id.startsWith('post-') && !b.id.match(/^post-0[1-6]$/);
      if (aIsCustom && !bIsCustom) return -1;
      if (!aIsCustom && bIsCustom) return 1;
      if (aIsCustom && bIsCustom) return (b.createdAt || 0) - (a.createdAt || 0);
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    const grid = document.querySelector('.edits-grid');

    if (grid && videoPosts.length > 0) {
      grid.innerHTML = '';
      videoPosts.forEach((post, idx) => {
        const mediaUrl = AriyaDB.getMediaUrl(post);
        const card = document.createElement('div');
        card.className = 'edit-card';
        card.innerHTML = `
          <div class="edit-video-wrapper">
            <video src="${mediaUrl}" controls playsinline preload="metadata"></video>
          </div>
          <div class="edit-caption">${escapeHtml(post.title || `Edit 0${idx + 1}`)} ${post.category ? `&bull; ${escapeHtml(post.category)}` : ''}</div>
          ${post.caption ? `<p class="edit-subcaption" style="font-family: var(--font-serif); font-size: 1.05rem; color: var(--color-white-70); line-height: 1.4; margin-top: -0.3rem;">${escapeHtml(post.caption)}</p>` : ''}
        `;
        grid.appendChild(card);
      });
    }

    // 4. Sync Visual Dhamma Image Posts
    const imagePosts = allPosts.filter(p => p.type === 'image');
    imagePosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const gallerySection = document.getElementById('gallery');
    const galleryGrid = document.querySelector('.gallery-posts-grid');
    const navGallery = document.getElementById('navGalleryLink');

    if (gallerySection && galleryGrid) {
      if (imagePosts.length > 0) {
        gallerySection.style.display = 'block';
        if (navGallery) navGallery.style.display = 'inline-block';
        galleryGrid.innerHTML = '';
        imagePosts.forEach(post => {
          const mediaUrl = AriyaDB.getMediaUrl(post);
          const card = document.createElement('article');
          card.className = 'gallery-post-card';
          card.innerHTML = `
            <div class="gallery-image-wrapper">
              <img src="${mediaUrl}" alt="${escapeHtml(post.title)}" loading="lazy">
            </div>
            <h3 class="gallery-post-title">${escapeHtml(post.title)} ${post.category ? `&bull; ${escapeHtml(post.category)}` : ''}</h3>
            ${post.caption ? `<p class="gallery-post-desc">${escapeHtml(post.caption)}</p>` : ''}
          `;
          galleryGrid.appendChild(card);
        });
      } else {
        gallerySection.style.display = 'none';
        if (navGallery) navGallery.style.display = 'none';
      }
    }

  } catch (err) {
    console.warn('Dynamic sync fallback to static:', err);
  }
}

/* ==========================================================================
   5. Subtle GSAP & Smooth Scroll
   ========================================================================== */
function initGsapSubtleFade() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.hero-main-title', {
    y: 30,
    opacity: 0,
    duration: 1.2,
    ease: 'power2.out'
  });

  gsap.from('.hero-tagline', {
    y: 20,
    opacity: 0,
    duration: 1.2,
    delay: 0.2,
    ease: 'power2.out'
  });

  gsap.utils.toArray('.editorial-title').forEach((title) => {
    gsap.from(title, {
      y: 30,
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
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
