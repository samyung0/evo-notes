import { isApiError } from '@/api/client';
import { userToast } from '@/components/ui/userToast';

/** Safe same-origin return path for post-auth redirect. */
export function signInHref(returnTo = `${window.location.pathname}${window.location.search}`) {
  const path = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  return `/sign-in?${new URLSearchParams({ redirect_url: path })}`;
}

export function toastCloneError(err: unknown, kind: 'workspace' | 'quiz' | 'deck') {
  if (isApiError(err) && err.status === 401) {
    userToast({
      title: 'Sign in to clone',
      description: `Create an account before cloning this ${kind}.`,
      button: {
        label: 'Sign in',
        onClick: () => {
          window.location.href = signInHref();
        },
      },
    });
    return;
  }
  userToast({
    title: 'Could not clone',
    description: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    variant: 'error',
  });
}

export function toastSignInRequired(title: string, description: string) {
  userToast({
    title,
    description,
    button: {
      label: 'Sign in',
      onClick: () => {
        window.location.href = signInHref();
      },
    },
  });
}
