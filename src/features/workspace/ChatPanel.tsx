import { useState } from 'react';
import { Icon, IconButton, Spinner } from '@/components/ui';
import { useChat } from '@/api/hooks';
import type { ChatMessage } from '@/api/types';
import { m } from '@/i18n';

export function ChatPanel({ workspaceId }: { workspaceId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const chat = useChat(workspaceId);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setText('');
    chat.mutate(trimmed, {
      onSuccess: (reply) => setMessages((prev) => [...prev, reply]),
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        {!messages.length && (
          <div className="m-auto max-w-[80%] text-center text-fg-muted">
            <Icon name="message" size={26} className="mx-auto mb-2" />
            <p className="text-sm">Ask anything about your sources.</p>
          </div>
        )}
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div
              key={msg.id}
              className="ml-auto max-w-[85%] rounded-[14px] rounded-tr-[4px] bg-action px-3.5 py-2.5 text-sm text-action-fg"
            >
              {msg.text}
            </div>
          ) : (
            <div
              key={msg.id}
              className="mr-auto max-w-[90%] rounded-[14px] rounded-tl-[4px] border border-line bg-surface px-3.5 py-2.5 text-sm text-fg"
            >
              <p className="m-0">{msg.text}</p>
              {msg.citations && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.citations.map((c) => (
                    <span
                      key={c.fileId}
                      className="inline-flex items-center gap-1 rounded-pill bg-tint-info px-2 py-0.5 text-[11px] font-medium text-tint-info-fg"
                    >
                      <Icon name="files" size={12} /> {c.fileName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {chat.isPending && (
          <div className="mr-auto">
            <Spinner />
          </div>
        )}
      </div>

      <div className="border-t border-divider p-3">
        <div className="flex items-center gap-2 rounded-row border border-line bg-surface px-3 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={m.chat_placeholder()}
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-fg outline-none placeholder:text-placeholder"
          />
          <IconButton icon="send" variant="dark" size="sm" onClick={send} label="Send" />
        </div>
        <p className="mt-2 text-center text-[11px] text-fg-muted">{m.chat_grounded()}</p>
      </div>
    </div>
  );
}
