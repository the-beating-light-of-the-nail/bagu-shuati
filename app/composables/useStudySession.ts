import type { QuestionState } from '#shared/bank-types'

/** 全屏沉浸式刷题的会话状态（队列、当前下标、开关），供 StudyOverlay 与各入口共享 */
export function useStudySession() {
  const isOpen = useState<boolean>('study-open', () => false)
  const queue = useState<string[]>('study-queue', () => [])
  const title = useState<string>('study-title', () => '今日抗遗忘复习队列')
  const index = useState<number>('study-index', () => 0)
  const completed = useState<number>('study-completed', () => 0)
  const mastered = useState<number>('study-mastered', () => 0)
  const showSummary = useState<boolean>('study-summary', () => false)

  function launch(ids: string[], queueTitle: string) {
    if (!ids.length) return false
    queue.value = [...ids]
    title.value = queueTitle
    index.value = 0
    completed.value = 0
    mastered.value = 0
    isOpen.value = true
    return true
  }

  function close() {
    isOpen.value = false
  }

  /** 按 id 在题库中找出题目对象 */
  function resolve(all: QuestionState[], id: string): QuestionState | undefined {
    return all.find(q => q.id === id)
  }

  return { isOpen, queue, title, index, completed, mastered, showSummary, launch, close, resolve }
}
