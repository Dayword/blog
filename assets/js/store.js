/* ============================================================
 * store.js — 数据层适配器（唯一需要改动的地方）
 *
 * 当前实现：从本地 /posts/*.json 读取文章。
 * 要换成云端数据库（Supabase / WorkBuddy 云服务 / 自建 API）时，
 * 只需重写下面 DataStore 的 4 个方法，页面代码一行都不用动。
 * ============================================================ */

const DataStore = (() => {
  // 文章索引：增删文章时在这里登记（云端方案下这一步由后端返回）
  const INDEX = [
    'hello-world',
    'js-async-patterns',
    'python-type-hints',
    'css-modern-layout',
    'git-workflow',
    'sql-index-tuning',
    'docker-first-step',
    'writing-readable-code',
  ];

  const BASE = new URL('posts/', document.baseURI).href;
  let cache = null;

  async function fetchOne(slug) {
    const res = await fetch(BASE + slug + '.json');
    if (!res.ok) throw new Error('文章不存在: ' + slug);
    return res.json();
  }

  return {
    /** 取全部文章（按日期倒序） */
    async list() {
      if (cache) return cache;
      const items = await Promise.all(INDEX.map(fetchOne));
      cache = items.sort((a, b) => (a.date < b.date ? 1 : -1));
      return cache;
    },

    /** 按 slug 取单篇 */
    async get(slug) {
      const all = await this.list();
      return all.find((p) => p.slug === slug) || null;
    },

    /** 标签 -> 文章数 的统计表 */
    async tags() {
      const all = await this.list();
      const map = new Map();
      for (const p of all) {
        for (const t of p.tags || []) map.set(t, (map.get(t) || 0) + 1);
      }
      return [...map.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    },

    /** 按标签筛选 */
    async byTag(tag) {
      const all = await this.list();
      return all.filter((p) => (p.tags || []).includes(tag));
    },
  };
})();
