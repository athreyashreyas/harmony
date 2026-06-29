import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../lib/errorMessage';
import { supabase } from '../../lib/supabase/client';
import AuthLayout, { FieldLabel, PrimaryButton, TextInput } from './AuthLayout';

// Landing screen for the "reset password" email link. Supabase appends a
// recovery token to the URL; the client processes it on load and establishes a
// short-lived recovery session, which is what lets updateUser change the
// password here. After a successful change we sign out so the user logs in
// again with the new password.
type Phase = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setPhase('invalid');
      return;
    }
    let settled = false;
    const ready = () => {
      if (!settled) {
        settled = true;
        setPhase('ready');
      }
    };

    // The recovery session may already be set (hash processed on load) or land
    // a beat later via the auth event; accept either.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) ready();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) ready();
    });

    // If no recovery session shows up, the link was missing, stale, or already
    // used. Tell the user rather than leaving them on a dead form.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setPhase('invalid');
      }
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(errorMessage(updateError, 'Something went wrong updating your password.'));
      setSubmitting(false);
      return;
    }

    // Sign out so the new password is what gets them back in.
    await supabase.auth.signOut();
    setPhase('done');
    setSubmitting(false);
  }

  if (phase === 'checking') {
    return (
      <AuthLayout title="One moment." sub="Checking your reset link.">
        <span />
      </AuthLayout>
    );
  }

  if (phase === 'invalid') {
    return (
      <AuthLayout
        title="This link has expired."
        sub="Reset links work once and only for a short while. Ask for a fresh one."
      >
        <Link
          to="/sign-in"
          className="inline-block rounded-full bg-iris-500 px-6 py-3 text-sm font-medium text-parchment-50"
        >
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  if (phase === 'done') {
    return (
      <AuthLayout title="Password updated." sub="Sign in with your new password.">
        <button
          type="button"
          onClick={() => navigate('/sign-in', { replace: true })}
          className="rounded-full bg-iris-500 px-6 py-3 text-sm font-medium text-parchment-50"
        >
          Sign in
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password." sub="Then you can sign in again.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
          <TextInput
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <PrimaryButton disabled={submitting}>Save new password</PrimaryButton>
      </form>
    </AuthLayout>
  );
}
