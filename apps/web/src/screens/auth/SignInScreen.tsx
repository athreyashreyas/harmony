import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { pullProfile } from '../../lib/supabase/sync';
import { useUser } from '../../store/useUser';
import AuthLayout, { FieldLabel, PrimaryButton, TextInput } from './AuthLayout';

export default function SignInScreen() {
  const status = useUser((s) => s.status);
  const setSignedIn = useUser((s) => s.setSignedIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'signed-in') return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase is not configured. Add the keys to apps/web/.env.local.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Something went wrong signing in.');
      setSubmitting(false);
      return;
    }

    try {
      const profile = await pullProfile(data.user.id);
      if (profile) setSignedIn(profile);
      else setError('Signed in, but your profile could not be found.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading your profile.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!supabase || !email) return;
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <AuthLayout title="Welcome back." sub="Sign in to pick up where you left off.">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {resetSent && (
          <p className="text-sm text-sage-600">
            Check your email for a link to reset your password.
          </p>
        )}

        <PrimaryButton disabled={submitting}>Sign in</PrimaryButton>
      </form>

      <button
        type="button"
        onClick={handleReset}
        className="mt-4 text-sm text-ink-500 underline-offset-2 hover:text-iris-500 hover:underline"
      >
        Forgot your password?
      </button>

      <p className="mt-8 text-sm text-ink-500">
        New to Harmony?{' '}
        <Link to="/sign-up" className="text-iris-500 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
