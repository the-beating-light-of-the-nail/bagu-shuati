import type { QuestionState, Route, Topic } from '#shared/bank-types'

export type DatabaseTab = 'all' | 'due' | 'weak' | 'mastered' | 'logs'
export type DbLayout = 'table' | 'gallery'

/** 工作台的视图 / 筛选状态，供侧边栏与数据库视图共享 */
export function useFilters() {
  const view = useState<'workbench' | 'database'>('wb-view', () => 'workbench')
  const tab = useState<DatabaseTab>('db-tab', () => 'all')
  const layout = useState<DbLayout>('db-layout', () => 'table')
  const search = useState<string>('db-search', () => '')
  const topicId = useState<string>('db-topic', () => 'all')
  const routeId = useState<string>('db-route', () => 'all')
  const difficulty = useState<string>('db-diff', () => 'all')
  const visibleCount = useState<number>('db-visible', () => 60)

  function resetPage() {
    visibleCount.value = 60
  }

  function setTab(next: DatabaseTab) {
    tab.value = next
    resetPage()
  }

  function filterByTopic(id: string) {
    tab.value = 'all'
    topicId.value = id
    routeId.value = 'all'
    resetPage()
  }

  function filterByRoute(id: string) {
    tab.value = 'all'
    routeId.value = id
    topicId.value = 'all'
    resetPage()
  }

  function pickQuestions(questions: QuestionState[], routes: Route[]): QuestionState[] {
    const term = search.value.trim().toLowerCase()
    return questions.filter((q) => {
      if (tab.value === 'due' && !(q.reviewCount > 0 && q.retention < 75)) return false
      if (tab.value === 'weak' && !(q.retention < 70 || q.reviewCount === 0 || q.lastRating === 'forgot' || q.lastRating === 'hard')) return false
      if (tab.value === 'mastered' && q.retention < 75) return false

      if (term) {
        const hit = q.title.toLowerCase().includes(term)
          || (q.userNote || '').toLowerCase().includes(term)
          || q.answer.toLowerCase().includes(term)
        if (!hit) return false
      }
      if (topicId.value !== 'all' && q.topicId !== topicId.value) return false
      if (routeId.value !== 'all') {
        const route = routes.find(r => r.id === routeId.value)
        if (!route || !route.topics.includes(q.topicId)) return false
      }
      if (difficulty.value !== 'all' && q.difficulty !== difficulty.value) return false
      return true
    })
  }

  return { view, tab, layout, search, topicId, routeId, difficulty, visibleCount, setTab, filterByTopic, filterByRoute, resetPage, pickQuestions }
}
