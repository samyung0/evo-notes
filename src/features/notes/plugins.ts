import {
  BlockquoteRules,
  BoldRules,
  CodeRules,
  HeadingRules,
  HighlightRules,
  HorizontalRuleRules,
  ItalicRules,
  MarkComboRules,
  StrikethroughRules,
  SubscriptRules,
  SuperscriptRules,
  UnderlineRules,
} from '@platejs/basic-nodes';
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HighlightPlugin,
  HorizontalRulePlugin,
  ItalicPlugin,
  KbdPlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react';
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontFamilyPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
} from '@platejs/basic-styles/react';
import { CalloutPlugin } from '@platejs/callout/react';
import { CaptionPlugin } from '@platejs/caption/react';
import { CodeBlockRules } from '@platejs/code-block';
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from '@platejs/code-block/react';
import { DatePlugin } from '@platejs/date/react';
import { DndPlugin } from '@platejs/dnd';
import { DocxPlugin } from '@platejs/docx';
import { IndentPlugin } from '@platejs/indent/react';
import { JuicePlugin } from '@platejs/juice';
import { ColumnItemPlugin, ColumnPlugin } from '@platejs/layout/react';
import { LinkRules } from '@platejs/link';
import { LinkPlugin } from '@platejs/link/react';
import { BulletedListRules, isOrderedList, OrderedListRules, TaskListRules } from '@platejs/list';
import { ListPlugin } from '@platejs/list/react';
import { MathRules } from '@platejs/math';
import { EquationPlugin, InlineEquationPlugin } from '@platejs/math/react';
import {
  AudioPlugin,
  FilePlugin,
  ImagePlugin,
  PlaceholderPlugin,
  VideoPlugin,
} from '@platejs/media/react';
import { MentionInputPlugin, MentionPlugin } from '@platejs/mention/react';
import { BlockMenuPlugin, BlockSelectionPlugin } from '@platejs/selection/react';
import { SlashInputPlugin, SlashPlugin } from '@platejs/slash-command/react';
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react';
import { TocPlugin } from '@platejs/toc/react';
import { common, createLowlight } from 'lowlight';
import {
  createSlatePlugin,
  createTextSubstitutionInputRule,
  ExitBreakPlugin,
  KEYS,
  TrailingBlockPlugin,
  type SlateEditor,
} from 'platejs';
import { BlockPlaceholderPlugin, ParagraphPlugin, type RenderNodeWrapper } from 'platejs/react';
import { createElement } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { customBlockPlugins } from './blocks/plugins';
import { BlockContextMenu, BlockDraggable } from './BlockInteractions';
import { buildCollaborationPlugins, type EditorCollaborationOptions } from './Collaboration';
import { MediaPlaceholderElement } from './MediaNodes';
import { MentionInputElement } from './MentionInput';
import { SlashInputElement } from './SlashInput';
import { buildAiPlugins } from './ai/PlateAi';
import { noteMarkdownPlugin } from './markdown';

// Plugin-derived editor types are intentionally wider than Plate's base tuple.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any;

// `common` (~35 languages) instead of `all`: the full highlight.js language set
// is roughly a megabyte of grammars that almost no document uses.
const lowlight = createLowlight(common);
const listTargets = [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.codeBlock, KEYS.img];

const IndentListKit = [
  IndentPlugin.configure({
    inject: { targetPlugins: listTargets },
    options: { offset: 24 },
  }),
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown({ variant: '-' }),
      BulletedListRules.markdown({ variant: '*' }),
      OrderedListRules.markdown({ variant: '.' }),
      OrderedListRules.markdown({ variant: ')' }),
      TaskListRules.markdown({ checked: false }),
      TaskListRules.markdown({ checked: true }),
    ],
    inject: {
      nodeProps: {
        nodeKey: KEYS.listType,
        query: ({ nodeProps }) => {
          const element = nodeProps.element;
          return Boolean(element?.listStyleType) && !!element && !isOrderedList(element);
        },
        transformProps: ({ props }) => ({
          ...props,
          role: 'listitem',
          style: { ...props.style, display: 'list-item' },
        }),
      },
      targetPlugins: listTargets,
    },
    render: {
      belowNodes: ((props) => {
        if (!props.element.listStyleType || !isOrderedList(props.element)) return;
        return (nextProps) => {
          const element = nextProps.element as {
            indent?: number;
            listStart?: number;
            listStyleType?: string;
          };
          return createElement(
            'ol',
            {
              className: 'relative my-1 ml-6 p-0',
              start: element.listStart,
              style: {
                listStyleType: element.listStyleType,
                marginLeft: element.indent ? `${element.indent * 24}px` : undefined,
              },
            },
            createElement('li', null, nextProps.children)
          );
        };
      }) as RenderNodeWrapper,
    },
  }),
];

const BasicBlocksKit = [
  ParagraphPlugin,
  H1Plugin.configure({
    inputRules: [HeadingRules.markdown()],
    rules: { break: { empty: 'reset' } },
    shortcuts: { toggle: { keys: 'mod+alt+1' } },
  }),
  H2Plugin.configure({
    inputRules: [HeadingRules.markdown()],
    rules: { break: { empty: 'reset' } },
    shortcuts: { toggle: { keys: 'mod+alt+2' } },
  }),
  H3Plugin.configure({
    inputRules: [HeadingRules.markdown()],
    rules: { break: { empty: 'reset' } },
    shortcuts: { toggle: { keys: 'mod+alt+3' } },
  }),
  H4Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  H5Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  H6Plugin.configure({ inputRules: [HeadingRules.markdown()] }),
  BlockquotePlugin.configure({
    inputRules: [BlockquoteRules.markdown()],
    shortcuts: { toggle: { keys: 'mod+shift+period' } },
  }),
  HorizontalRulePlugin.configure({
    inputRules: [
      HorizontalRuleRules.markdown({ variant: '-' }),
      HorizontalRuleRules.markdown({ variant: '_' }),
    ],
  }),
];

const BasicMarksKit = [
  BoldPlugin.configure({
    inputRules: [
      BoldRules.markdown({ variant: '*' }),
      BoldRules.markdown({ variant: '_' }),
      MarkComboRules.markdown({ variant: 'boldItalic' }),
      MarkComboRules.markdown({ variant: 'boldUnderline' }),
      MarkComboRules.markdown({ variant: 'boldItalicUnderline' }),
      MarkComboRules.markdown({ variant: 'italicUnderline' }),
    ],
  }),
  ItalicPlugin.configure({
    inputRules: [ItalicRules.markdown({ variant: '*' }), ItalicRules.markdown({ variant: '_' })],
  }),
  UnderlinePlugin.configure({ inputRules: [UnderlineRules.markdown()] }),
  CodePlugin.configure({
    inputRules: [CodeRules.markdown()],
    shortcuts: { toggle: { keys: 'mod+e' } },
  }),
  StrikethroughPlugin.configure({
    inputRules: [StrikethroughRules.markdown()],
    shortcuts: { toggle: { keys: 'mod+shift+x' } },
  }),
  SubscriptPlugin.configure({
    inputRules: [SubscriptRules.markdown()],
    shortcuts: { toggle: { keys: 'mod+comma' } },
  }),
  SuperscriptPlugin.configure({
    inputRules: [SuperscriptRules.markdown()],
    shortcuts: { toggle: { keys: 'mod+period' } },
  }),
  HighlightPlugin.configure({
    inputRules: [
      HighlightRules.markdown({ variant: '==' }),
      HighlightRules.markdown({ variant: '≡' }),
    ],
    shortcuts: { toggle: { keys: 'mod+shift+h' } },
  }),
  KbdPlugin,
];

const AutoformatPlugin = createSlatePlugin({
  key: 'evo-autoformat',
  inputRules: [
    createTextSubstitutionInputRule({
      enabled: ({ editor }) =>
        !editor.api.some({ match: { type: editor.getType(KEYS.codeBlock) } }),
      patterns: [
        { format: '→', match: '->' },
        { format: '←', match: '<-' },
        { format: '⇒', match: '=>' },
        { format: '≥', match: '>=' },
        { format: '≤', match: '<=' },
        { format: '≠', match: '!=' },
        { format: '≈', match: '~=' },
        { format: '½', match: '1/2' },
        { format: '⅓', match: '1/3' },
        { format: '¼', match: '1/4' },
        { format: '™', match: ['(tm)', '(TM)'] },
        { format: '®', match: ['(r)', '(R)'] },
        { format: '©', match: ['(c)', '(C)'] },
        { format: '±', match: '+-' },
        { format: ['“', '”'], match: '"' },
        { format: ['‘', '’'], match: "'" },
        { format: '²', match: '^2' },
        { format: '³', match: '^3' },
        { format: '₁', match: '~1' },
        { format: '₂', match: '~2' },
      ],
    }),
  ],
});

const SlashKit = [
  SlashPlugin.configure({
    options: {
      triggerQuery: (editor: SlateEditor) =>
        !editor.api.some({ match: { type: editor.getType(KEYS.codeBlock) } }),
    },
  }),
  SlashInputPlugin.withComponent(SlashInputElement),
];

const MediaKit = [
  ImagePlugin.configure({ options: { disableUploadInsert: true } }),
  VideoPlugin,
  AudioPlugin,
  FilePlugin,
  PlaceholderPlugin.configure({
    options: { disableEmptyPlaceholder: true },
    render: { node: MediaPlaceholderElement },
  }),
  CaptionPlugin.configure({
    options: { query: { allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file] } },
  }),
];

const BlockInteractionKit = [
  BlockSelectionPlugin.configure(({ editor }) => ({
    options: {
      enableContextMenu: true,
      isSelectable: (element) =>
        ![
          editor.getType(KEYS.column),
          editor.getType(KEYS.codeLine),
          editor.getType(KEYS.td),
        ].includes(element.type),
    },
  })),
  BlockMenuPlugin.configure({ render: { aboveEditable: BlockContextMenu } }),
  DndPlugin.configure({
    options: {
      enableScroller: true,
      onDropFiles: ({ dragItem, editor, target }) =>
        editor.getTransforms(PlaceholderPlugin).insert.media(dragItem.files, {
          at: target,
          nextBlock: false,
        }),
    },
    render: {
      aboveNodes: BlockDraggable,
      aboveSlate: ({ children }) => createElement(DndProvider, { backend: HTML5Backend }, children),
    },
  }),
];

/** Plugins needed by both interactive and static universal document surfaces. */
export const MaterialKit: AnyPlugin[] = [
  ...BasicBlocksKit,
  ...BasicMarksKit,
  ...IndentListKit,
  LinkPlugin.configure({
    inputRules: [
      LinkRules.markdown(),
      LinkRules.autolink({ variant: 'paste' }),
      LinkRules.autolink({ variant: 'space' }),
      LinkRules.autolink({ variant: 'break' }),
    ],
  }),
  CodeBlockPlugin.configure({
    inputRules: [CodeBlockRules.markdown({ on: 'match' })],
    options: { lowlight },
    shortcuts: { toggle: { keys: 'mod+alt+8' } },
  }),
  CodeLinePlugin,
  CodeSyntaxPlugin,
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
  TocPlugin,
  ...MediaKit,
  CalloutPlugin,
  ColumnPlugin,
  ColumnItemPlugin,
  InlineEquationPlugin.configure({ inputRules: [MathRules.markdown({ variant: '$' })] }),
  EquationPlugin.configure({ inputRules: [MathRules.markdown({ on: 'break', variant: '$$' })] }),
  DatePlugin,
  MentionPlugin.configure({ options: { triggerPreviousCharPattern: /^$|^[\s"']$/ } }),
  MentionInputPlugin.withComponent(MentionInputElement),
  FontColorPlugin.configure({ inject: { targetPlugins: [KEYS.p] } }),
  FontBackgroundColorPlugin.configure({ inject: { targetPlugins: [KEYS.p] } }),
  FontSizePlugin.configure({ inject: { targetPlugins: [KEYS.p] } }),
  FontFamilyPlugin.configure({ inject: { targetPlugins: [KEYS.p] } }),
  TextAlignPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: 'start',
        nodeKey: 'align',
        styleKey: 'textAlign',
        validNodeValues: ['start', 'left', 'center', 'right', 'end', 'justify'],
      },
      targetPlugins: [...KEYS.heading, KEYS.p, KEYS.img],
    },
  }),
  LineHeightPlugin.configure({
    inject: {
      nodeProps: { defaultNodeValue: 1.5, validNodeValues: [1, 1.2, 1.5, 2, 3] },
      targetPlugins: [...KEYS.heading, KEYS.p],
    },
  }),
  ...customBlockPlugins,
  DocxPlugin,
  JuicePlugin,
  noteMarkdownPlugin,
];

export interface BuildPluginsOptions extends EditorCollaborationOptions {
  workspaceId: string;
}

/** Full playground registry. Preferences filter commands only; no document
 * parser or renderer plugin is ever unloaded. */
export function buildPlugins(options: BuildPluginsOptions): AnyPlugin[] {
  return [
    ...buildAiPlugins(options.workspaceId),
    ...MaterialKit,
    ...buildCollaborationPlugins(options),
    ...SlashKit,
    AutoformatPlugin,
    ...BlockInteractionKit,
    ExitBreakPlugin.configure({
      shortcuts: {
        insert: { keys: 'mod+enter' },
        insertBefore: { keys: 'mod+shift+enter' },
      },
    }),
    TrailingBlockPlugin,
    BlockPlaceholderPlugin.configure({
      options: {
        className:
          'before:absolute before:cursor-text before:text-placeholder before:content-[attr(placeholder)]',
        placeholders: { [KEYS.p]: 'Type / for commands' },
        query: ({ path }) => path.length === 1,
      },
    }),
  ];
}
