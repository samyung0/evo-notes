import { useCallback } from 'react';
import { useEditorRef } from 'platejs/react';
import { IconButton, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useVoiceInput } from './useVoiceInput';

/** Mic toggle that dictates into the note at the cursor. Records while active,
 * then inserts the transcript. */
export function VoiceButton() {
  const editor = useEditorRef();
  const insert = useCallback(
    (text: string) => {
      editor.tf.focus();
      editor.tf.insertText(text.trim() + ' ');
    },
    [editor]
  );
  const { recording, busy, toggle } = useVoiceInput(insert);

  if (busy) {
    return (
      <span className="inline-flex size-8 items-center justify-center" title="Transcribing…">
        <Spinner />
      </span>
    );
  }
  return (
    <IconButton
      icon="microphone"
      variant={recording ? 'accent' : 'ghost'}
      size="sm"
      label={recording ? 'Stop recording' : 'Dictate'}
      onClick={toggle}
      className={cn(recording && 'animate-pulse')}
    />
  );
}
