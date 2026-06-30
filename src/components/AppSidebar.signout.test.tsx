import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const signOutMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: signOutMock,
    role: 'manager',
  }),
}));

vi.mock('@/lib/store', () => ({
  useThemeStore: () => ({ isDark: false, toggle: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/components/ui/sidebar', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui/sidebar')>('@/components/ui/sidebar');
  return {
    ...actual,
    useSidebar: () => ({ state: 'expanded' }),
  };
});

describe('AppSidebar sign out', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue(undefined);
    navigateMock.mockReset();
  });

  it('signs out and navigates to the auth page', async () => {
    render(
      <MemoryRouter>
        <SidebarProvider defaultOpen>
          <AppSidebar />
        </SidebarProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /signout/i }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith('/auth', { replace: true });
    });
  });
});
