import type {
  ChoiceQuestion,
  CognitiveLevel,
  OrderingQuestion,
  Question,
  QuestionType,
} from '@/api/types';
import { uid } from '@/lib/id';
import {
  parseFlashcardsFenceBody,
  parseQuizFenceBody,
  type FlashcardContent,
  type QuizBlock,
} from './blocks';

export const MATERIAL_SCHEMA_VERSION = 1 as const;

export interface MaterialText {
  text: string;
  [mark: string]: unknown;
}

export interface MaterialElement {
  type: string;
  children: MaterialNode[];
  [property: string]: unknown;
}

export type MaterialNode = MaterialElement | MaterialText;
export type MaterialValue = MaterialElement[];

export interface MaterialDocument {
  schemaVersion: typeof MATERIAL_SCHEMA_VERSION;
  value: MaterialValue;
}

export interface QuizPromptElement extends MaterialElement {
  type: 'quiz_prompt';
  children: MaterialText[];
}

export interface QuizOptionElement extends MaterialElement {
  type: 'quiz_option';
  id: string;
  children: MaterialText[];
}

export interface QuizExplanationElement extends MaterialElement {
  type: 'quiz_explanation';
  children: MaterialText[];
}

export interface QuizQuestionElement extends MaterialElement {
  type: 'quiz_question';
  id: string;
  questionType: QuestionType;
  level: CognitiveLevel;
  correctOptionIds?: string[];
  correctBoolean?: boolean;
  acceptedAnswers?: string[];
  pairs?: { left: string; right: string }[];
  children: (QuizPromptElement | QuizOptionElement | QuizExplanationElement)[];
}

export interface QuizElement extends MaterialElement {
  type: 'quiz';
  id: string;
  timeLimitMin?: number;
  children: QuizQuestionElement[];
}

export interface FlashcardFaceElement extends MaterialElement {
  type: 'flashcard_front' | 'flashcard_back';
  children: MaterialText[];
}

export interface FlashcardElement extends MaterialElement {
  type: 'flashcard';
  id: string;
  children: [FlashcardFaceElement, FlashcardFaceElement];
}

export interface FlashcardsElement extends MaterialElement {
  type: 'flashcards';
  id: string;
  children: FlashcardElement[];
}

export interface MermaidCaptionElement extends MaterialElement {
  type: 'mermaid_caption';
  children: MaterialText[];
}

export interface MermaidElement extends MaterialElement {
  type: 'mermaid';
  id: string;
  source: string;
  children: [MermaidCaptionElement];
}

export type CustomMaterialElement =
  | QuizElement
  | QuizQuestionElement
  | QuizPromptElement
  | QuizOptionElement
  | QuizExplanationElement
  | FlashcardsElement
  | FlashcardElement
  | FlashcardFaceElement
  | MermaidElement
  | MermaidCaptionElement;

const CUSTOM_TYPES = new Set([
  'quiz',
  'quiz_question',
  'quiz_prompt',
  'quiz_option',
  'quiz_explanation',
  'flashcards',
  'flashcard',
  'flashcard_front',
  'flashcard_back',
  'mermaid',
  'mermaid_caption',
]);
const MEDIA_TYPES = new Set(['img', 'image', 'audio', 'video', 'file']);
const QUESTION_TYPES = new Set<QuestionType>([
  'mcq',
  'multi',
  'boolean',
  'fill',
  'short',
  'matching',
  'ordering',
]);
const COGNITIVE_LEVELS = new Set<CognitiveLevel>(['recall', 'application', 'analysis']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasTextDescendant(node: MaterialNode): boolean {
  if ('text' in node) return typeof node.text === 'string';
  return node.children.some(hasTextDescendant);
}

function isTextNode(value: unknown): value is MaterialText {
  return isRecord(value) && typeof value.text === 'string' && !('children' in value);
}

function isElementNode(value: unknown): value is MaterialElement {
  if (
    !isRecord(value) ||
    typeof value.type !== 'string' ||
    !Array.isArray(value.children) ||
    value.children.length === 0
  ) {
    return false;
  }
  return value.children.every(isMaterialNode) && hasTextDescendant(value as MaterialElement);
}

function hasId(value: MaterialElement): boolean {
  return typeof value.id === 'string' && value.id.length > 0;
}

function validateCustomElement(element: MaterialElement): boolean {
  switch (element.type) {
    case 'quiz':
      return (
        hasId(element) &&
        (element.timeLimitMin == null ||
          (typeof element.timeLimitMin === 'number' && element.timeLimitMin > 0)) &&
        element.children.length > 0 &&
        element.children.every((child) => isElementNode(child) && child.type === 'quiz_question')
      );
    case 'quiz_question': {
      const question = element as QuizQuestionElement;
      return (
        hasId(element) &&
        QUESTION_TYPES.has(question.questionType) &&
        COGNITIVE_LEVELS.has(question.level) &&
        element.children.every(
          (child) =>
            isElementNode(child) &&
            ['quiz_prompt', 'quiz_option', 'quiz_explanation'].includes(child.type)
        ) &&
        element.children.some((child) => isElementNode(child) && child.type === 'quiz_prompt')
      );
    }
    case 'quiz_option':
      return hasId(element) && element.children.every(isTextNode);
    case 'flashcard':
      return (
        hasId(element) &&
        element.children.length === 2 &&
        isElementNode(element.children[0]) &&
        element.children[0].type === 'flashcard_front' &&
        isElementNode(element.children[1]) &&
        element.children[1].type === 'flashcard_back'
      );
    case 'quiz_prompt':
    case 'quiz_explanation':
    case 'flashcard_front':
    case 'flashcard_back':
    case 'mermaid_caption':
      return element.children.every(isTextNode);
    case 'flashcards':
      return (
        hasId(element) &&
        element.children.length > 0 &&
        element.children.every((child) => isElementNode(child) && child.type === 'flashcard')
      );
    case 'mermaid':
      return (
        hasId(element) &&
        typeof element.source === 'string' &&
        element.children.length === 1 &&
        isElementNode(element.children[0]) &&
        element.children[0].type === 'mermaid_caption'
      );
    default:
      return true;
  }
}

function validateMediaElement(element: MaterialElement): boolean {
  if (!MEDIA_TYPES.has(element.type)) return true;
  return (
    typeof element.assetId === 'string' &&
    element.assetId.length > 0 &&
    element.url == null &&
    element.src == null
  );
}

export function isMaterialNode(value: unknown): value is MaterialNode {
  if (isTextNode(value)) return true;
  if (!isElementNode(value)) return false;
  if (!validateMediaElement(value)) return false;
  if (CUSTOM_TYPES.has(value.type) && !validateCustomElement(value)) return false;
  return value.children.every(isMaterialNode);
}

export function isMaterialDocument(value: unknown): value is MaterialDocument {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === MATERIAL_SCHEMA_VERSION &&
    Array.isArray(value.value) &&
    value.value.length > 0 &&
    value.value.every((node) => isElementNode(node) && isMaterialNode(node))
  );
}

export function parseMaterialDocument(input: unknown): MaterialDocument | null {
  let candidate = input;
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input);
    } catch {
      return null;
    }
  }
  return isMaterialDocument(candidate) ? candidate : null;
}

export function assertMaterialDocument(input: unknown): MaterialDocument {
  const document = parseMaterialDocument(input);
  if (!document) throw new Error('Invalid or unsupported material document');
  return document;
}

export function createMaterialDocument(value: MaterialValue): MaterialDocument {
  const document: MaterialDocument = {
    schemaVersion: MATERIAL_SCHEMA_VERSION,
    value: normalizeMaterialValue(value),
  };
  return assertMaterialDocument(document);
}

/** Ensure every Plate element has a stable id for drag/drop, comments and
 * suggestions. Existing ids are preserved exactly. */
export function normalizeMaterialValue(value: MaterialValue): MaterialValue {
  const normalizeNode = (node: MaterialNode): MaterialNode => {
    if ('text' in node) return { ...node };
    return {
      ...node,
      id: typeof node.id === 'string' && node.id ? node.id : uid('block'),
      children: node.children.map(normalizeNode),
    };
  };
  return value.map((node) => normalizeNode(node) as MaterialElement);
}

export function emptyMaterialDocument(): MaterialDocument {
  return createMaterialDocument([{ type: 'p', children: [{ text: '' }] }]);
}

export function serializeMaterialDocument(document: MaterialDocument): string {
  return JSON.stringify(assertMaterialDocument(document));
}

function textElement<T extends string>(type: T, text: string): MaterialElement {
  return { type, children: [{ text }] };
}

function optionId(questionId: string, index: number): string {
  return `${questionId}:option:${index + 1}`;
}

function questionOptions(question: Question): {
  options: QuizOptionElement[];
  correctOptionIds?: string[];
} {
  if (question.type === 'mcq' || question.type === 'multi') {
    const choice = question as ChoiceQuestion;
    const options = choice.options.map((option, index) => ({
      ...(textElement('quiz_option', option.value) as QuizOptionElement),
      id: optionId(question.id, index),
      explanation: option.explanation,
    }));
    return {
      options,
      correctOptionIds: choice.correct
        .map((index) => options[index]?.id)
        .filter((id): id is string => Boolean(id)),
    };
  }
  if (question.type === 'boolean') {
    const options = ['True', 'False'].map((text, index) => ({
      ...(textElement('quiz_option', text) as QuizOptionElement),
      id: optionId(question.id, index),
    }));
    return {
      options,
      correctOptionIds: [options[question.correct ? 0 : 1].id],
    };
  }
  if (question.type === 'fill' || question.type === 'short') {
    return {
      options: question.accepted.map((answer, index) => ({
        ...(textElement('quiz_option', answer.value) as QuizOptionElement),
        id: optionId(question.id, index),
        role: 'accepted-answer',
      })),
    };
  }
  if (question.type === 'matching') {
    return {
      options: question.pairs.map((pair, index) => ({
        ...(textElement('quiz_option', `${pair.left} → ${pair.right}`) as QuizOptionElement),
        id: optionId(question.id, index),
        role: 'matching-pair',
      })),
    };
  }
  const ordering = question as OrderingQuestion;
  return {
    options: ordering.items.map((item, index) => ({
      ...(textElement('quiz_option', item.value) as QuizOptionElement),
      id: optionId(question.id, index),
      role: 'ordering-item',
    })),
  };
}

export function quizQuestionNode(question: Question): QuizQuestionElement {
  const { options, correctOptionIds } = questionOptions(question);
  const children: QuizQuestionElement['children'] = [
    textElement('quiz_prompt', question.prompt) as QuizPromptElement,
    ...options,
  ];
  if (question.explanation) {
    children.push(textElement('quiz_explanation', question.explanation) as QuizExplanationElement);
  }

  const node: QuizQuestionElement = {
    type: 'quiz_question',
    id: question.id || uid('question'),
    questionType: question.type,
    level: question.level,
    children,
  };
  if (correctOptionIds?.length) node.correctOptionIds = correctOptionIds;
  if (question.type === 'boolean') node.correctBoolean = question.correct;
  if (question.type === 'fill' || question.type === 'short') {
    node.acceptedAnswers = question.accepted.map((answer) => answer.value);
  }
  if (question.type === 'matching') node.pairs = question.pairs;
  return node;
}

export function quizNode(data: QuizBlock, id = uid('quiz')): QuizElement {
  const questions = data.questions.map(quizQuestionNode);
  if (!questions.length) {
    questions.push(
      quizQuestionNode({
        id: uid('question'),
        type: 'mcq',
        level: 'recall',
        prompt: '',
        options: [{ value: '' }],
        correct: [0],
      })
    );
  }
  return {
    type: 'quiz',
    id,
    ...(data.timeLimitMin == null ? {} : { timeLimitMin: data.timeLimitMin }),
    children: questions,
  };
}

export function quizNodeFromFence(code: string, id?: string): QuizElement {
  return quizNode(parseQuizFenceBody(code), id);
}

export function flashcardsNode(
  cards: FlashcardContent[],
  id = uid('flashcards')
): FlashcardsElement {
  const cardNodes = cards.map<FlashcardElement>((card) => ({
    type: 'flashcard',
    id: card.id || uid('card'),
    children: [
      textElement('flashcard_front', card.front) as FlashcardFaceElement,
      textElement('flashcard_back', card.back) as FlashcardFaceElement,
    ],
  }));
  if (!cardNodes.length) {
    cardNodes.push({
      type: 'flashcard',
      id: uid('card'),
      children: [
        textElement('flashcard_front', '') as FlashcardFaceElement,
        textElement('flashcard_back', '') as FlashcardFaceElement,
      ],
    });
  }
  return { type: 'flashcards', id, children: cardNodes };
}

export function flashcardsNodeFromFence(code: string, id?: string): FlashcardsElement {
  return flashcardsNode(parseFlashcardsFenceBody(code).cards, id);
}

export function mermaidNode(source: string, caption = '', id = uid('mermaid')): MermaidElement {
  return {
    type: 'mermaid',
    id,
    source,
    children: [textElement('mermaid_caption', caption) as MermaidCaptionElement],
  };
}

function nodeText(node: MaterialNode): string {
  if ('text' in node) return typeof node.text === 'string' ? node.text : '';
  return node.children.map(nodeText).join('');
}

export function quizElementToBlock(element: QuizElement): QuizBlock {
  const questions: Question[] = element.children.map((question) => {
    const prompt =
      question.children
        .find((child) => child.type === 'quiz_prompt')
        ?.children.map(nodeText)
        .join('') ?? '';
    const explanation = question.children
      .find((child) => child.type === 'quiz_explanation')
      ?.children.map(nodeText)
      .join('');
    const options = question.children.filter(
      (child): child is QuizOptionElement => child.type === 'quiz_option'
    );
    const base = {
      id: question.id,
      level: question.level,
      prompt,
      ...(explanation ? { explanation } : {}),
    };
    switch (question.questionType) {
      case 'boolean':
        return { ...base, type: 'boolean', correct: question.correctBoolean ?? true };
      case 'fill':
      case 'short':
        return {
          ...base,
          type: question.questionType,
          accepted: (question.acceptedAnswers ?? options.map(nodeText)).map((value) => ({ value })),
        };
      case 'matching':
        return { ...base, type: 'matching', pairs: question.pairs ?? [] };
      case 'ordering':
        return {
          ...base,
          type: 'ordering',
          items: options.map((option) => ({ value: nodeText(option) })),
        };
      case 'multi':
      case 'mcq':
      default:
        return {
          ...base,
          type: question.questionType === 'multi' ? 'multi' : 'mcq',
          options: options.map((option) => ({
            value: nodeText(option),
            ...(typeof option.explanation === 'string' ? { explanation: option.explanation } : {}),
          })),
          correct: (question.correctOptionIds ?? [])
            .map((id) => options.findIndex((option) => option.id === id))
            .filter((index) => index >= 0),
        };
    }
  });
  return {
    questions,
    ...(element.timeLimitMin == null ? {} : { timeLimitMin: element.timeLimitMin }),
  };
}

export function flashcardsElementToCards(element: FlashcardsElement): FlashcardContent[] {
  return element.children.map((card) => ({
    id: card.id,
    front: nodeText(card.children[0] ?? { text: '' }),
    back: nodeText(card.children[1] ?? { text: '' }),
  }));
}

export function isCustomMaterialElement(value: unknown): value is CustomMaterialElement {
  return isElementNode(value) && CUSTOM_TYPES.has(value.type) && validateCustomElement(value);
}
