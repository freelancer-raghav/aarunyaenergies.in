// ============================================================
//  Aarunya Energies — Blog JavaScript
//  Fetches posts from Google Apps Script → Google Sheets
// ============================================================

// ▶ Paste your Apps Script Web App URL here (same one used in script.js)
//   The URL is shared — blog data comes from the same deployment.
const BLOG_SHEET_URL = 'https://script.google.com/macros/s/AKfycbx-dNO0FkN69-e2pr8TdMPkjKiXww8PSTSG-3G7Kyl-I8SLdI-nFbpajgBGF1CI6BzM/exec';

// Category emoji map for image placeholders
const CAT_EMOJI = {
  'Industry News':  '📰',
  'Product Guide':  '📦',
  'Sustainability': '🌿',
  'Market Trends':  '📈',
  'Regulatory':     '⚖️',
  'default':        '🔥',
};

// ---- Detect which page we're on ----
const IS_POST_PAGE = document.getElementById('postArticle') !== null;


// ============================================================
//  SHARED: Navbar hamburger + back-to-top
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      const spans = hamburger.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity   = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      });
    });
  }

  // Back to top
  const btt = document.getElementById('backToTop');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
  }

  // Route to the correct page logic
  if (IS_POST_PAGE) {
    initPostPage();
  } else {
    initBlogListing();
  }
});


// ============================================================
//  BLOG LISTING PAGE
// ============================================================
let allPosts    = [];
let activeCategory = 'all';
let searchQuery = '';

async function initBlogListing() {
  try {
    allPosts = await fetchPosts();
    hideEl('loadingState');
    renderListing();
  } catch (err) {
    hideEl('loadingState');
    showEl('errorState');
    console.error('Blog fetch error:', err);
  }

  // Category filter buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      renderListing();
    });
  });

  // Search
  const searchInput = document.getElementById('blogSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.toLowerCase().trim();
      renderListing();
    });
  }
}

function renderListing() {
  let posts = allPosts;

  // Filter by category
  if (activeCategory !== 'all') {
    posts = posts.filter(p => p.category === activeCategory);
  }

  // Filter by search
  if (searchQuery) {
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(searchQuery) ||
      p.excerpt.toLowerCase().includes(searchQuery) ||
      (p.tags || '').toLowerCase().includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery)
    );
  }

  const grid     = document.getElementById('postsGrid');
  const featured = document.getElementById('featuredPost');

  if (posts.length === 0) {
    grid.innerHTML = '';
    featured.style.display = 'none';
    showEl('noResults');
    return;
  }

  hideEl('noResults');

  // First post → featured (only on "all" with no search)
  if (activeCategory === 'all' && !searchQuery && posts.length > 0) {
    renderFeatured(posts[0]);
    featured.style.display = '';
    renderGrid(posts.slice(1));
  } else {
    featured.style.display = 'none';
    renderGrid(posts);
  }
}

function renderFeatured(post) {
  const el    = document.getElementById('featuredPost');
  const emoji = CAT_EMOJI[post.category] || CAT_EMOJI['default'];
  const imgHTML = post.image_url
    ? `<img src="${escHtml(resolveImg(post.image_url))}" alt="${escHtml(post.title)}" loading="lazy" />`
    : `<div class="featured-img-placeholder">${emoji}</div>`;

  el.innerHTML = `
    <a href="blog-post.html?slug=${encodeURIComponent(post.slug)}" class="featured-img">${imgHTML}</a>
    <div class="featured-body">
      <span class="featured-label">${escHtml(post.category)}</span>
      <h2>${escHtml(post.title)}</h2>
      <p>${escHtml(post.excerpt)}</p>
      <div class="featured-meta">
        <span>&#128197; ${formatDate(post.date)}</span>
        <span>&#9997; ${escHtml(post.author)}</span>
        <span>&#128336; ${readTime(post.content || post.excerpt)} min read</span>
      </div>
      <a href="blog-post.html?slug=${encodeURIComponent(post.slug)}" class="featured-read-more">
        Read Article &#8594;
      </a>
    </div>
  `;
  // Make entire card clickable
  el.onclick = () => window.location.href = `blog-post.html?slug=${encodeURIComponent(post.slug)}`;
  el.style.cursor = 'pointer';
}

function renderGrid(posts) {
  const grid = document.getElementById('postsGrid');
  if (posts.length === 0) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = posts.map(post => postCardHTML(post)).join('');
}

function postCardHTML(post) {
  const emoji  = CAT_EMOJI[post.category] || CAT_EMOJI['default'];
  const imgHTML = post.image_url
    ? `<img src="${escHtml(resolveImg(post.image_url))}" alt="${escHtml(post.title)}" loading="lazy" />`
    : `<div class="post-card-img-placeholder">${emoji}</div>`;

  return `
    <a href="blog-post.html?slug=${encodeURIComponent(post.slug)}" class="post-card">
      <div class="post-card-img">
        ${imgHTML}
        <span class="post-card-cat">${escHtml(post.category)}</span>
      </div>
      <div class="post-card-body">
        <p class="post-card-date">${formatDate(post.date)}</p>
        <h3>${escHtml(post.title)}</h3>
        <p>${escHtml(post.excerpt)}</p>
        <div class="post-card-footer">
          <span>&#9997; ${escHtml(post.author)}</span>
          <span class="post-card-read">Read more &#8594;</span>
        </div>
      </div>
    </a>
  `;
}


// ============================================================
//  SINGLE POST PAGE
// ============================================================
async function initPostPage() {
  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    hideEl('postLoading');
    showEl('postError');
    return;
  }

  try {
    const post = await fetchPost(slug);

    if (!post || post.error) {
      hideEl('postLoading');
      showEl('postError');
      return;
    }

    // Update page meta
    document.title = `${post.title} | Aarunya Energies`;
    document.getElementById('metaDesc').setAttribute('content', post.meta_description || post.excerpt);

    // Breadcrumb
    document.getElementById('breadcrumbTitle').textContent = post.title;

    // Category, title, meta
    document.getElementById('postCategory').textContent = post.category;
    document.getElementById('postTitle').textContent    = post.title;
    document.getElementById('postDate').textContent     = formatDate(post.date);
    document.getElementById('postAuthor').textContent   = post.author;
    document.getElementById('postReadTime').innerHTML   =
      `<span class="meta-icon">&#128336;</span> ${readTime(post.content)} min read`;

    // Tags
    if (post.tags) {
      const tagsEl = document.getElementById('postTags');
      tagsEl.innerHTML = post.tags.split(',')
        .map(t => `<span class="post-tag">${escHtml(t.trim())}</span>`)
        .join('');
    }

    // Featured image
    if (post.image_url) {
      const imgWrap = document.getElementById('postImageWrap');
      document.getElementById('postImage').src = resolveImg(post.image_url);
      document.getElementById('postImage').alt = post.title;
      imgWrap.style.display = '';
    }

    // Content — convert plain text / \n-separated paragraphs to HTML
    document.getElementById('postContent').innerHTML = toHtml(post.content);

    // Show article
    hideEl('postLoading');
    showEl('postArticle');

    // Related posts (same category)
    loadRelated(post.slug, post.category);

  } catch (err) {
    hideEl('postLoading');
    showEl('postError');
    console.error('Post fetch error:', err);
  }
}

async function loadRelated(currentSlug, category) {
  try {
    const posts   = await fetchPosts();
    const related = posts
      .filter(p => p.slug !== currentSlug && p.category === category)
      .slice(0, 2);

    if (related.length === 0) return;

    const grid = document.getElementById('relatedGrid');
    grid.innerHTML = related.map(p => postCardHTML(p)).join('');
    showEl('relatedPosts');
  } catch (_) { /* silently skip */ }
}


// ============================================================
//  DATA FETCHING — Apps Script
// ============================================================
let _postsCache = null;

async function fetchPosts() {
  if (_postsCache) return _postsCache;

  if (BLOG_SHEET_URL === 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
    throw new Error('Apps Script URL not configured');
  }

  const res  = await fetch(`${BLOG_SHEET_URL}?action=blog_posts`);
  const data = await res.json();

  if (!Array.isArray(data)) throw new Error('Unexpected response');
  _postsCache = data;
  return data;
}

async function fetchPost(slug) {
  if (BLOG_SHEET_URL === 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
    throw new Error('Apps Script URL not configured');
  }

  const res  = await fetch(`${BLOG_SHEET_URL}?action=blog_post&slug=${encodeURIComponent(slug)}`);
  return res.json();
}


// ============================================================
//  HELPERS
// ============================================================

/**
 * Resolves an image_url from the sheet into a usable src path.
 *   - Absolute URL (http/https)      → used as-is
 *   - Already root-relative (/...)   → used as-is
 *   - Plain filename (no '/')        → /blog/blog_images/filename
 *   - blog_images/filename           → /blog/blog_images/filename
 *
 * Root-relative paths (/blog/...) are used so the URL always resolves
 * correctly on GitHub Pages regardless of the current page URL.
 */
function resolveImg(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  // Strip leading "blog_images/" if present, then build root-relative path
  var filename = url.startsWith('blog_images/') ? url.slice('blog_images/'.length) : url;
  return '/blog/blog_images/' + filename;
}

/**
 * Converts plain-text blog content (with literal \n or real newlines) to HTML.
 * - If content already contains HTML block tags → used as-is (supports rich HTML)
 * - Otherwise: literal \n → real newline, blank lines → paragraph breaks,
 *   single newlines → <br> within a paragraph
 */
function toHtml(text) {
  if (!text) return '';
  // Already has HTML block tags → trust it as-is
  if (/<(p|h[1-6]|ul|ol|table|div|blockquote)\b/i.test(text)) return text;
  // Convert literal \n (two chars: backslash + n) to real newline
  var normalized = text.replace(/\\n/g, '\n');
  // Split on one or more blank lines → separate paragraphs
  return normalized
    .split(/\n{2,}/)
    .map(function(para) { return para.trim(); })
    .filter(Boolean)
    .map(function(para) {
      // Single newlines within a paragraph → <br>
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    })
    .join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Handle DD-MM-YYYY or DD/MM/YYYY (common Indian entry format)
  const dmy = dateStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) dateStr = `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function readTime(text) {
  if (!text) return 1;
  const words = text.replace(/<[^>]+>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 220));
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
