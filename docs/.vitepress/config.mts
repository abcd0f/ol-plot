import { defineConfig } from 'vitepress';

import { getSearchOptions } from './script/search.ts';
import { vitepressDemoPlugin } from 'vitepress-demo-plugin';

export default defineConfig({
  title: 'OL-Plot',
  titleTemplate: '好用的 ol 封装库',
  description: '简单使用的工具库',
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
      { text: 'API', link: '/api' },
    ],

    sidebar: [
      {
        text: '绘制工具',
        collapsed: true,
        items: [
          { text: '点', link: '/content/point' },
          { text: '折线', link: '/content/line' },
          { text: '自由线', link: '/content/freehand-line' },
          { text: '多边形', link: '/content/polygon' },
          { text: '矩形', link: '/content/rectangle' },
          { text: '圆', link: '/content/circle' },
          { text: '椭圆', link: '/content/ellipse' },
          { text: '扇形', link: '/content/sector' },
          { text: '箭头', link: '/content/arrow' },
        ],
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
