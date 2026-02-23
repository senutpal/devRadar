'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { teamsApi } from '@/lib/api';

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export function CreateTeamModal({ open, onClose, onCreated }: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setSlugEdited(false);
      setTimeout(() => nameRef.current?.focus(), 50);
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

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleCreate = async () => {
    if (name.length < 2 || name.length > 50) {
      toast.error('Team name must be 2-50 characters');
      return;
    }
    if (slug.length < 2 || slug.length > 30) {
      toast.error('Slug must be 2-30 characters');
      return;
    }

    setCreating(true);
    try {
      await teamsApi.create(name, slug);
      toast.success('Team created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create team"
        className="relative border-2 border-border bg-background p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Create team
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
              Team name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Team"
              maxLength={50}
              className="w-full bg-transparent border border-border px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
            />
            <span className="text-[10px] text-muted-foreground mt-1 block">{name.length}/50</span>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                setSlugEdited(true);
              }}
              placeholder="my-team"
              maxLength={30}
              className="w-full bg-transparent border border-border px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
            />
            <span className="text-[10px] text-muted-foreground mt-1 block">
              {slug.length}/30 &middot; lowercase, alphanumeric, hyphens
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating || name.length < 2 || slug.length < 2}
              className="text-xs font-mono flex-1"
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
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
