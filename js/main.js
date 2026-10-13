/**
 * ariya.ex3 — Dynamic Interactions & Persistent Sync
 */

document.addEventListener('DOMContentLoaded', async () => {
  initCookieBanner();
  initHiddenAdminShortcuts();
  await syncDynamicContent();
  initGsapSubtleFade();
  initSmoothScroll();
});

/* ==========================================================================
   1. Cookie Consent Banner (Using CookieManager)
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
   2. Secret Admin Panel Shortcuts (Ctrl+Shift+A & Triple-Click)
   ========================================================================== */
function initHiddenAdminShortcuts() {
  // Key combination: Ctrl + Shift + A
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      window.location.href = 'admin.html';
    }
  });

  // Triple-click on footer brand logo
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
   3. Dynamic Content Sync (from AriyaDB & LocalStorage)
   ========================================================================== */
async function syncDynamicContent() {
  if (!window.AriyaDB) return;

  try {
    // 1. Sync Hero Video
    const heroPost = await AriyaDB.getHeroVideo();
    const heroVideo = document.getElementById('heroVideo');
    if (heroPost && heroVideo && heroPost.src) {
      if (heroVideo.src !== heroPost.src && !heroVideo.src.endsWith(heroPost.src)) {
        heroVideo.src = heroPost.src;
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
    const grid = document.querySelector('.edits-grid');

    if (grid && videoPosts.length > 0) {
      grid.innerHTML = '';
      videoPosts.forEach((post, idx) => {
        const card = document.createElement('div');
        card.className = 'edit-card';
        card.innerHTML = `
          <div class="edit-video-wrapper">
            <video src="${post.src}" controls playsinline preload="metadata"></video>
          </div>
          <div class="edit-caption">${escapeHtml(post.title || `Edit 0${idx + 1}`)} ${post.category ? `&bull; ${escapeHtml(post.category)}` : ''}</div>
        `;
        grid.appendChild(card);
      });
    }

  } catch (err) {
    console.warn('Dynamic sync fallback to static:', err);
  }
}

/* ==========================================================================
   4. Subtle GSAP & Smooth Scroll
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
