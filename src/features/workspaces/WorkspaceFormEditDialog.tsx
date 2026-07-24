import { UpdateWorkspaceReq } from '@/api/gen/model';
import { UpdateWorkspaceBody } from '@/api/gen/validators';
import type { Workspace } from '@/api/types';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Input,
  InputError,
  Spinner,
  TagSelect,
  UserColorChooser,
} from '@/components/ui';
import { userToast } from '@/components/ui/userToast';
import { InputTitle } from '@/components/ui/Input';
import { m } from '@/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';

export function WorkspaceFormEditDialog({
  open,
  setOpen,
  workspace,
  onSubmit,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspace: UpdateWorkspaceReq;
  onSubmit: (v: UpdateWorkspaceReq) => Promise<Workspace | void>;
}) {
  const form = useForm<UpdateWorkspaceReq>({
    defaultValues: {
      name: workspace.name,
      color: workspace.color,
      tags: workspace.tags,
    },
    resolver: zodResolver(UpdateWorkspaceBody),
  });

  const submitDisabled =
    !form.formState.isDirty || !form.formState.isValid || form.formState.isSubmitting;

  const handleSubmit = useCallback(
    async (v: UpdateWorkspaceReq) => {
      try {
        await onSubmit(v);
        setOpen(false);
      } catch (err) {
        // Keep the dialog open so the user can retry without losing input.
        userToast({
          title: 'Could not save workspace',
          description:
            err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          variant: 'error',
        });
      }
    },
    [onSubmit, setOpen, workspace]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector('input')?.focus();
        }}
        className="top-1/2 -translate-y-1/2"
        showCloseButton={true}
      >
        {/* TODO: i18n */}
        <DialogTitle>{'Edit Workspace'}</DialogTitle>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-5">
          <Controller
            name={'name'}
            control={form.control}
            render={({ field, fieldState }) => {
              return (
                <>
                  <label className="flex flex-col gap-1.5">
                    <InputTitle required>Chapter</InputTitle>
                    <Input
                      {...field}
                      placeholder="Workspace name"
                      autoFocus
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      required
                    />
                    {fieldState.invalid && <InputError errors={[fieldState.error]} />}
                  </label>
                </>
              );
            }}
          />
          <Controller
            name={'tags'}
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <InputTitle>Tags</InputTitle>
                <TagSelect
                  kind="workspace"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                {fieldState.invalid && <InputError errors={[fieldState.error]} />}
              </div>
            )}
          />
          <Controller
            name={'color'}
            control={form.control}
            render={({ field, fieldState }) => {
              return (
                <>
                  <div className="flex flex-col gap-1.5">
                    <InputTitle>Color</InputTitle>
                    <UserColorChooser
                      selected={field.value}
                      onChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <InputError errors={[fieldState.error]} />}
                  </div>
                </>
              );
            }}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost-hover" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={submitDisabled}>
              {!form.formState.isSubmitting && <span>{m.action_save()}</span>}
              {form.formState.isSubmitting && (
                <span>
                  <Spinner />
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
