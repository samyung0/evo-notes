import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { QuizDialog } from './QuizDialog';
import { FlashcardsDialog } from './FlashcardsDialog';

type SaveFn = (code: string) => void;

interface NoteBlockDialogsApi {
  openQuiz: (initialCode: string | undefined, onSave: SaveFn) => void;
  openFlashcards: (initialCode: string | undefined, onSave: SaveFn) => void;
}

const Ctx = createContext<NoteBlockDialogsApi | null>(null);

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

  const api = useMemo<NoteBlockDialogsApi>(() => ({ openQuiz, openFlashcards }), [openQuiz, openFlashcards]);

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

export function useNoteBlockDialogs(): NoteBlockDialogsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNoteBlockDialogs must be used within NoteBlockDialogsProvider');
  return ctx;
}
