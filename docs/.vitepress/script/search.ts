import type { DefaultTheme } from 'vitepress/theme';

export const getSearchOptions = (): Partial<DefaultTheme.LocalSearchOptions> => {
  return {
    locales: {
      root: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            displayDetails: '显示详情列表',
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '按 Enter 键选择',
              navigateText: '使用 ↑ / ↓ 键浏览',
              navigateUpKeyAriaLabel: '按 ↑ 键查看上一个结果',
              navigateDownKeyAriaLabel: '按 ↓ 键查看下一个结果',
              closeText: '关闭',
              closeKeyAriaLabel: '按 Esc 键关闭搜索窗口'
            }
          }
        }
      }
    }
  };
};
