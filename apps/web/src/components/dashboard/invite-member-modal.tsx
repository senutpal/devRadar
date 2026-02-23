'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { teamsApi } from '@/lib/api';

interface InviteMemberModalProps {
  open: boolean;
  teamId: string;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberModal({ open, teamId, onClose, onInvited }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [sending, setSending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('MEMBER');
      setTimeout(() => emailRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleInvite = async () => {
    if (!email.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }

    setSending(true);
    try {
      await teamsApi.invite(teamId, email, role);
      toast.success(`Invitation sent to ${email}`);
      onInvited();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invite member"
        className="relative border-2 border-border bg-background p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Invite member
          </span>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
              Email
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full bg-transparent border border-border px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
              Role
            </label>
            <div className="flex gap-2">
              {(['MEMBER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 border text-xs font-mono transition-colors ${
                    role === r
                      ? 'border-foreground text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={sending || !email.includes('@')}
              className="text-xs font-mono flex-1"
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send Invite'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs font-mono">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
