import { useEffect, useRef, useState } from 'react'
import { NotiApi } from '../services/api'

type Noti = { id: string; questionId: string; title: string; createdAt: number; read: boolean }

export default function useNotifications() {
  const [unread, setUnread] = useState<Noti[]>([])
  const timer = useRef<number | null>(null)
  const fetchNoti = async () => {
    try {
      const data = await NotiApi.unreadAnswers()
      setUnread(data.items as Noti[])
    } catch {}
  }
  useEffect(() => {
    fetchNoti()
    timer.current = window.setInterval(fetchNoti, 30000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [])
  const markRead = async (id: string) => {
    try { await NotiApi.markRead(id) } catch {}
    setUnread(prev => prev.filter(i => i.id !== id))
  }
  return { unread, count: unread.length, markRead }
}
