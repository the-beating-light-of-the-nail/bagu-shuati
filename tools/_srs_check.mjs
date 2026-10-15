// CP4 校对：间隔复习纯函数的行为核对（期望值手工推算）
// 用法： npx esbuild shared/srs-math.ts --bundle --format=esm --outfile=tools/_srs_a.mjs
//        npx esbuild shared/date.ts     --bundle --format=esm --outfile=tools/_srs_b.mjs
//        node tools/_srs_check.mjs
import { writeSync } from 'node:fs'
const { getAllDueQuestions, getCappedDueQuestions, masteredPct, getStreakDays, RATING_PRESETS, NEW_QUESTION_STATE } =
  await import('./_srs_a.mjs')
const { pad2, todayStr, addDaysDate } = await import('./_srs_b.mjs')

let failed = 0
function check(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const ok = a === e
  if (!ok) failed++
  writeSync(1, `${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : `\n     got=${a}\n     want=${e}`}\n`)
}

const q = (id, retention, reviewCount, extra = {}) => ({
  ...NEW_QUESTION_STATE, id, retention, reviewCount, ...extra,
})

// 待复习：仅「刷过且留存<75」进入队列，按留存升序
const list = [q('a', 40, 2), q('b', 80, 1), q('c', 25, 0), q('d', 60, 3), q('e', 90, 5)]
check('getAllDueQuestions', getAllDueQuestions(list).map(x => x.id), ['a', 'd'])
check('getCappedDueQuestions(cap=1)', getCappedDueQuestions(list, 1).map(x => x.id), ['a'])
check('getCappedDueQuestions(cap=99)', getCappedDueQuestions(list, 99).map(x => x.id), ['a', 'd'])

// 掌握率：留存 >=75 视为稳固
check('masteredPct(5 题其中 2 稳)', masteredPct(list), 40)
check('masteredPct(空数组)', masteredPct([]), 0)

// 连续打卡：今天有刷题 + 昨天有流水 = 2 天
const d = new Date()
const iso = (offset) => {
  const x = new Date(d)
  x.setDate(x.getDate() + offset)
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
}
const logs = [
  { time: `${iso(0)} 10:00:00`, qId: 'a' },
  { time: `${iso(-1)} 09:00:00`, qId: 'b' },
  { time: `${iso(-3)} 09:00:00`, qId: 'c' },
]
check('getStreakDays(今天+昨天)', getStreakDays(logs, 1), 2)
check('getStreakDays(无日志无今日)', getStreakDays([], 0), 0)
check('getStreakDays(今天无流水但昨天有)', getStreakDays([{ time: `${iso(-1)} 09:00:00` }], 0), 1)

// 日期工具
check('addDaysDate(1) 是明天', addDaysDate(1), iso(1))
check('todayStr 与 pad2 一致', todayStr(), `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`)

// 评分档位：四档留存率
check('RATING_PRESETS 留存', [RATING_PRESETS.forgot.retention, RATING_PRESETS.hard.retention, RATING_PRESETS.good.retention, RATING_PRESETS.easy.retention], [35, 65, 86, 98])
check('RATING_PRESETS 下次节点前缀', [RATING_PRESETS.hard.nextReviewText.startsWith('1 天后 ('),
  RATING_PRESETS.good.nextReviewText.startsWith('3 天后 ('),
  RATING_PRESETS.easy.nextReviewText.startsWith('7 天后 (')], [true, true, true])

writeSync(1, failed === 0 ? '\n全部通过 ✅\n' : `\n${failed} 项失败 ❌\n`)
process.exit(failed === 0 ? 0 : 1)
