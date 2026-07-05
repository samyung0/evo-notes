import { useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';
import { Button, Icon, IconButton, Menu, Spinner } from '@/components/ui';
import { useConversations, useDeleteConversation, useMessages } from '@/api/hooks';
import { useChatStream, toChatMessage } from './useChatStream';
import type { ChatMessage } from '@/api/types';
import { m } from '@/i18n';

function Citations({ msg }: { msg: ChatMessage }) {
  if (!msg.citations?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {msg.citations.map((c) => (
        <span
          key={c.fileId}
          title={c.snippet}
          className="inline-flex items-center gap-1 rounded-pill bg-tint-info px-2 py-0.5 text-[11px] font-medium text-tint-info-fg"
        >
          <Icon name="files" size={12} /> {c.fileName}
        </span>
      ))}
    </div>
  );
}

function AssistantBubble({ msg, streaming }: { msg: ChatMessage; streaming: boolean }) {
  const empty = !msg.content;
  return (
    <div className="mr-auto max-w-[92%] rounded-[14px] rounded-tl-[4px] border border-line bg-surface px-3.5 py-2.5 text-sm text-fg">
      {empty && streaming ? (
        <Spinner />
      ) : (
        <div className="streamdown-body max-w-none text-sm leading-relaxed [&_pre]:my-2 [&_p]:my-1.5">
          <Streamdown>{msg.content}</Streamdown>
        </div>
      )}
      {msg.status === 'aborted' && (
        <p className="mt-1 text-[11px] text-fg-muted italic">Stopped.</p>
      )}
      <Citations msg={msg} />
    </div>
  );
}

export function ChatPanel({ workspaceId }: { workspaceId: string }) {
  const { messages, conversationId, streaming, send, stop, startNew, hydrate } =
    useChatStream(workspaceId);
  const { data: conversations } = useConversations(workspaceId);
  const deleteConv = useDeleteConversation(workspaceId);

  const [text, setText] = useState('');
  const [selectId, setSelectId] = useState<string | null>(null);
  const { data: history } = useMessages(selectId);
  const hydratedRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed local state when a previously-saved conversation is opened.
  useEffect(() => {
    if (selectId && history && hydratedRef.current !== selectId) {
      hydratedRef.current = selectId;
      hydrate(selectId, history.map(toChatMessage));
    }
  }, [selectId, history, hydrate]);

  // Keep the newest message in view as tokens stream in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setText('');
    void send(trimmed);
  }

  function openNew() {
    hydratedRef.current = null;
    setSelectId(null);
    startNew();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-divider px-3 py-2">
        <Menu
          align="start"
          items={
            conversations?.length
              ? conversations.map((c) => ({
                  label: c.title || 'Untitled chat',
                  icon: 'message' as const,
                  onClick: () => {
                    hydratedRef.current = null;
                    setSelectId(c.id);
                  },
                }))
              : [{ label: 'No conversations yet', disabled: true }]
          }
          trigger={
            <button className="inline-flex items-center gap-1 rounded-row px-2 py-1 text-sm font-semibold text-fg-secondary hover:bg-surface-hover-bg">
              <Icon name="clock" size={15} /> History <Icon name="chevronDown" size={13} />
            </button>
          }
        />
        <div className="flex items-center gap-1">
          {conversationId && (
            <IconButton
              icon="trash"
              variant="ghost-hover"
              size="sm"
              label="Delete conversation"
              onClick={() => {
                deleteConv.mutate(conversationId);
                openNew();
              }}
            />
          )}
          <Button variant="outline" size="sm" onClick={openNew}>
            <Icon name="plus" size={14} /> New
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
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
              className="ml-auto max-w-[85%] rounded-[14px] rounded-tr-[4px] bg-action px-3.5 py-2.5 text-sm whitespace-pre-wrap text-action-fg"
            >
              {msg.content}
            </div>
          ) : (
            <AssistantBubble key={msg.id} msg={msg} streaming={streaming} />
          )
        )}
      </div>

      <div className="border-t border-divider p-3">
        <div className="flex items-center gap-2 rounded-row border border-line bg-surface px-3 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={m.chat_placeholder()}
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-fg outline-none placeholder:text-placeholder"
          />
          {streaming ? (
            <IconButton icon="x" variant="dark" size="sm" onClick={stop} label="Stop" />
          ) : (
            <IconButton icon="send" variant="dark" size="sm" onClick={submit} label="Send" />
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-fg-muted">{m.chat_grounded()}</p>
      </div>
    </div>
  );
}
