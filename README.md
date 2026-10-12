# 童年回忆 · 动画主题馆

一个零依赖的单文件静态站：**28 部国产动画**的卡片墙，鼠标悬停时卡片封面直接被 B 站主题曲视频顶替；
顶部是一条自动横向滚动的海报带，悬停停住并试听该片主题曲，点击进对应子页面。

线上地址：<https://dayword.github.io/blog/>

## 这里原来是什么

这个仓库原本是「Dayword 的技术笔记」（8 篇 Python / 前端 / 数据库文章）。
现在首页 `index.html` 换成了童年回忆站，但**原来的内容没有删除**：

- `blog.html` —— 原博客的入口，访问 <https://dayword.github.io/blog/blog.html> 即可打开。
  （它就是原来的 `index.html`，只是改了文件名。）
- `posts/` —— 8 篇原文（JSON，正文为 Markdown）
- `assets/css/`、`assets/js/` —— 原博客的样式与脚本

想恢复成原来那样，把 `blog.html` 改回 `index.html` 即可。

## 站点能力

- **卡片墙**：按 `经典怀旧 / 国漫少儿 / 国漫玄幻 / 动画电影·特摄` 分组筛选。
  悬停卡片 → 封面换成 B 站主题曲视频（海报的模糊放大版垫底，不留黑边）；移开即收走。
- **滚动海报带**：自动滚动；悬停停住并试听主题曲（描红边 + `♪`）；按住左键可拖动；
  点击进子页面。
- **子页面**（`#/a/<id>`）：讲解长文 + 正片/主题曲两个视频源（带切换按钮）+ 主题曲歌单 + 海报墙。
- 零构建、零依赖、无后端。数据全部内联在 HTML 里，所以 `file://` 双击也能跑
  （B 站视频需要联网）。

## 目录结构

```
blog/
├── index.html                    # 站点全部内容（单文件，数据内联）
├── assets/
│   ├── posters/p01..p28/NN.jpg   # 188 张动画海报
│   ├── audio/pNN_N.mp3           # 55 首主题曲（128kbps，约 161 MB）
│   ├── css/style.css             # （原博客遗留，blog.html 用）
│   └── js/{markdown,store,app}.js
├── posts/                        # （原博客遗留）8 篇文章
├── blog.html                     # （原博客入口，改名前是 index.html）
└── .github/workflows/pages.yml   # 推 main 自动部署到 GitHub Pages
```

## 本地预览

`file://` 直接双击 `index.html` 即可（数据内联，没有 fetch）。
若想看 B 站视频，起个本地服务更稳：

```bash
python -m http.server 8000
# 然后打开 http://localhost:8000
```

## 重新生成 / 改成自己的版本

生成逻辑封装在 WorkBuddy 技能 `childhood-memories-site` 里：

```bash
# 拉素材（243 个文件 / 约 224 MB，已存在的会跳过）
python scripts/fetch_assets.py --out ./childhood-memories
# 渲染单文件页面
python scripts/build_site.py  --out ./childhood-memories
# 推回 GitHub
python scripts/publish.py --repo Dayword/blog --dir ./childhood-memories
```

想换片单（换成别的动画、电影、游戏）：改写 `references/site_data.json` 里的
`DATA` / `STORY` / `THEME`，按同样的 `assets/posters/pNN/NN.jpg` + `assets/audio/pNN_N.mp3`
结构准备素材，再跑上面两步即可。详细的数据 schema 与交互机制见技能里的
`references/site-anatomy.md`。

## 版权

海报与主题曲来自公开网络，版权归各自权利人所有，本站仅作展示与学习用途；
视频通过哔哩哔哩官方外链播放器嵌入，未做任何转载。
