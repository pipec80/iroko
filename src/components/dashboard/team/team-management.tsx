'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const members = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@corporatehq.com',
    role: 'Owner',
    status: 'Active',
    avatar: '',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah.c@corporatehq.com',
    role: 'Admin',
    status: 'Active',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
  },
  {
    id: '3',
    name: 'Marcus Rodriguez',
    email: 'm.rodriguez@corporatehq.com',
    role: 'Editor',
    status: 'Pending',
    avatar: 'https://i.pravatar.cc/150?u=marcus',
  },
  {
    id: '4',
    name: 'Elena Vance',
    email: 'evance@corporatehq.com',
    role: 'Viewer',
    status: 'Active',
    avatar: 'https://i.pravatar.cc/150?u=elena',
  },
];

export function TeamManagement() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-6 duration-500">
      {/* Actions Bar */}
      <div className="bg-surface-container-low border-outline-variant/10 flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined text-on-surface-variant absolute top-1/2 left-3 -translate-y-1/2 text-[20px]">
            search
          </span>
          <Input
            placeholder="Search members..."
            className="bg-surface-container-lowest border-outline-variant/20 focus-visible:ring-primary/20 rounded-xl pl-10"
          />
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-on-primary shadow-primary/20 flex w-full items-center gap-2 rounded-xl px-6 font-bold shadow-lg transition-all active:scale-95 md:w-auto">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Invite Member
        </Button>
      </div>

      {/* Members Table */}
      <div className="bg-surface-container-lowest shadow-surface-dim/50 border-outline-variant/10 overflow-hidden rounded-2xl border shadow-xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-container-high/50 hover:bg-surface-container-high/50 border-outline-variant/10 border-b">
              <TableHead className="text-on-surface-variant w-[300px] px-6 py-4 text-[10px] font-bold tracking-widest uppercase">
                Member
              </TableHead>
              <TableHead className="text-on-surface-variant px-6 py-4 text-[10px] font-bold tracking-widest uppercase">
                Role
              </TableHead>
              <TableHead className="text-on-surface-variant px-6 py-4 text-[10px] font-bold tracking-widest uppercase">
                Status
              </TableHead>
              <TableHead className="text-on-surface-variant px-6 py-4 text-right text-[10px] font-bold tracking-widest uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow
                key={member.id}
                className="hover:bg-surface-container-low/50 border-outline-variant/5 group border-b transition-colors">
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="border-surface-container-highest size-10 border-2">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-on-surface text-sm font-bold">{member.name}</span>
                      <span className="text-on-surface-variant text-xs opacity-70">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge
                    variant="secondary"
                    className="bg-surface-container-highest text-on-surface-variant rounded-md border-none px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        member.status === 'Active' ? 'bg-secondary' : 'bg-tertiary animate-pulse',
                      )}
                    />
                    <span className="text-on-surface-variant text-xs font-bold">
                      {member.status}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-surface-container-highest text-on-surface-variant size-8 rounded-full">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="border-outline-variant/10 bg-surface-container-lowest w-48 rounded-xl p-1.5 shadow-2xl">
                      <DropdownMenuItem className="focus:bg-surface-container-low group cursor-pointer rounded-lg py-2">
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mr-2 text-[18px]">
                          edit
                        </span>
                        <span className="text-xs font-bold">Edit Permissions</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-surface-container-low group cursor-pointer rounded-lg py-2">
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mr-2 text-[18px]">
                          mail
                        </span>
                        <span className="text-xs font-bold">Resend Invite</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-error/10 group text-error cursor-pointer rounded-lg py-2">
                        <span className="material-symbols-outlined group-hover:text-error mr-2 text-[18px]">
                          person_remove
                        </span>
                        <span className="text-xs font-bold">Remove Member</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Role Descriptions Card */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: 'shield_person',
            title: 'Owner',
            desc: 'Full access to all settings and billing.',
          },
          {
            icon: 'admin_panel_settings',
            title: 'Admin',
            desc: 'Can manage members and operations.',
          },
          { icon: 'edit_square', title: 'Editor', desc: 'Can modify inventory and data entries.' },
          { icon: 'visibility', title: 'Viewer', desc: 'Read-only access to dashboards.' },
        ].map((role, idx) => (
          <div
            key={idx}
            className="bg-surface-container-low border-outline-variant/10 flex flex-col gap-2 rounded-2xl border p-4">
            <span className="material-symbols-outlined text-primary text-[24px]">{role.icon}</span>
            <h4 className="text-on-surface text-sm font-bold">{role.title}</h4>
            <p className="text-on-surface-variant text-[11px] leading-relaxed">{role.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
