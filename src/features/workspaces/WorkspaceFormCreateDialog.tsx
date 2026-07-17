import { CreateWorkspaceBody } from '@/api/gen/validators';
import type { CreateWorkspaceReq } from '@/api/gen/model';
import type { Privacy, Workspace } from '@/api/types';
import type { IconName } from '@/components/ui';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Icon,
  Input,
  InputError,
  Spinner,
  TagSelect,
  userToast,
  UserColorChooser,
} from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { m } from '@/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { InputTitle } from '@/components/ui/Input';

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: IconName }[] = [
  { value: 'private', label: 'Private', icon: 'lock' },
  { value: 'public', label: 'Public', icon: 'globe' },
  { value: 'link', label: 'Shared link', icon: 'link' },
];

export function WorkspaceFormCreateDialog({
  open,
  setOpen,
  workspace,
  onSubmit,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspace: CreateWorkspaceReq;
  onSubmit: (v: CreateWorkspaceReq) => Promise<Workspace | void>;
}) {
  const form = useForm<CreateWorkspaceReq>({
    defaultValues: workspace,
    resolver: zodResolver(CreateWorkspaceBody),
  });

  const handleSubmit = useCallback(
    async (v: CreateWorkspaceReq) => {
      if (!v) return;
      try {
        await onSubmit(v);
        setOpen(false);
        userToast({
          title: 'Workspace created',
          description: workspace
            ? 'Workspace saved successfully'
            : 'Workspace created successfully',
          button: { label: 'Dismiss', onClick: () => {} },
        });
      } catch (err) {
        // Keep the dialog open so the user can retry without losing input.
        userToast({
          title: 'Could not create workspace',
          description:
            err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          button: { label: 'Dismiss', onClick: () => {} },
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
        showCloseButton={true}
      >
        {/* TODO: i18n */}
        <DialogTitle>{'Create Workspace'}</DialogTitle>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-5">
          <Controller
            name={'name'}
            control={form.control}
            render={({ field, fieldState }) => {
              return (
                <>
                  <label className="flex flex-col gap-1.5">
                    <InputTitle required>Name</InputTitle>
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
            name={'privacy'}
            control={form.control}
            render={({ field, fieldState }) => {
              return (
                <>
                  <div className="flex min-w-full items-center justify-between gap-1.5">
                    <InputTitle required>Visibility</InputTitle>
                    <PrivacySelect
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <InputError errors={[fieldState.error]} />}
                  </div>
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
          <DialogFooter className="pt-12">
            <DialogClose asChild>
              <Button variant="ghost-hover" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={!form.formState.isDirty}>
              {!form.formState.isSubmitting && <span>{m.action_create()}</span>}
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

function PrivacySelect({ value, onChange }: { value: Privacy; onChange: (v: Privacy) => void }) {
  const current = PRIVACY_OPTIONS.find((o) => o.value === value) ?? PRIVACY_OPTIONS[0]; // todo
  return (
    // todo tanstack form
    <div className="max-w-70 min-w-45">
      <Select defaultValue={current.value} onValueChange={(v) => onChange(v as Privacy)}>
        <SelectTrigger>
          <SelectValue></SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {PRIVACY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <div className="flex items-center gap-1.5">
                  {o.icon && <Icon name={o.icon} className="size-4.5" />}
                  <span className="translate-y-px">{o.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
