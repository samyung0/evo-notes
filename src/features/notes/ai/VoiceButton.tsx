import { useCallback } from 'react';
import { useEditorRef } from 'platejs/react';
import { IconButton, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useVoiceInput } from './useVoiceInput';
import { ToolbarButton } from '../ToolBarButton';
import { Mic } from 'lucide-react';

/** Mic toggle that dictates into the note at the cursor. Records while active, then save as audio file */
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
      <span className="inline-flex size-8 items-center justify-center" title="Saving Audio...">
        <Spinner />
      </span>
    );
  }
  return (
    <ToolbarButton
      label={recording ? 'Stop recording' : 'Dictate'}
      onClick={toggle}
      active={recording}
      className={cn('p-0', recording && 'animate-pulse bg-tint-accent-1/70')}
    >
      <Mic />
    </ToolbarButton>
  );
}
