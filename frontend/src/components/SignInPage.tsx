import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

type LocationState = {
  from?: {
    pathname: string;
    search: string;
  };
};

export const SignInPage: React.FC = () => {
  const [showSignup, setShowSignup] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null;
    if (state?.from?.pathname) {
      return `${state.from.pathname}${state.from.search || ''}`;
    }
    return '/projects';
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {showSignup ? (
        <SignupForm onSwitchToLogin={() => setShowSignup(false)} />
      ) : (
        <LoginForm onSwitchToSignup={() => setShowSignup(true)} />
      )}
    </div>
  );
};
