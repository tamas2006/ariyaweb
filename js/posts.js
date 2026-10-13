/**
 * ariya.ex3 — Blog & Posts Client Logic
 * Renders editorial posts, handles search, category filters, and full essay reader modal
 */

let allBlogPosts = [];
let activeCategory = 'ALL';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  initCookieBanner();
  initHiddenShortcuts();
  initSyncListeners();
  initReaderModal();
  initFilterControls();
  await loadAndRenderPosts();
});

/* ==========================================================================
   1. Data Fetch & Rendering Engine
   ========================================================================== */
async function loadAndRenderPosts() {
  if (!window.AriyaDB) return;

  try {
    allBlogPosts = await AriyaDB.getBlogPosts();
    renderFilteredPosts();
  } catch (err) {
    console.error('Error loading posts:', err);
  }
}

function renderFilteredPosts() {
  const featuredContainer = document.getElementById('featuredPostContainer');
  const gridContainer = document.getElementById('blogPostsGrid');
  const emptyState = document.getElementById('postsEmptyState');
  const countStats = document.getElementById('postsCountStats');

  if (!featuredContainer || !gridContainer) return;

  // Filter posts by category and search term
  let filtered = allBlogPosts.filter(post => {
    const matchCategory = activeCategory === 'ALL' || (post.category && post.category.toLowerCase() === activeCategory.toLowerCase());
    const query = searchQuery.toLowerCase().trim();
    const matchSearch = !query || 
      (post.title && post.title.toLowerCase().includes(query)) ||
      (post.caption && post.caption.toLowerCase().includes(query)) ||
      (post.category && post.category.toLowerCase().includes(query));
    return matchCategory && matchSearch;
  });

  // Update counter
  if (countStats) {
    countStats.textContent = `${filtered.length} ${filtered.length === 1 ? 'Reflection' : 'Reflections'}`;
  }

  // Handle empty state
  if (filtered.length === 0) {
    featuredContainer.innerHTML = '';
    gridContainer.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // If no search filter is applied and on 'ALL', feature the first (newest) post
  const hasFilter = searchQuery.length > 0 || activeCategory !== 'ALL';
  
  if (!hasFilter && filtered.length > 0) {
    const featured = filtered[0];
    const rest = filtered.slice(1);

    const featuredMedia = AriyaDB.getMediaUrl(featured);
    featuredContainer.innerHTML = `
      <article class="featured-blog-card" data-post-id="${featured.id}">
        <div class="featured-media-wrap">
          <img src="${featuredMedia}" alt="${escapeHtml(featured.title)}" loading="eager">
        </div>
        <div class="featured-content">
          <div class="featured-badge">
            <span>&starf; Featured Essay</span>
            &bull;
            <span class="post-category-tag">${escapeHtml(featured.category || 'Visual Dhamma')}</span>
          </div>
          <h2 class="featured-title">${escapeHtml(featured.title)}</h2>
          <p class="featured-excerpt">${escapeHtml(featured.caption || '')}</p>
          <button class="btn-read-essay" data-read-id="${featured.id}">Read Reflection &rarr;</button>
        </div>
      </article>
    `;

    // Render remaining cards
    renderCardsToGrid(gridContainer, rest);
  } else {
    featuredContainer.innerHTML = '';
    renderCardsToGrid(gridContainer, filtered);
  }

  // Attach click listeners to cards and buttons
  attachPostCardListeners();
}

function renderCardsToGrid(container, posts) {
  container.innerHTML = '';
  const isAdmin = window.CookieManager && CookieManager.get('ariya_auth_session') === 'authenticated';

  posts.forEach(post => {
    const mediaUrl = AriyaDB.getMediaUrl(post);
    const dateFormatted = post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Archive';

    const card = document.createElement('article');
    card.className = 'blog-post-card';
    card.setAttribute('data-post-id', post.id);
    card.innerHTML = `
      <div class="blog-card-media">
        <img src="${mediaUrl}" alt="${escapeHtml(post.title)}" loading="lazy">
      </div>
      <div class="blog-card-body">
        <div class="blog-card-meta">
          <span class="post-category-tag">${escapeHtml(post.category || 'Artwork')}</span>
          <span>${dateFormatted}</span>
        </div>
        <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
        <p class="blog-card-desc">${escapeHtml(post.caption || '')}</p>
        <div class="blog-card-footer">
          <span class="blog-card-link">Read Reflection &rarr;</span>
          ${isAdmin ? `<button class="admin-card-delete-post" data-delete-id="${post.id}" style="background: transparent; color: #e04747; border: 1px solid rgba(224,71,71,0.3); border-radius: 4px; padding: 3px 8px; font-size: 0.7rem; cursor: pointer;">Delete</button>` : ''}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function attachPostCardListeners() {
  // Post card opening
  document.querySelectorAll('[data-post-id], [data-read-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      // Don't open reader if clicking the delete button
      if (e.target.closest('[data-delete-id]')) return;
      const postId = el.getAttribute('data-post-id') || el.getAttribute('data-read-id');
      const post = allBlogPosts.find(p => p.id === postId);
      if (post) {
        openReaderModal(post);
      }
    });
  });

  // Inline delete from blog cards (host only)
  document.querySelectorAll('[data-delete-id]').forEach(delBtn => {
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = delBtn.getAttribute('data-delete-id');
      if (!delBtn.classList.contains('confirming')) {
        delBtn.classList.add('confirming');
        delBtn.textContent = 'Sure?';
        delBtn.style.background = '#e04747';
        delBtn.style.color = '#fff';
        setTimeout(() => {
          delBtn.classList.remove('confirming');
          delBtn.textContent = 'Delete';
          delBtn.style.background = '';
          delBtn.style.color = '#e04747';
        }, 3000);
      } else {
        delBtn.textContent = '...';
        await AriyaDB.deletePost(id);
        await loadAndRenderPosts();
      }
    });
  });
}

/* ==========================================================================
   2. Filter & Search Controls
   ========================================================================== */
function initFilterControls() {
  const pills = document.querySelectorAll('.filter-pill');
  const searchInput = document.getElementById('postsSearchInput');
  const resetBtn = document.getElementById('resetFilterBtn');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      renderFilteredPosts();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderFilteredPosts();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeCategory = 'ALL';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      pills.forEach(p => p.classList.remove('active'));
      const allPill = document.querySelector('.filter-pill[data-category="ALL"]');
      if (allPill) allPill.classList.add('active');
      renderFilteredPosts();
    });
  }
}

/* ==========================================================================
   3. Full Essay Reader Modal
   ========================================================================== */
function initReaderModal() {
  const modal = document.getElementById('postReaderModal');
  const closeBtn = document.getElementById('closeReaderBtn');

  if (!modal) return;

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display !== 'none') {
      closeModal();
    }
  });
}

function openReaderModal(post) {
  const modal = document.getElementById('postReaderModal');
  const image = document.getElementById('readerImage');
  const category = document.getElementById('readerCategory');
  const date = document.getElementById('readerDate');
  const title = document.getElementById('readerTitle');
  const bodyText = document.getElementById('readerBodyText');

  if (!modal) return;

  const mediaUrl = AriyaDB.getMediaUrl(post);
  image.src = mediaUrl;
  image.alt = post.title || 'Visual Dhamma';
  category.textContent = post.category || 'Visual Dhamma';
  date.textContent = post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Editorial Archive';
  title.textContent = post.title || 'Untitled Post';
  bodyText.textContent = post.caption || 'No reflection provided.';

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Admin delete button inside full reader
  const readerDeleteBtn = document.getElementById('readerDeleteBtn');
  const isAdmin = window.CookieManager && CookieManager.get('ariya_auth_session') === 'authenticated';

  if (readerDeleteBtn) {
    if (isAdmin) {
      readerDeleteBtn.style.display = 'inline-block';
      readerDeleteBtn.textContent = 'Delete Post';
      readerDeleteBtn.classList.remove('confirming');
      readerDeleteBtn.style.background = '';
      readerDeleteBtn.style.color = '';

      readerDeleteBtn.onclick = async () => {
        if (!readerDeleteBtn.classList.contains('confirming')) {
          readerDeleteBtn.classList.add('confirming');
          readerDeleteBtn.textContent = 'Confirm Delete?';
          readerDeleteBtn.style.background = '#e04747';
          readerDeleteBtn.style.color = '#fff';
          setTimeout(() => {
            readerDeleteBtn.classList.remove('confirming');
            readerDeleteBtn.textContent = 'Delete Post';
            readerDeleteBtn.style.background = '';
            readerDeleteBtn.style.color = '';
          }, 4000);
        } else {
          readerDeleteBtn.textContent = 'Deleting...';
          await AriyaDB.deletePost(post.id);
          modal.style.display = 'none';
          document.body.style.overflow = '';
          await loadAndRenderPosts();
        }
      };
    } else {
      readerDeleteBtn.style.display = 'none';
    }
  }
}

/* ==========================================================================
   4. Real-time Multi-Tab Sync
   ========================================================================== */
function initSyncListeners() {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('ariya_sync_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'DATA_UPDATED') {
          loadAndRenderPosts();
        }
      };
    } catch (e) {}
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'ariya_last_sync') {
      loadAndRenderPosts();
    }
  });

  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadAndRenderPosts();
    }
  });

  window.addEventListener('focus', () => {
    loadAndRenderPosts();
  });
}

/* ==========================================================================
   5. Cookie Banner & Secret Shortcuts
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

function initHiddenShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      window.location.href = 'admin.html';
    }
  });

  const footerBrand = document.getElementById('footerBrandLogo');
  if (footerBrand) {
    let clickCount = 0;
    let timer = null;
    footerBrand.addEventListener('click', () => {
      clickCount++;
      if (clickCount === 1) {
        timer = setTimeout(() => { clickCount = 0; }, 800);
      } else if (clickCount === 3) {
        clearTimeout(timer);
        clickCount = 0;
        window.location.href = 'admin.html';
      }
    });
  }
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
