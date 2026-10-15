/** 专题配色 token → Tailwind 类（与旧版一致），按 bank.json 里 topic.tone 取用 */
export const TONE_CLASSES: Record<string, string> = {
  blue: 'bg-notion-blueBg text-notion-blue',
  purple: 'bg-notion-purpleBg text-notion-purple',
  orange: 'bg-notion-orangeBg text-notion-orange',
  green: 'bg-notion-greenBg text-notion-green',
  red: 'bg-notion-redBg text-notion-red',
}

export const DOT_CLASSES: Record<string, string> = {
  blue: 'bg-notion-blue',
  purple: 'bg-notion-purple',
  orange: 'bg-notion-orange',
  green: 'bg-notion-green',
  red: 'bg-notion-red',
}

export function toneClass(tone?: string): string {
  return TONE_CLASSES[tone || 'blue'] || TONE_CLASSES.blue
}

export function dotClass(tone?: string): string {
  return DOT_CLASSES[tone || 'blue'] || DOT_CLASSES.blue
}
