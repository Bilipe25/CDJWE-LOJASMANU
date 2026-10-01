'use client';
import { usePathname } from 'next/navigation';
import ProtectedRoute from './ProtectedRoute';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname === '/login' ? <>{children}</> : <ProtectedRoute>{children}</ProtectedRoute>;
}
