import { redirect } from 'next/navigation';
import { Newspaper, Plus, Edit2, Trash2, Eye, ToggleLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const revalidate = 0;

// Static content items — in prod these would be DB-managed
const BANNERS = [
  { id: '1', title: 'Diwali Offer — Zero Brokerage', type: 'PROMO', status: 'ACTIVE', from: '2024-10-01', to: '2024-11-05', views: 4820 },
  { id: '2', title: 'New MGNREGA Housing Scheme Available', type: 'NOTICE', status: 'ACTIVE', from: '2024-09-01', to: '2025-01-01', views: 2310 },
];

const BLOG_POSTS = [
  { id: '1', title: 'How to Find Safe Rooms in Rural India', status: 'PUBLISHED', author: 'LocaStay Team', date: '2024-10-15', views: 1240 },
  { id: '2', title: 'Guide for Migrant Workers: Know Your Rights', status: 'PUBLISHED', author: 'LocaStay Team', date: '2024-09-22', views: 870 },
  { id: '3', title: '5 Things to Check Before Signing a Rental Agreement', status: 'DRAFT', author: 'LocaStay Team', date: '2024-11-01', views: 0 },
];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15',
  INACTIVE: 'bg-muted text-muted-foreground',
  PUBLISHED: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15',
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15',
};

const TYPE_STYLE: Record<string, string> = {
  PROMO: 'bg-primary-100 text-primary-700 dark:bg-primary-500/15',
  NOTICE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15',
};

export default async function AdminContentPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Content Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage platform banners, notices, and blog posts.</p>
      </div>

      {/* Banners & Notices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <ToggleLeft className="h-4 w-4 text-primary-600" /> Banners &amp; Notices
          </CardTitle>
          <Button size="sm" className="gap-1.5 bg-primary-700 hover:bg-primary-800">
            <Plus className="h-3.5 w-3.5" /> New Banner
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Title', 'Type', 'Status', 'Active Period', 'Views', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {BANNERS.map((banner) => (
                  <tr key={banner.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold text-foreground">{banner.title}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', TYPE_STYLE[banner.type] ?? '')}>{banner.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_STYLE[banner.status] ?? '')}>{banner.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{banner.from} → {banner.to}</td>
                    <td className="px-4 py-3 text-xs text-foreground font-medium">{banner.views.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 w-7 gap-0 rounded-lg px-0"><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 gap-0 rounded-lg px-0 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Blog Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Newspaper className="h-4 w-4 text-secondary-600" /> Blog &amp; Guides
          </CardTitle>
          <Button size="sm" className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
            <Plus className="h-3.5 w-3.5" /> New Post
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {BLOG_POSTS.map((post) => (
              <div key={post.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-muted/20 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.author} · {post.date}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_STYLE[post.status] ?? '')}>{post.status}</span>
                  {post.views > 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Eye className="h-3 w-3" /> {post.views.toLocaleString('en-IN')}</span>}
                  <Button size="sm" variant="outline" className="h-7 gap-1 rounded-lg px-2.5 text-xs"><Edit2 className="h-3 w-3" /> Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 gap-0 rounded-lg px-0 text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
