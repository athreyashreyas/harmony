import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { errorMessage } from '../../lib/errorMessage';
import { supabase } from '../../lib/supabase/client';
import { createProfile } from '../../lib/supabase/sync';
import { useUser } from '../../store/useUser';
import AuthLayout, { FieldLabel, PrimaryButton, TextInput } from './AuthLayout';

export default function SignUpScreen() {
  const status = useUser((s) => s.status);
  const setSignedIn = useUser((s) => s.setSignedIn);

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'signed-in') return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase is not configured. Add the keys to apps/web/.env.local.');
      return;
    }
    if (password.length < 8) {
      setError('Your password needs to be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Something went wrong creating your account.');
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      // Email confirmation is required before a session exists. The profile
      // gets created on first sign in instead, once there is one. Stash the
      // name so that sign-in can use it when it creates the profile.
      try {
        localStorage.setItem('harmony.pendingFirstName', firstName.trim());
      } catch {
        // ignore
      }
      setNeedsConfirmation(true);
      setSubmitting(false);
      return;
    }

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const profile = await createProfile({ id: data.user.id, firstName: firstName.trim(), timezone });
      setSignedIn(profile);
    } catch (err) {
      console.error('createProfile failed', err);
      setError(errorMessage(err, 'Something went wrong creating your profile.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (needsConfirmation) {
    return (
      <AuthLayout title="Almost there." sub="">
        <p className="text-sm text-ink-500">
          Check your email to confirm your account, then sign in.
        </p>
        <Link to="/sign-in" className="mt-6 inline-block text-sm text-iris-500 hover:underline">
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Begin here." sub="A few details, then we will get to know you.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="firstName">First name</FieldLabel>
          <TextInput
            id="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-ink-300">At least 8 characters.</p>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <PrimaryButton disabled={submitting}>Create account</PrimaryButton>
      </form>

      <p className="mt-8 text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/sign-in" className="text-iris-500 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
