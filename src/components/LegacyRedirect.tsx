import { Navigate, useLocation } from 'react-router-dom';

export function LegacyRedirect({ to }: { to: string }) {
  const { search, hash, state } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} state={state} replace />;
}
