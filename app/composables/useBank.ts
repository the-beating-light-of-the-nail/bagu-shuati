import type { Bank } from '#shared/bank-types'

/**
 * 题库数据的客户端入口：懒加载静态资源 /data/bank.json 并缓存。
 * 3.1 MB 的题库只在真正需要时拉取，既不进 JS bundle，也不进预渲染 HTML。
 */
export function useBank() {
  const bank = useState<Bank | null>('bank', () => null)
  const loading = useState<boolean>('bank-loading', () => false)

  async function load(): Promise<Bank> {
    if (bank.value) return bank.value
    loading.value = true
    try {
      bank.value = await $fetch<Bank>('/data/bank.json')
      return bank.value
    }
    finally {
      loading.value = false
    }
  }

  return { bank, loading, load }
}
