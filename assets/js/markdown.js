/* ============================================================
 * markdown.js — 零依赖 Markdown 渲染器 + 代码高亮 + 目录生成
 *
 * 支持：标题 / 段落 / 粗斜体 / 行内代码 / 围栏代码块 / 引用 /
 *      有序无序列表 / 链接 / 图片 / 分隔线 / 表格
 *
 * 说明：不用 marked / highlight.js 是为了让整个站点零外部依赖，
 *      打开即可用，也不受 CDN 可用性影响。若你更倾向成熟库，
 *      把 render() 换成 marked.parse() 并把 escapeHtml 结果交给它即可。
 * ============================================================ */

const Markdown = (() => {
  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // ---- 行内解析：代码 -> 图片 -> 链接 -> 强调 ----
  function inline(text) {
    const codes = [];
    // 先抽出行内代码，避免其中的 * _ 被当作强调
    text = text.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return `\u0000CODE${codes.length - 1}\u0000`;
    });

    text = escapeHtml(text)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
        (_, alt, src, title) =>
          `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
        (_, label, href, title) =>
          `<a href="${href}"${title ? ` title="${title}"` : ''}>${label}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');

    return text.replace(/\u0000CODE(\d+)\u0000/g,
      (_, i) => `<code>${escapeHtml(codes[i])}</code>`);
  }

  // ---- 极简语法高亮（按注释/字符串/数字/关键字着色，不追求完备） ----
  const KEYWORDS = new RegExp(
    '\\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|' +
    'continue|class|extends|new|this|super|import|export|from|default|async|await|' +
    'try|catch|finally|throw|typeof|instanceof|in|of|delete|void|yield|' +
    'def|elif|lambda|pass|with|as|None|True|False|and|or|not|is|self|' +
    'public|private|protected|static|interface|type|enum|implements|' +
    'int|str|float|bool|list|dict|set|tuple|Optional|List|Dict|Any|' +
    'SELECT|FROM|WHERE|JOIN|GROUP|ORDER|BY|LIMIT|CREATE|INDEX|ON|EXPLAIN|' +
    'RUN|COPY|WORKDIR|ENV|EXPOSE|CMD|ENTRYPOINT)\\b', 'g');

  // 一次扫描完成着色：单次 pass 里同时识别注释 / 字符串 / 关键字 / 数字。
  // 不能分成多轮 replace —— 那样后一轮会命中前一轮已插入的 span 内容
  // （例如 "-- 查询 WHERE a > '1'" 里的 WHERE 会被再包一层，占位符无法还原）。
  const TOKEN_RE = new RegExp([
    '(\\/\\/[^\\n]*|#[^\\n]*|--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)',   // 1 注释
    '(&quot;[\\s\\S]*?&quot;|&#39;[\\s\\S]*?&#39;|`[^`]*?`)',      // 2 字符串
    '(' + KEYWORDS.source + ')',                                   // 3 关键字
    '(\\b\\d+(?:\\.\\d+)?\\b)',                                    // 4 数字
  ].join('|'), 'g');

  function highlight(code) {
    return escapeHtml(code).replace(TOKEN_RE, (m, com, str, kw, num) => {
      if (com) return `<span class="tok-com">${com}</span>`;
      if (str) return `<span class="tok-str">${str}</span>`;
      if (kw) return `<span class="tok-kw">${kw}</span>`;
      if (num) return `<span class="tok-num">${num}</span>`;
      return m;
    });
  }

  // ---- 块级解析 ----
  function render(md) {
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    const headings = [];
    let i = 0;

    const isBlank = (s) => !s.trim();

    while (i < lines.length) {
      const line = lines[i];

      if (isBlank(line)) { i++; continue; }

      // 围栏代码块
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        const lang = fence[1] || 'text';
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++; // 跳过收尾 ```
        out.push(
          `<pre class="code-block" data-lang="${lang}"><code>${highlight(buf.join('\n'), lang)}</code></pre>`
        );
        continue;
      }

      // 标题
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        const text = h[2].trim();
        const id = text.toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 60) || `h-${headings.length}`;
        if (level === 2 || level === 3) headings.push({ level, text, id });
        out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
        i++;
        continue;
      }

      // 分隔线
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      // 引用块（支持多行）
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push(`<blockquote>${render(buf.join('\n')).html}</blockquote>`);
        continue;
      }

      // 表格（| a | b |  +  |---|---|）
      if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length &&
          /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        const cells = (row) =>
          row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push(
          '<div class="table-wrap"><table><thead><tr>' +
          head.map((c) => `<th>${inline(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table></div>'
        );
        continue;
      }

      // 列表（有序 / 无序，支持缩进嵌套）
      if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\.\s+/.test(line);
        const items = [];
        let cur = null;
        const baseIndent = line.match(/^\s*/)[0].length;

        while (i < lines.length) {
          const l = lines[i];
          const m = l.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/);
          if (m) {
            if (m[1].length > baseIndent && cur !== null) {
              cur.sub.push(l);            // 更深的缩进 -> 挂到当前项下
            } else {
              cur = { text: m[2], sub: [] };
              items.push(cur);
            }
            i++;
          } else if (!isBlank(l) && cur && /^\s{2,}/.test(l)) {
            cur.sub.push(l.replace(/^\s{2}/, ''));  // 续行
            i++;
          } else break;
        }

        const tag = ordered ? 'ol' : 'ul';
        out.push(
          `<${tag}>` +
          items.map((it) =>
            `<li>${inline(it.text)}${it.sub.length ? render(it.sub.join('\n')).html : ''}</li>`
          ).join('') +
          `</${tag}>`
        );
        continue;
      }

      // 段落（连续非空行合并）
      const buf = [];
      while (i < lines.length && !isBlank(lines[i]) &&
             !/^(#{1,6}\s|```|>|\s*(?:[-*+]|\d+\.)\s)/.test(lines[i])) {
        buf.push(lines[i++]);
      }
      out.push(`<p>${inline(buf.join('\n'))}</p>`);
    }

    return { html: out.join('\n'), headings };
  }

  return { render, escapeHtml };
})();
