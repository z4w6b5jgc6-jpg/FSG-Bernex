import { ChatPanel } from '../components/ChatPanel'

/** Assistant entraîneur : discussion libre avec l'IA */
export function Assistant() {
  return (
    <div>
      <h1>🤖 Assistant</h1>
      <ChatPanel storageKey="athle-chat-general" />
    </div>
  )
}
