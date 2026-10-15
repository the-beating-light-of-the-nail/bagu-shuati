export interface ToastMsg {
  text: string
  icon: string
  id: number
}

/** 轻量 toast（替代旧版的 #notionToast 单元素实现） */
export function useToast() {
  const toast = useState<ToastMsg | null>('toast', () => null)
  function show(text: string, icon = '✨') {
    toast.value = { text, icon, id: Date.now() }
  }
  return { toast, show }
}
