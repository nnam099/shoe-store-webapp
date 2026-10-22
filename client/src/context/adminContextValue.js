import { createContext, useContext } from 'react';

export const AdminContext = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminProvider');
  return ctx;
}
