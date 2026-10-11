# 本地预览

浏览器的 CORS 策略会拦截 `file://` 协议下的 fetch 请求，
所以**不能直接双击 index.html**，需要起一个本地静态服务。

在项目根目录执行任意一条：

```bash
python -m http.server 8000
# 或
npx serve .
# 或
php -S localhost:8000
```

然后打开 <http://localhost:8000>

# 部署

推送到 GitHub 的 `main` 分支即可，`.github/workflows/pages.yml` 会自动发布到 GitHub Pages。

# 目录结构

```
blog/
├── index.html              # 入口
├── assets/
│   ├── css/style.css       # 全站样式（含深色模式）
│   └── js/
│       ├── markdown.js     # 零依赖 Markdown 解析 + 代码高亮
│       ├── store.js        # 数据层 —— 接后端只改这一个文件
│       └── app.js          # 路由与页面渲染
└── posts/                  # 文章内容（JSON，正文为 Markdown）
```

# 新增一篇文章

1. 在 `posts/` 下新建 `<slug>.json`：

```json
{
  "slug": "my-post",
  "title": "标题",
  "date": "2026-10-11",
  "author": "Dayword",
  "tags": ["标签A", "标签B"],
  "summary": "列表页显示的一句话摘要",
  "content": "## 小标题\n\n正文用 Markdown 写。"
}
```

2. 把 `my-post` 加进 `assets/js/store.js` 里的 `INDEX` 数组。

`content` 字段支持：标题、段落、引用、有序/无序列表、代码块、行内代码、
粗体、斜体、删除线、链接、图片、表格、分隔线。

# 接云端数据库

所有数据读取都收敛在 `assets/js/store.js` 的 `DataStore` 对象上，共 4 个方法：

| 方法 | 作用 |
|---|---|
| `list()` | 返回全部文章（按日期倒序） |
| `get(slug)` | 按 slug 取单篇 |
| `tags()` | 返回 `[{name, count}]` |
| `byTag(tag)` | 按标签筛选 |

把这四个方法改成请求你的后端接口即可，页面代码无需改动。

图片与附件同理：把 `content` 里的图片地址换成云端存储返回的 URL。
