// CP2 校对：新 shared/md.ts 与旧 index.html 内联渲染器逐字符比对。
// 用法： node tools/_md_compare.mjs
import { readFileSync, writeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 用大括号配对从源码里抠出函数定义（这些函数内部的 {} 都是成对的） */
function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(')
  if (start < 0) throw new Error('未找到函数: ' + name)
  let depth = 0
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') {
      depth--
      if (depth === 0) return src.slice(start, j + 1)
    }
  }
  throw new Error('大括号不配对: ' + name)
}

const html = readFileSync(join(root, 'index.html'), 'utf8')
const names = ['escapeHtml', 'inlineMd', 'splitTableRow', 'isBlockStart', 'mdToHtml']
const oldSrc = names.map(n => extractFn(html, n)).join('\n')
const oldRenderer = new Function(oldSrc + '\nreturn { mdToHtml }')()
if (!oldRenderer.mdToHtml) throw new Error('旧渲染器加载失败')
console.log(`旧渲染器已从 index.html 抠出 ${names.length} 个函数，源码 ${oldSrc.length} 字符`)

const { mdToHtml: newRenderer } = await import('./_md_new.mjs')

const bank = JSON.parse(readFileSync(join(root, 'data', 'bank.json'), 'utf8'))
const questions = bank.questions

let mismatches = 0
let firstDiff = null
for (const q of questions) {
  // 同步无缓冲输出：进程被 V8 致命错误杀掉时，日志最后一行就是肇事题目
  writeSync(1, `> ${q.id} (len=${q.answer.length})\n`)
  const a = oldRenderer.mdToHtml(q.answer)
  const b = newRenderer(q.answer)
  if (a !== b) {
    mismatches++
    if (!firstDiff) {
      let k = 0
      while (k < Math.min(a.length, b.length) && a[k] === b[k]) k++
      firstDiff = {
        id: q.id,
        at: k,
        oldSnippet: JSON.stringify(a.slice(Math.max(0, k - 40), k + 60)),
        newSnippet: JSON.stringify(b.slice(Math.max(0, k - 40), k + 60)),
      }
    }
  }
}

console.log(`比对 ${questions.length} 道题：${mismatches === 0 ? '全部一致 ✅' : mismatches + ' 处不一致 ❌'}`)
if (firstDiff) {
  console.log('首个差异:', firstDiff.id, '@', firstDiff.at)
  console.log('  旧:', firstDiff.oldSnippet)
  console.log('  新:', firstDiff.newSnippet)
}
process.exit(mismatches === 0 ? 0 : 1)
