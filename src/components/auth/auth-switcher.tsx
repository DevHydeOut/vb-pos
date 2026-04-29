'use client';

import { StaffForm } from './staff-form';
import { LoginForm } from './login-form';

interface Props {
  mode: 'iamUser' | 'rootUser';
}

export default function AuthSwitcher({ mode }: Props) {
  if (mode === 'iamUser') {
    return <StaffForm />;
  }

  return <LoginForm />;
}