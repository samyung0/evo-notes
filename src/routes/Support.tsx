import { useState } from 'react';
import { Panel, PageHeader } from '@/components/app/layout';
import { Button, Card, Icon, Text, type IconName } from '@/components/ui';
import { m } from '@/i18n';

const CHANNELS: {
  icon: IconName;
  tint: string;
  tintFg: string;
  title: string;
  body: string;
  action: string;
}[] = [
  {
    icon: 'message',
    tint: 'var(--tint-purple-bg)',
    tintFg: 'var(--tint-purple-fg)',
    title: 'Chat with us',
    body: 'Questions about a workspace, an import, or a quiz? Send a message and the team replies within a day.',
    action: 'Start a chat',
  },
  {
    icon: 'bell',
    tint: 'var(--tint-info-bg)',
    tintFg: 'var(--tint-info-fg)',
    title: 'Email support',
    body: 'Prefer email? Reach us at hello@evonotes.app and we’ll pick it up from there.',
    action: 'Send an email',
  },
  {
    icon: 'book',
    tint: 'var(--tint-green-bg)',
    tintFg: 'var(--tint-green-fg)',
    title: 'Guides & docs',
    body: 'Step-by-step walkthroughs for building workspaces, generating study sets, and tracking progress.',
    action: 'Browse guides',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How are my files turned into summaries and quizzes?',
    a: 'When you add a source, it’s processed into a knowledge base scoped to that workspace. Chat answers and generated summaries, flashcards, and quizzes are grounded only in your own materials.',
  },
  {
    q: 'Who can see my workspaces?',
    a: 'Workspaces are private by default. You can switch one to public or share it with a link from the workspace’s edit menu. Nothing is shared until you choose to.',
  },
  {
    q: 'Can I import from Google Drive or OneDrive?',
    a: 'Yes — open a workspace, choose Add source, and pick a drive. Drive import activates once the backend connection is set up; uploading from your computer works today.',
  },
  {
    q: 'What kinds of quiz questions can I generate?',
    a: 'Multiple choice, multi-select, true/false, fill-in-the-blank, short answer, matching, and ordering — across easy, medium, and hard difficulty. Pick the mix when you generate.',
  },
  {
    q: 'How does the login streak work?',
    a: 'Open Evo Notes on consecutive days to grow your streak, shown at the top of the dashboard. Miss a day and it resets — no penalty beyond starting again.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-divider last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <Text variant="subtitle">{q}</Text>
        <Icon
          name={open ? 'chevronDown' : 'chevronRight'}
          size={18}
          className="shrink-0 text-fg-muted"
        />
      </button>
      {open && (
        <Text variant="body" tone="secondary" className="pb-4">
          {a}
        </Text>
      )}
    </div>
  );
}

export default function Support() {
  return (
    <Panel>
      <PageHeader
        title={m.nav_support()}
        subtitle="Find an answer or reach the team — we’re happy to help."
      />
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((c) => (
              <Card
                key={c.title}
                padding={20}
                radius="card-lg"
                className="flex flex-col"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-card"
                  style={{ background: c.tint, color: c.tintFg }}
                >
                  <Icon name={c.icon} size={20} />
                </span>
                <Text variant="card-title" className="mt-3">
                  {c.title}
                </Text>
                <Text variant="meta" tone="muted" className="mt-1 flex-1">
                  {c.body}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 self-start"
                  iconRight="arrowRight"
                >
                  {c.action}
                </Button>
              </Card>
            ))}
          </section>

          <section>
            <Text variant="section" className="mb-3">
              Frequently asked
            </Text>
            <div className="rounded-card-lg border border-line bg-surface px-5">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </section>

          <section className="flex flex-col items-start gap-3 rounded-card-lg bg-tint-purple px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text variant="subtitle" className="text-tint-purple-fg">
                Still stuck?
              </Text>
              <Text variant="meta" className="mt-1 text-tint-purple-fg/80">
                Send the team a note and we’ll get you unblocked.
              </Text>
            </div>
            <Button variant="accent" iconLeft="message">
              Contact support
            </Button>
          </section>
        </div>
      </div>
    </Panel>
  );
}
