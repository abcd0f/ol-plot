import { defineConfig } from 'vitepress';

import { getSearchOptions } from './script/search.ts';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';

export default defineConfig({
  title: 'OL-Plot',
  titleTemplate: ':title — OpenLayers 地图绘图工具库',
  description: '基于 OpenLayers 的矢量图形绘制方案，提供绘制、选择、编辑全生命周期管理',
  // base: './',
  lang: 'zh-CN',
  outDir: '../dist',
  markdown: {
    // 开启行号
    // lineNumbers: true,
    image: {
      // 默认禁用；设置为 true 可为所有图片启用懒加载。
      lazyLoading: true,
    },
    // 更改容器默认值标题
    container: {
      tipLabel: '提示',
      warningLabel: '警告',
      dangerLabel: '危险',
      infoLabel: '信息',
      detailsLabel: '详细信息',
    },
    config(md) {
      md.use(vitepressDemoPlugin);
    },
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/quickstart' },
      { text: '组件', link: '/components/point' },
      { text: 'API', link: '/api' },
    ],

    sidebar: [
      {
        text: '指南',
        collapsed: false,
        items: [
          { text: '安装', link: '/guide/installation' },
          { text: '快速开始', link: '/guide/quickstart' },
          { text: '事件系统', link: '/guide/events' },
        ],
      },
      {
        text: '绘图组件',
        collapsed: false,
        items: [
          { text: '点 Point', link: '/components/point' },
          { text: '折线 Line', link: '/components/line' },
          { text: '自由线 FreehandLine', link: '/components/freehand-line' },
          { text: '多边形 Polygon', link: '/components/polygon' },
          { text: '矩形 Rectangle', link: '/components/rectangle' },
          { text: '圆 Circle', link: '/components/circle' },
          { text: '椭圆 Ellipse', link: '/components/ellipse' },
          { text: '扇形 Sector', link: '/components/sector' },
          { text: '弓形 Arc', link: '/components/arc' },
          { text: '直箭头 StraightArrow', link: '/components/straight-arrow' },
          { text: '斜箭头 TaperedArrow', link: '/components/tapered-arrow' },
          { text: '线箭头 LineArrow', link: '/components/line-arrow' },
          { text: '钳击箭头', link: '/components/pincer-arrow' },
        ],
      },
      {
        text: '参考',
        collapsed: false,
        items: [{ text: 'API 参考', link: '/api' }],
      },
    ],

    search: { provider: 'local', options: getSearchOptions() },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      label: '页面导航',
    },

    lastUpdated: {
      text: '最后更新于',
    },

    notFound: {
      title: '页面未找到',
      quote: '但如果你不改变方向，并且继续寻找，你可能最终会到达你所前往的地方。',
      linkLabel: '前往首页',
      linkText: '带我回首页',
    },

    langMenuLabel: '多语言',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    skipToContentLabel: '跳转到内容',

    socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }],
  },
  vite: {
    optimizeDeps: {
      exclude: ['@nolebase/vitepress-plugin-enhanced-readabilities/client', 'vitepress', '@nolebase/ui'],
    },
    ssr: {
      noExternal: [
        // 如果还有别的依赖需要添加的话，并排填写和配置到这里即可
        '@nolebase/vitepress-plugin-enhanced-readabilities',
        '@nolebase/ui',
      ],
    },
    server: {
      host: '0.0.0.0',
    },
  },
});
