import { useEffect, useRef, useState } from 'react'
import { AnnApi, NotiApi } from '../services/api'

type Message = { 
  id: string; 
  type: 'answer' | 'announcement'; 
  title: string; 
  createdAt: number; 
  read: boolean; 
  questionId?: string; 
  severity?: string;
  pinned?: boolean;
}

export default function useNotifications() {
  const [unread, setUnread] = useState<Message[]>([])
  const timer = useRef<number | null>(null)
  const fetchMessages = async () => {
    try {
      const ans = await NotiApi.unreadAnswers().catch(() => ({ items: [] }))
      const anns = await AnnApi.list({ status: 'unread', page: 1, pageSize: 20 }).catch(() => ({ items: [] }))
      const a1 = (ans.items || []).map((n: any) => ({
        id: String(n.id),
        type: 'answer' as const,
        title: n.title,
        createdAt: Number(n.createdAt || Date.now()),
        read: Boolean(n.read),
        questionId: String(n.questionId || '')
      }))
      const items = (anns.items || anns.Data?.items || []).map((x: any) => ({
        id: String(x.id),
        type: 'announcement' as const,
        title: x.title,
        createdAt: new Date(x.publishAt).getTime(),
        read: Boolean(x.read),
        severity: String(x.severity || 'NORMAL'),
        pinned: Boolean(x.pinned)
      }))
      const merged: Message[] = [...a1, ...items].filter(Boolean)
      merged.sort((a, b) => {
        const ap = a.type === 'announcement' && a.pinned
        const bp = b.type === 'announcement' && b.pinned
        if (ap !== bp) return ap ? -1 : 1
        return b.createdAt - a.createdAt
      })
      setUnread(merged)
    } catch {}
  }
  useEffect(() => {
    fetchMessages()
    timer.current = window.setInterval(fetchMessages, 15000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [])
  const markRead = async (msg: Message) => {
    try { 
      if (msg.type === 'answer') {
        await NotiApi.markRead(msg.id)
      } else {
        await AnnApi.markRead(msg.id)
      }
    } catch {}
    setUnread(prev => prev.filter(i => i.id !== msg.id))
  }
  return { unread, count: unread.length, markRead }
}
