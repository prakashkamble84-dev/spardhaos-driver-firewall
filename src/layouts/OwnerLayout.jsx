import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useOwnerLayoutData } from '@/hooks/useOwnerLayoutData';
import { useFetch } from '@/hooks/useFetch';
import { fetchStudentProfile, isOnboardingDone } from '@/services/studentProfile';
import UserMenu from '@/components/UserMenu';
import ApperIcon from '@/components/ApperIcon';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { cn } from '@/lib/utils';

export default function OwnerLayout() {
  const { navItems, displayName, initials, user } = useOwnerLayoutData();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: studentProfile, loading: profileLoading, error: profileError } = useFetch(fetchStudentProfile, []);

  useEffect(() => {
    if (user?.profile !== 'Student_c' || profileLoading || profileError || studentProfile === undefined) return;
    if (pathname !== '/onboarding' && !isOnboardingDone() && !studentProfile?.onboarding_complete_c) {
      navigate('/onboarding', { replace: true });
    }
  }, [user?.profile, profileLoading, profileError, studentProfile, pathname, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 border-b border-border px-6 py-5 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><ApperIcon name="BookOpenCheck" size={21} /></span>
          <span><span className="block font-serif text-xl font-semibold">SpardhaOS</span><span className="text-xs text-muted-foreground">तुमचा अभ्यास साथी</span></span>
        </button>
        <div className="px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">तयारी</p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}>
                <ApperIcon name={item.icon || 'Circle'} size={18} /><span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-bold">{initials}</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="text-xs text-muted-foreground">MPSC विद्यार्थी</p></div>
          </div>
          <UserMenu />
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 font-serif text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><ApperIcon name="BookOpenCheck" size={17} /></span>
            SpardhaOS
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileMenuOpen((open) => !open)} aria-label="मेनू उघडा" aria-expanded={mobileMenuOpen} className="grid h-10 w-10 place-items-center rounded-lg border border-border">
              <ApperIcon name={mobileMenuOpen ? 'X' : 'Menu'} size={19} />
            </button>
            <UserMenu />
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-14 z-40 max-h-[70vh] overflow-y-auto border-b border-border bg-card p-3 shadow-md md:hidden">
            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <NavLink key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => cn('flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold', isActive ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground')}>
                  <ApperIcon name={item.icon || 'Circle'} size={17} /><span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
            <ApperIcon name={item.icon || 'Circle'} size={19} /><span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}