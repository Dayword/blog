/* ============================================================
 * app.js — 路由、渲染、交互
 * 纯 hash 路由，静态托管零配置，深链刷新不会 404
 * ============================================================ */

const App = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = { posts: [], tags: [] };

  /* ---------------- 工具 ---------------- */

  const fmtDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  };

  const readingTime = (md) => {
    // 中文约 350 字/分钟，英文按词数折算
    const cjk = (md.match(/[\u4e00-\u9fa5]/g) || []).length;
    const words = (md.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
    return Math.max(1, Math.round(cjk / 350 + words / 220));
  };

  const escapeAttr = (s) => String(s).replace(/"/g, '&quot;');

  function notFound(msg) {
    return `<section class="empty">
      <div class="empty-icon">404</div>
      <h2>${msg || '这个页面不存在'}</h2>
      <p><a class="btn" href="#/">回到首页</a></p>
    </section>`;
  }

  /* ---------------- 组件 ---------------- */

  function postCard(post) {
    const tags = (post.tags || [])
      .map((t) => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">${Markdown.escapeHtml(t)}</a>`)
      .join('');
    return `<article class="card">
      <a class="card-cover" href="#/post/${encodeURIComponent(post.slug)}" aria-hidden="true">
        <span class="cover-glyph">${Markdown.escapeHtml((post.title || '#').trim()[0])}</span>
      </a>
      <div class="card-body">
        <h3 class="card-title">
          <a href="#/post/${encodeURIComponent(post.slug)}">${Markdown.escapeHtml(post.title)}</a>
        </h3>
        <p class="card-summary">${Markdown.escapeHtml(post.summary || '')}</p>
        <div class="card-meta">
          <time datetime="${escapeAttr(post.date)}">${fmtDate(post.date)}</time>
          <span class="dot">·</span>
          <span>${readingTime(post.content || '')} 分钟</span>
        </div>
        <div class="card-tags">${tags}</div>
      </div>
    </article>`;
  }

  function postList(posts, title, subtitle) {
    if (!posts.length) {
      return `<section class="empty">
        <h2>还没有文章</h2><p>换个标签看看，或者回到首页。</p>
        <p><a class="btn" href="#/">回到首页</a></p>
      </section>`;
    }
    return `<section class="list-head">
        <h1>${Markdown.escapeHtml(title)}</h1>
        <p class="list-sub">${subtitle ? Markdown.escapeHtml(subtitle) : `共 ${posts.length} 篇`}</p>
      </section>
      <section class="grid">${posts.map(postCard).join('')}</section>`;
  }

  /* ---------------- 页面 ---------------- */

  async function pageHome() {
    const posts = await DataStore.list();
    const latest = posts.slice(0, 4);
    return `
      <section class="hero">
        <p class="hero-kicker">技术笔记 / 编程随笔</p>
        <h1 class="hero-title">把踩过的坑，写成别人的路标</h1>
        <p class="hero-desc">
          这里记录 Python、前端、数据库与工程实践中的真实问题与解法。
          每篇都尽量给出可运行的代码，而不是泛泛而谈。
        </p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/posts">浏览全部文章</a>
          <a class="btn" href="#/about">关于我</a>
        </div>
      </section>
      <section class="list-head">
        <h2>最新文章</h2>
        <a class="more" href="#/posts">全部 ${posts.length} 篇 →</a>
      </section>
      <section class="grid">${latest.map(postCard).join('')}</section>`;
  }

  async function pagePosts() {
    const posts = await DataStore.list();
    return postList(posts, '全部文章', `共 ${posts.length} 篇`);
  }

  async function pageTag(tag) {
    const posts = await DataStore.byTag(tag);
    return postList(posts, `# ${tag}`, `标签「${tag}」下有 ${posts.length} 篇`);
  }

  async function pageTags() {
    const tags = await DataStore.tags();
    return `
      <section class="list-head">
        <h1>标签分类</h1>
        <p class="list-sub">共 ${tags.length} 个标签</p>
      </section>
      <section class="tag-cloud">
        ${tags.map((t) => `
          <a class="tag-chip" href="#/tag/${encodeURIComponent(t.name)}">
            <span class="tag-name">${Markdown.escapeHtml(t.name)}</span>
            <span class="tag-count">${t.count}</span>
          </a>`).join('')}
      </section>`;
  }

  async function pagePost(slug) {
    const post = await DataStore.get(slug);
    if (!post) return notFound('找不到这篇文章');

    const { html, headings } = Markdown.render(post.content || '');
    const toc = headings.length
      ? `<aside class="toc">
           <p class="toc-title">目录</p>
           <ul>${headings.map((h) =>
             `<li class="lv${h.level}"><a href="#${h.id}" data-toc="${h.id}">${Markdown.escapeHtml(h.text)}</a></li>`
           ).join('')}</ul>
         </aside>`
      : '';

    const tags = (post.tags || [])
      .map((t) => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">${Markdown.escapeHtml(t)}</a>`)
      .join('');

    const all = state.posts.length ? state.posts : await DataStore.list();
    const idx = all.findIndex((p) => p.slug === post.slug);
    const prev = idx > 0 ? all[idx - 1] : null;
    const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

    return `
      <article class="post">
        <header class="post-head">
          <h1>${Markdown.escapeHtml(post.title)}</h1>
          <div class="post-meta">
            <time datetime="${escapeAttr(post.date)}">${fmtDate(post.date)}</time>
            <span class="dot">·</span>
            <span>${readingTime(post.content || '')} 分钟阅读</span>
            ${post.author ? `<span class="dot">·</span><span>${Markdown.escapeHtml(post.author)}</span>` : ''}
          </div>
          <div class="post-tags">${tags}</div>
        </header>
        <div class="post-body">${html}</div>
        <footer class="post-foot">
          <nav class="post-nav">
            ${prev ? `<a class="nav-item" href="#/post/${encodeURIComponent(prev.slug)}">
                <span class="nav-label">← 上一篇</span>
                <span class="nav-title">${Markdown.escapeHtml(prev.title)}</span></a>` : '<span></span>'}
            ${next ? `<a class="nav-item nav-next" href="#/post/${encodeURIComponent(next.slug)}">
                <span class="nav-label">下一篇 →</span>
                <span class="nav-title">${Markdown.escapeHtml(next.title)}</span></a>` : '<span></span>'}
          </nav>
        </footer>
      </article>
      ${toc}`;
  }

  async function pageAbout() {
    return `
      <section class="list-head">
        <h1>关于</h1>
        <p class="list-sub">关于这个站点和写它的人</p>
      </section>
      <div class="about">
        <div class="about-card">
          <div class="about-avatar">D</div>
          <h2>Dayword</h2>
          <p class="about-role">后端开发 / 全栈爱好者</p>
          <p class="about-bio">
            平时主要写 Python 和 FastAPI，偶尔折腾前端和数据库调优。
            相信「能跑起来的代码」比「看起来很优雅的设计」更重要，
            所以这个博客里的每篇文章都尽量附带完整可复制的示例。
          </p>
          <ul class="about-skills">
            <li>Python · FastAPI · SQLAlchemy</li>
            <li>MySQL · Redis · 索引与查询优化</li>
            <li>HTML / CSS / 原生 JavaScript</li>
            <li>Docker · Git · Linux 日常运维</li>
          </ul>
          <div class="about-links">
            <a class="btn" href="https://github.com/Dayword" target="_blank" rel="noopener">GitHub</a>
            <a class="btn" href="#/posts">看文章</a>
          </div>
        </div>
        <div class="about-text">
          <h3>这个博客是怎么搭的</h3>
          <p>整站是一个纯静态站点：HTML + CSS + 原生 JavaScript，没有构建步骤，也没有外部依赖库，
            克隆下来直接打开就能看。</p>
          <ul>
            <li><strong>内容</strong>：文章以 JSON 存放，正文用 Markdown 编写</li>
            <li><strong>渲染</strong>：自研的零依赖 Markdown 解析器，带代码高亮和章节目录</li>
            <li><strong>路由</strong>：基于 URL hash 的前端路由，刷新深链不会 404</li>
            <li><strong>托管</strong>：GitHub Pages 免费托管，推送即发布</li>
          </ul>
          <h3>怎么新增一篇文章</h3>
          <p>在 <code>posts/</code> 目录下新建一个 <code>你的文章-slug.json</code>，
            按下面的结构填好内容，再把 slug 登记到 <code>assets/js/store.js</code> 的
            <code>INDEX</code> 数组里就行。</p>
          <pre class="code-block" data-lang="json"><code><span class="tok-com">// posts/my-new-post.json</span>
{
  <span class="tok-str">"slug"</span>: <span class="tok-str">"my-new-post"</span>,
  <span class="tok-str">"title"</span>: <span class="tok-str">"文章标题"</span>,
  <span class="tok-str">"date"</span>: <span class="tok-str">"2026-10-11"</span>,
  <span class="tok-str">"summary"</span>: <span class="tok-str">"一句话摘要，会显示在列表卡片上"</span>,
  <span class="tok-str">"tags"</span>: [<span class="tok-str">"Python"</span>, <span class="tok-str">"后端"</span>],
  <span class="tok-str">"content"</span>: <span class="tok-str">"## 小标题\n\n正文，支持 Markdown。"</span>
}</code></pre>
          <h3>想接数据库怎么办</h3>
          <p>所有数据读取都收敛在 <code>assets/js/store.js</code> 一个文件里。
            把 <code>DataStore</code> 的四个方法改成请求云端接口即可，
            页面代码完全不用动。</p>
        </div>
      </div>`;
  }

  /* ---------------- 路由 ---------------- */

  function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || '', arg: parts[1] || '' };
  }

  async function render() {
    const view = $('#view');
    const { name, arg } = parseHash();

    // 当前导航高亮
    $$('.nav-link').forEach((a) => {
      const target = a.getAttribute('href').replace('#', '');
      const key = '/' + name;
      a.classList.toggle('active',
        target === key || (target === '/' && name === '') ||
        (target === '/posts' && name === ''));
    });

    view.innerHTML = '<div class="loading"><span></span><span></span><span></span></div>';

    try {
      state.posts = state.posts.length ? state.posts : await DataStore.list();
      let html;
      switch (name) {
        case '':          html = await pageHome(); break;
        case 'posts':     html = await pagePosts(); break;
        case 'post':      html = await pagePost(arg); break;
        case 'tags':      html = await pageTags(); break;
        case 'tag':       html = await pageTag(arg); break;
        case 'about':     html = await pageAbout(); break;
        default:          html = notFound();
      }
      view.innerHTML = `<div class="page-enter">${html}</div>`;
    } catch (err) {
      view.innerHTML = `<section class="empty">
        <h2>内容加载失败</h2>
        <p class="err">${Markdown.escapeHtml(err.message)}</p>
        <p>如果你是在本地用 <code>file://</code> 打开，浏览器会拦截 fetch 请求。<br>
           请在项目目录下起一个本地服务，例如 <code>python -m http.server 8000</code>。</p>
      </section>`;
    }

    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    setupTocSpy();
    closeMobileNav();
  }

  /* ---------------- 目录滚动高亮 ---------------- */

  let tocObserver = null;
  function setupTocSpy() {
    if (tocObserver) tocObserver.disconnect();
    const links = $$('.toc a[data-toc]');
    if (!links.length) return;

    const targets = links
      .map((a) => document.getElementById(a.dataset.toc))
      .filter(Boolean);
    if (!targets.length) return;

    tocObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('active', a.dataset.toc === e.target.id));
      });
    }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });

    targets.forEach((t) => tocObserver.observe(t));
  }

  /* ---------------- 交互 ---------------- */

  function closeMobileNav() {
    $('#nav').classList.remove('open');
    $('#navToggle').setAttribute('aria-expanded', 'false');
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('blog-theme', next); } catch (_) {}
    $('#themeToggle').textContent = next === 'dark' ? '☀' : '☾';
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('blog-theme'); } catch (_) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    const btn = $('#themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
  }

  function bind() {
    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#navToggle').addEventListener('click', () => {
      const nav = $('#nav');
      const open = nav.classList.toggle('open');
      $('#navToggle').setAttribute('aria-expanded', String(open));
    });
    window.addEventListener('hashchange', render);

    // 目录锚点平滑滚动
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.toc a[data-toc]');
      if (!a) return;
      e.preventDefault();
      const el = document.getElementById(a.dataset.toc);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 显示文章总数
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  async function start() {
    initTheme();
    bind();
    try {
      state.posts = await DataStore.list();
      const count = $('#postCount');
      if (count) count.textContent = state.posts.length;
    } catch (_) { /* 交给 render 里的错误提示 */ }
    await render();
  }

  return { start };
})();

document.addEventListener('DOMContentLoaded', App.start);
