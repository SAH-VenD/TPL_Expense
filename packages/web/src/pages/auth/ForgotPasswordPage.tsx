import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '../../features/auth/services/auth.service';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await forgotPassword({ email }).unwrap();
      setSubmitted(true);
    } catch {
      // Still show success to prevent email enumeration
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <h3 className="text-lg font-medium text-green-800">Check your email</h3>
          <p className="mt-2 text-sm text-green-700">
            If an account exists for {email}, you will receive a password reset link.
          </p>
        </div>
        <div className="text-center">
          <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Reset your password</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full">
          {isLoading ? 'Sending...' : 'Send reset link'}
        </button>

        <div className="text-center">
          <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
