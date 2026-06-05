import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { getMyMessages, sendMessage, type MessageAPI } from '../services/api'

interface MessageThreadProps {
  processCode: string
  stepNumber: number
  studentView?: boolean
}

export function MessageThread({ processCode, stepNumber, studentView = true }: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageAPI[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const data = await getMyMessages()
      // Filter by process + step if desired, or show all
      setMessages(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [processCode, stepNumber])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(processCode, stepNumber, text.trim())
      setText('')
      await load()
    } catch {
      // silently fail
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <MessageSquare size={20} className="text-content-tertiary mb-2" />
          <p className="text-xs text-content-tertiary">Sin mensajes en este paso</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {messages.map((m) => {
            const isMe = studentView ? m.sender_type === 'student' : m.sender_type === 'admin'
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isMe ? 'bg-primary-100 text-primary-900' : 'bg-gray-100 text-content-primary'
                  }`}
                >
                  <p className="text-xs font-medium mb-0.5 text-content-secondary">{m.sender_name}</p>
                  <p className="text-sm">{m.message}</p>
                  <p className="text-xs text-content-tertiary mt-0.5 text-right">
                    {new Date(m.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {studentView && (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3 py-1.5 text-sm rounded-input border border-surface-border
                       text-content-primary placeholder:text-content-tertiary
                       focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                       transition-all duration-150"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                       text-white rounded-button transition-colors duration-150 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  )
}
