/**
 * 轻量 Markdown 渲染（题库答案是 Markdown 原文）。
 *
 * 从旧版 index.html 的 JS 实现原样搬迁，SSR / 预渲染与客户端共用同一份纯函数，
 * 因此同输入同输出，不会有 hydration mismatch。
 */

export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const UPSTREAM_REPO = 'https://github.com/guocong-bincai/ai-interview-guide'

/**
 * 题库答案里残留了上游仓库文档之间的相对链接（如 `../09-ai-safety-evaluation/`），
 * 直接渲染会在本站变成 404，这里统一改写成上游仓库的绝对地址。
 */
function absolutize(href: string): string {
  if (/^(https?:|#|mailto:|tel:|mailto)/.test(href)) return href
  const clean = href.replace(/^(\.\.?\/)+/, '')
  const [path = '', hash] = clean.split('#')
  const kind = path.endsWith('.md') ? 'blob' : 'tree'
  const url = `${UPSTREAM_REPO}/${kind}/main/docs/${path.replace(/\/$/, '')}`
  return hash ? `${url}#${hash}` : url
}

export function inlineMd(s: string): string {
  let out = escapeHtml(s)
  out = out.replace(/`([^`]+)`/g, (_m: string, c: string) => '@@CODE' + c + '@@')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m: string, text: string, href: string) =>
      `<a href="${absolutize(href)}" target="_blank" rel="nofollow noopener">${text}</a>`,
  )
  out = out.replace(/@@CODE([^@]*)@@/g, '<code>$1</code>')
  return out
}

export function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c: string) => c.trim())
}

export function isBlockStart(line: string): boolean {
  return /^\s*```/.test(line)
    || /^(#{1,6})\s+/.test(line)
    || /^\s*>/.test(line)
    || /^\s*([-*+]|\d+[.、)])\s+/.test(line)
    || /^\s*\|.*\|\s*$/.test(line)
    || /^\s*([-*_])\1{2,}\s*$/.test(line)
}

export function mdToHtml(md: string): string {
  if (!md) return ''
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] as string

    if (/^\s*```/.test(line)) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i] as string)) {
        buf.push(lines[i] as string)
        i++
      }
      i++
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] as string)) {
      const head = splitTableRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i] as string)) {
        rows.push(splitTableRow(lines[i] as string))
        i++
      }
      out.push('<table><thead><tr>' + head.map((h: string) => `<th>${inlineMd(h)}</th>`).join('') +
        '</tr></thead><tbody>' + rows.map((r: string[]) => '<tr>' + r.map((c: string) => `<td>${inlineMd(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table>')
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const lvl = Math.min((heading[1] as string).length, 5)
      out.push(`<h${lvl}>${inlineMd(heading[2] as string)}</h${lvl}>`)
      i++
      continue
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      out.push('<hr/>')
      i++
      continue
    }

    if (/^\s*>/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i] as string)) {
        buf.push((lines[i] as string).replace(/^\s*>\s?/, ''))
        i++
      }
      out.push('<blockquote>' + inlineMd(buf.join('\n')).replace(/\n/g, '<br/>') + '</blockquote>')
      continue
    }

    const item = line.match(/^\s*([-*+]|\d+[.、)])\s+(.*)$/)
    if (item) {
      const ordered = /\d/.test(item[1] as string)
      const items: string[] = []
      while (i < lines.length) {
        const m = (lines[i] as string).match(/^\s*([-*+]|\d+[.、)])\s+(.*)$/)
        if (!m) break
        items.push(m[2] as string)
        i++
      }
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>` + items.map((t: string) => `<li>${inlineMd(t)}</li>`).join('') + `</${tag}>`)
      continue
    }

    if (!line.trim()) {
      i++
      continue
    }

    const buf: string[] = []
    while (i < lines.length && (lines[i] as string).trim() && !isBlockStart(lines[i] as string)) {
      buf.push(lines[i] as string)
      i++
    }
    // 兜底：当前行被判为块起始，但上面的分支没有消费它（例如「孤立的表格行」——
    // 下一行不是分隔行，表格分支不会触发）。此时必须至少前进一行，否则会死循环。
    if (!buf.length) {
      buf.push(line)
      i++
    }
    out.push(`<p>${inlineMd(buf.join('\n')).replace(/\n/g, '<br/>')}</p>`)
  }
  return out.join('\n')
}

/**
 * 取答案的纯文本摘要，用于 meta description / JSON-LD。
 * 逐行跳过代码块（不能对整段用 `.*?` 贪婪匹配，遇到未闭合的 ``` 会退化成 O(n^2)）。
 */
export function plainText(md: string, limit = 120): string {
  const kept: string[] = []
  let inFence = false
  for (const line of (md || '').replace(/\r\n/g, '\n').split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (!inFence) kept.push(line)
  }
  const t = kept.join('\n').replace(/[|#>*`\-]/g, ' ').replace(/\s+/g, ' ').trim()
  return t.slice(0, limit)
}

/** 题干常以问号结尾，避免出现「？。」这类重复标点 */
export function joinDesc(title: string, body: string): string {
  const last = title.slice(-1)
  const sep = '？?。！!：:'.includes(last) ? '' : '。'
  return `${title}${sep}${body}`
}
