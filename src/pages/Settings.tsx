import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useThemeStore } from '@/lib/store';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { isDark, toggle } = useThemeStore();
  const [storeName, setStoreName] = useState('SwiftPOS Demo Store');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('9');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('managePreferences')}</p>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm divide-y divide-border/50 opacity-0 animate-fade-up">
        <div className="p-5">
          <h2 className="text-sm font-semibold mb-4">{t('storeInfo')}</h2>
          <div className="space-y-4">
            <div><Label htmlFor="storeName">{t('storeName')}</Label><Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('currency')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="tax">{t('taxRate')}</Label><Input id="tax" type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold mb-4">{t('language')}</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('language')}</p>
              <p className="text-xs text-muted-foreground">{t('selectLanguage')}</p>
            </div>
            <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('english')}</SelectItem>
                <SelectItem value="ar">{t('arabic')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold mb-4">{t('appearance')}</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('darkMode')}</p>
              <p className="text-xs text-muted-foreground">{t('switchTheme')}</p>
            </div>
            <Switch checked={isDark} onCheckedChange={toggle} />
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold mb-4">{t('receiptSettings')}</h2>
          <div className="space-y-4">
            <div><Label htmlFor="header">{t('receiptHeader')}</Label><Input id="header" defaultValue="Thank you for shopping with us!" /></div>
            <div><Label htmlFor="footer">{t('receiptFooter')}</Label><Input id="footer" defaultValue="Returns accepted within 30 days" /></div>
          </div>
        </div>
      </div>

      <Button onClick={() => toast.success(t('settingsSaved'))} size="lg">{t('saveChanges')}</Button>
    </div>
  );
}
