/* ============================================================
   Assembles the Plate plugin list for the note editor from the user's enabled
   widget groups. Core editing (headings, marks, lists, links, code, images,
   blockquote, hr, markdown) is always present so any stored note renders; the
   optional groups are added on demand and the editor remounts when they change.
   AI plugins (Copilot ghost-text + AI menu) are appended by buildAiPlugins.
   ============================================================ */
import {
  BlockquotePlugin,
  HeadingPlugin,
  HighlightPlugin,
  HorizontalRulePlugin,
  KbdPlugin,
  BasicMarksPlugin,
} from '@platejs/basic-nodes/react';
import {
  BulletedListPlugin,
  ListItemContentPlugin,
  ListItemPlugin,
  ListPlugin,
  NumberedListPlugin,
} from '@platejs/list-classic/react';
import { LinkPlugin } from '@platejs/link/react';
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from '@platejs/code-block/react';
import { ImagePlugin } from '@platejs/media/react';
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react';
import { CalloutPlugin } from '@platejs/callout/react';
import { ColumnItemPlugin, ColumnPlugin } from '@platejs/layout/react';
import { EquationPlugin, InlineEquationPlugin } from '@platejs/math/react';
import { TocPlugin } from '@platejs/toc/react';
import { DatePlugin } from '@platejs/date/react';
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontSizePlugin,
  TextAlignPlugin,
} from '@platejs/basic-styles/react';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { noteMarkdownPlugin } from './markdown';
import {
  FlashcardsElementPlugin,
  MermaidElementPlugin,
  QuizElementPlugin,
} from './blocks/plugins';
import type { WidgetGroupId } from './noteEditorPrefs';

type EnabledMap = Record<WidgetGroupId, boolean>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any;

/** Build the plugin list from the enabled widget groups. */
export function buildPlugins(enabled: EnabledMap): AnyPlugin[] {
  const plugins: AnyPlugin[] = [
    // --- core: always present ---
    HeadingPlugin,
    BlockquotePlugin,
    HorizontalRulePlugin,
    BasicMarksPlugin,
    HighlightPlugin,
    KbdPlugin,
    ListPlugin,
    BulletedListPlugin,
    NumberedListPlugin,
    ListItemPlugin,
    ListItemContentPlugin,
    LinkPlugin,
    CodeBlockPlugin,
    CodeLinePlugin,
    CodeSyntaxPlugin,
    ImagePlugin,
    BlockSelectionPlugin,
    noteMarkdownPlugin,
  ];

  // --- optional widget groups ---
  if (enabled.table)
    plugins.push(TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin);
  if (enabled.callout) plugins.push(CalloutPlugin);
  if (enabled.columns) plugins.push(ColumnPlugin, ColumnItemPlugin);
  if (enabled.math) plugins.push(EquationPlugin, InlineEquationPlugin);
  if (enabled.toc) plugins.push(TocPlugin);
  if (enabled.date) plugins.push(DatePlugin);
  if (enabled.fontStyles)
    plugins.push(FontColorPlugin, FontBackgroundColorPlugin, FontSizePlugin, TextAlignPlugin);
  if (enabled.quiz) plugins.push(QuizElementPlugin);
  if (enabled.flashcards) plugins.push(FlashcardsElementPlugin);
  if (enabled.mermaid) plugins.push(MermaidElementPlugin);

  return plugins;
}
