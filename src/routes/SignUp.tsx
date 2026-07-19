import { SignUp } from '@clerk/react';

function redirectAfterAuth() {
  const raw = new URLSearchParams(window.location.search).get('redirect_url');
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default function SignUpPage() {
  const redirectUrl = redirectAfterAuth();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
      />
    </div>
  );
}
