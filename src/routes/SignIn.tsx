import { SignIn } from '@clerk/react';

function redirectAfterAuth() {
  const raw = new URLSearchParams(window.location.search).get('redirect_url');
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default function SignInPage() {
  const redirectUrl = redirectAfterAuth();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  );
}
