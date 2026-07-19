import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { QuizDialog } from './QuizDialog';
import { FlashcardsDialog } from './FlashcardsDialog';

type SaveFn = (code: string) => void;

export interface NoteBlockDialogsApi {
  openQuiz: (initialCode: string | undefined, onSave: SaveFn) => void;
  openFlashcards: (initialCode: string | undefined, onSave: SaveFn) => void;
}

const Ctx = createContext<NoteBlockDialogsApi | null>(null);

/**
 * Module-level handle for the mounted provider. Plate inline nodes (slash input)
 * sit under PlateContent and can miss React context after HMR or when rendered
 * through Plate's element pipeline; the editor store still works, so callers
 * fall back here while a NoteEditor is mounted.
 */
let mountedDialogsApi: NoteBlockDialogsApi | null = null;

/** Hosts the quiz/flashcards authoring popups and exposes imperative openers.
 * Used both for inserting new blocks (toolbar/slash) and editing existing ones
 * (block element "Edit" button). */
export function NoteBlockDialogsProvider({ children }: { children: React.ReactNode }) {
  const [quiz, setQuiz] = useState<{ code?: string } | null>(null);
  const [flash, setFlash] = useState<{ code?: string } | null>(null);
  const saveRef = useRef<SaveFn>(() => {});

  const openQuiz = useCallback((initialCode: string | undefined, onSave: SaveFn) => {
    saveRef.current = onSave;
    setQuiz({ code: initialCode });
  }, []);
  const openFlashcards = useCallback((initialCode: string | undefined, onSave: SaveFn) => {
    saveRef.current = onSave;
    setFlash({ code: initialCode });
  }, []);

  const api = useMemo<NoteBlockDialogsApi>(
    () => ({ openQuiz, openFlashcards }),
    [openQuiz, openFlashcards]
  );

  useEffect(() => {
    mountedDialogsApi = api;
    return () => {
      if (mountedDialogsApi === api) mountedDialogsApi = null;
    };
  }, [api]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <QuizDialog
        open={!!quiz}
        initialCode={quiz?.code}
        onClose={() => setQuiz(null)}
        onSave={(code) => {
          saveRef.current(code);
          setQuiz(null);
        }}
      />
      <FlashcardsDialog
        open={!!flash}
        initialCode={flash?.code}
        onClose={() => setFlash(null)}
        onSave={(code) => {
          saveRef.current(code);
          setFlash(null);
        }}
      />
    </Ctx.Provider>
  );
}

function useResolvedDialogs(): NoteBlockDialogsApi | null {
  return useContext(Ctx) ?? mountedDialogsApi;
}

export function useNoteBlockDialogs(): NoteBlockDialogsApi {
  const ctx = useResolvedDialogs();
  if (!ctx) throw new Error('useNoteBlockDialogs must be used within NoteBlockDialogsProvider');
  return ctx;
}

/** Static material renderers do not mount authoring dialogs. */
export function useOptionalNoteBlockDialogs(): NoteBlockDialogsApi | null {
  return useResolvedDialogs();
}
