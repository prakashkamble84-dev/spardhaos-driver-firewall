import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { captureGlobalErrors } from '@/services/appLog';

export default function PublicLayout() {
  useEffect(() => captureGlobalErrors(), []);
  return (
    <div className="min-h-svh bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Outlet />
    </div>
  );
}
