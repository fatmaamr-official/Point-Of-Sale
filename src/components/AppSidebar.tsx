import {
  LayoutDashboard, ShoppingCart, Package, ClipboardList, Settings, Moon, Sun, Store, Users, BarChart3, LogOut, Tags, Truck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useThemeStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const navItems = {
  admin: [
    {
      titleKey: 'dashboard',
      label: 'Dashboard',
      url: '/',
      icon: LayoutDashboard,
    },
    {
      titleKey: 'pos',
      label: 'POS',
      url: '/pos',
      icon: ShoppingCart,
    },
    {
      titleKey: 'products',
      label: 'Products',
      url: '/products',
      icon: Package,
    },
    {
      titleKey: 'categories',
      label: 'Categories',
      url: '/categories',
      icon: Tags,
    },
    {
      titleKey: 'customers',
      label: 'Customers',
      url: '/customers',
      icon: Users,
    },
    {
      titleKey: 'suppliers',
      label: 'Suppliers',
      url: '/suppliers',
      icon: Truck,
    },
    {
      titleKey: 'employees',
      label: 'Employees',
      url: '/employees',
      icon: Users,
    },
    {
      titleKey: 'orders',
      label: 'Orders',
      url: '/orders',
      icon: ClipboardList,
    },
    {
      titleKey: 'reports',
      label: 'Reports',
      url: '/reports',
      icon: BarChart3,
    },
    {
      titleKey: 'settings',
      label: 'Settings',
      url: '/settings',
      icon: Settings,
    },
  ],

  manager: [
    {
      titleKey: 'dashboard',
      label: 'Dashboard',
      url: '/',
      icon: LayoutDashboard,
    },
    {
      titleKey: 'pos',
      label: 'POS',
      url: '/pos',
      icon: ShoppingCart,
    },
    {
      titleKey: 'products',
      label: 'Products',
      url: '/products',
      icon: Package,
    },
    {
      titleKey: 'categories',
      label: 'Categories',
      url: '/categories',
      icon: Tags,
    },
    {
      titleKey: 'customers',
      label: 'Customers',
      url: '/customers',
      icon: Users,
    },
    {
      titleKey: 'suppliers',
      label: 'Suppliers',
      url: '/suppliers',
      icon: Truck,
    },
    {
      titleKey: 'orders',
      label: 'Orders',
      url: '/orders',
      icon: ClipboardList,
    },
    {
      titleKey: 'reports',
      label: 'Reports',
      url: '/reports',
      icon: BarChart3,
    },
  ],

  cashier: [
    {
      titleKey: 'dashboard',
      label: 'Dashboard',
      url: '/',
      icon: LayoutDashboard,
    },
    {
      titleKey: 'pos',
      label: 'POS',
      url: '/pos',
      icon: ShoppingCart,
    },
    {
      titleKey: 'orders',
      label: 'Orders',
      url: '/orders',
      icon: ClipboardList,
    },
    {
      titleKey: 'customers',
      label: 'Customers',
      url: '/customers',
      icon: Users,
    },
  ],
} as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { isDark, toggle } = useThemeStore();
  const { signOut, role } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Store className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">SwiftPOS</span>
              <span className="text-xs text-sidebar-foreground/60">{role ? t(role) : t('pos')}</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {(role ? navItems[role] : []).map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50 transition-colors duration-150"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{t(item.titleKey, { defaultValue: item.label })}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-1">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors duration-150"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{isDark ? t('lightMode') : t('darkMode')}</span>}
        </button>
        <button
          onClick={() => void handleSignOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors duration-150"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>{t('signOut')}</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
