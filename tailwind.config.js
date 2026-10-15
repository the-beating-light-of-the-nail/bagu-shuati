/**
 * 从旧版 index.html 内联 tailwind.config 原样搬出，保证配色 token 逐条一致。
 * Tailwind v4 通过 app/assets/css/main.css 里的 @config 引用本文件。
 */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        notion: {
          bg: '#FFFFFF',
          sidebar: '#F7F7F5',
          hover: '#F1F1EF',
          border: '#E9E9E7',
          text: '#37352F',
          muted: '#787774',
          blue: '#2383E2',
          blueBg: '#E7F3F8',
          green: '#448361',
          greenBg: '#EDF3EC',
          orange: '#D9730D',
          orangeBg: '#FAEBDD',
          purple: '#9065B0',
          purpleBg: '#F6F3F9',
          red: '#D44C47',
          redBg: '#FDEBEC',
          grayBg: '#F1F1EF'
        }
      }
    }
  }
}
