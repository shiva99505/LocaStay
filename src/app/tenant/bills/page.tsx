import { redirect } from 'next/navigation';
import { Receipt, Zap, Wifi, Droplets, Flame, Wrench, AlertCircle } from 'lucide-react';
import { PayBillButton } from '@/components/tenant/pay-bill-button';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { BILL_TYPE_META, type BillType } from '@/lib/constants';

export const revalidate = 0;

const BILL_ICONS: Record<string, React.ReactNode> = {
  ELECTRICITY: <Zap className="h-4 w-4" />,
  WATER: <Droplets className="h-4 w-4" />,
  INTERNET: <Wifi className="h-4 w-4" />,
  GAS: <Flame className="h-4 w-4" />,
  MAINTENANCE: <Wrench className="h-4 w-4" />,
};

export default async function BillsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const bills = await prisma.bill.findMany({
    where: { userId: session.user.id },
    orderBy: { dueDate: 'desc' },
  });

  const unpaid = bills.filter((b) => b.status !== 'PAID');
  const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Bill Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track utility bills — electricity, water, internet, gas and maintenance.</p>
      </div>

      {unpaid.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/10">
          <CardContent className="flex items-center justify-between gap-4 pt-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-foreground">{unpaid.length} unpaid bill{unpaid.length > 1 ? 's' : ''} totalling {formatCurrency(totalUnpaid)}</p>
                <p className="text-sm text-muted-foreground">Pay before due dates to avoid reconnection fees.</p>
              </div>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5"><Receipt className="h-4 w-4" /> Pay Bills</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">All Bills ({bills.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No bills tracked yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Type', 'Amount', 'Due Date', 'Paid Date', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground last:text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bills.map((bill) => {
                    const meta = BILL_TYPE_META[bill.type as BillType];
                    const isUnpaid = bill.status !== 'PAID';
                    return (
                      <tr key={bill.id} className={cn('hover:bg-muted/20', isUnpaid && bill.dueDate < new Date() && 'bg-red-50/30 dark:bg-red-500/5')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-primary-600">{BILL_ICONS[bill.type] ?? <Receipt className="h-4 w-4" />}</span>
                            <span className="font-medium text-foreground">{meta?.label ?? bill.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(bill.amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(bill.dueDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{bill.paidDate ? formatDate(bill.paidDate) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold',
                            bill.status === 'PAID' ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          )}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isUnpaid ? (
                            <PayBillButton billId={bill.id} type={bill.type} amount={bill.amount} />
                          ) : (
                            <span className="text-xs text-secondary-600 dark:text-secondary-400 font-semibold">Paid ✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
