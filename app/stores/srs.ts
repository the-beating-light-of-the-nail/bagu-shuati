import { defineStore } from 'pinia'
import type { ProgressSnapshot, SrsEntry, StudyLog } from '#shared/bank-types'
import { NEW_QUESTION_STATE, RATING_PRESETS } from '#shared/srs-math'
import { getCurrentTimestampStr, todayStr } from '#shared/date'

const LS_KEY = 'bagu_shuati_v1'

/**
 * 进度存储适配器接缝：首版用 localStorage（键与旧版完全一致，老用户进度无缝续用）；
 * 日后接入 Cloudflare D1 时，换成一个 httpAdapter（/api/srs）即可，UI 层不用改。
 */
interface ProgressAdapter {
  load: () => Promise<Partial<ProgressSnapshot> | null>
  save: (snap: ProgressSnapshot) => Promise<void>
}

const localStorageAdapter: ProgressAdapter = {
  async load() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    } catch {
      return null
    }
  },
  async save(snap) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snap))
    } catch {
      // 存储空间受限时静默降级
    }
  },
}

let adapter: ProgressAdapter = localStorageAdapter

/** 将来切云端同步时调用它换装 */
export function useProgressAdapter(next: ProgressAdapter) {
  adapter = next
}

export const useSrsStore = defineStore('srs', {
  state: () => ({
    srs: {} as Record<string, SrsEntry>,
    logs: [] as StudyLog[],
    today: 0,
    todayDate: '',
    dailyCap: 5,
    selected: [] as string[],
    presetTopics: [] as string[],
    ready: false,
  }),

  getters: {
    selectedSet: (s): Set<string> => new Set(s.selected),
  },

  actions: {
    /** 客户端启动时调用（见 plugins/srs.client.ts）。进度只在客户端读，预渲染 HTML 里绝不出现。 */
    async init() {
      if (this.ready) return
      const snap = await adapter.load()
      if (snap) {
        this.srs = snap.srs || {}
        this.logs = Array.isArray(snap.logs) ? snap.logs : []
        this.dailyCap = snap.dailyCap || 5
        this.selected = snapshotIds(snap.selected)
        this.presetTopics = snapshotIds(snap.presetTopics)
        this.today = snap.todayDate === todayStr() ? (snap.today || 0) : 0
      }
      this.todayDate = todayStr()
      this.ready = true
    },

    /** 某题的当前进度（未刷过则返回新题初始值） */
    entryOf(id: string): SrsEntry {
      return { ...NEW_QUESTION_STATE, ...(this.srs[id] || {}) }
    },

    /** 四档评分：更新留存率与下次复习节点，写流水，累加今日计数 */
    async rate(id: string, title: string, topicName: string, rating: string): Promise<SrsEntry> {
      const cur = this.entryOf(id)
      cur.reviewCount += 1
      cur.lastReviewedAt = getCurrentTimestampStr()
      cur.lastRating = rating
      const preset = RATING_PRESETS[rating]
      if (preset) {
        cur.retention = preset.retention
        cur.nextReviewText = preset.nextReviewText
      }
      this.srs[id] = cur
      this.logs.unshift({
        id: 'log_' + Date.now(),
        qId: id,
        qTitle: title,
        bankName: topicName,
        time: cur.lastReviewedAt,
        rating,
        countAfter: cur.reviewCount,
        retentionAfter: cur.retention,
      })
      this.logs = this.logs.slice(0, 400)
      if (this.todayDate === todayStr()) {
        this.today += 1
      } else {
        this.todayDate = todayStr()
        this.today = 1
      }
      await this.persist()
      return cur
    },

    async setNote(id: string, note: string) {
      const cur = this.entryOf(id)
      cur.userNote = note
      this.srs[id] = cur
      await this.persist()
    },

    setDailyCap(cap: number) {
      this.dailyCap = cap
      void this.persist()
    },

    toggleSelected(id: string) {
      const i = this.selected.indexOf(id)
      if (i >= 0) this.selected.splice(i, 1)
      else this.selected.push(id)
      void this.persist()
    },

    setSelected(ids: string[]) {
      this.selected = [...ids]
      void this.persist()
    },

    clearSelected() {
      this.selected = []
      void this.persist()
    },

    setPresetTopics(ids: string[]) {
      this.presetTopics = [...ids]
      void this.persist()
    },

    reset() {
      this.srs = {}
      this.logs = []
      this.today = 0
      this.todayDate = todayStr()
      this.dailyCap = 5
      this.selected = []
      void this.persist()
    },

    /**
     * 只把「有刷题痕迹」的题写进快照，避免整库 3 MB 撑爆 localStorage 配额；
     * 字段与旧版逐字段一致（v:1），老数据可直接续用。
     */
    snapshot(): ProgressSnapshot {
      const srs: Record<string, SrsEntry> = {}
      for (const [id, entry] of Object.entries(this.srs)) {
        if (!entry.reviewCount && !entry.userNote && !entry.lastRating) continue
        srs[id] = entry
      }
      return {
        v: 1,
        srs,
        logs: this.logs.slice(0, 400),
        today: this.today,
        todayDate: this.todayDate,
        dailyCap: this.dailyCap,
        selected: this.selected,
        presetTopics: this.presetTopics,
      }
    },

    async persist() {
      await adapter.save(this.snapshot())
    },
  },
})

function snapshotIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}
