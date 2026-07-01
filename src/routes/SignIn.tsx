import { SignIn } from '@clerk/react';

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
