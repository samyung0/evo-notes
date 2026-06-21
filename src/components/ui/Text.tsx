import type { ElementType, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant =
  | 'display'
  | 'page-title'
  | 'section'
  | 'card-title'
  | 'subtitle'
  | 'body'
  | 'meta'
  | 'label';
type Tone = 'primary' | 'secondary' | 'muted' | 'link' | 'inherit';

const VARIANT_CLASS: Record<Variant, string> = {
  display: 't-display',
  'page-title': 't-page-title',
  section: 't-section',
  'card-title': 't-card-title',
  subtitle: 't-subtitle',
  body: 't-body',
  meta: 't-meta',
  label: 't-label',
};

const TONE_CLASS: Record<Tone, string> = {
  primary: 'text-fg',
  secondary: 'text-fg-soft',
  muted: 'text-fg-muted',
  link: 'text-link',
  inherit: '',
};

const DEFAULT_TAG: Record<Variant, ElementType> = {
  display: 'h1',
  'page-title': 'h1',
  section: 'h2',
  'card-title': 'h3',
  subtitle: 'h4',
  body: 'p',
  meta: 'span',
  label: 'span',
};

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: Variant;
  tone?: Tone;
  as?: ElementType;
}

export function Text({ variant = 'body', tone = 'primary', as, className, children, ...rest }: TextProps) {
  const Tag = (as ?? DEFAULT_TAG[variant]) as ElementType;
  return (
    <Tag className={cn(VARIANT_CLASS[variant], TONE_CLASS[tone], 'm-0', className)} {...rest}>
      {children}
    </Tag>
  );
}
