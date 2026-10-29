import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Play, Save, Trash2, Upload, FolderOpen, Globe, Rocket, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createArcadeProject,
  fetchArcadeProjects,
  saveArcadeProject,
  deleteArcadeProject,
  publishArcadeGame,
} from '@/services/flush/arcadeService';
import type { ArcadeAsset, ArcadeProject } from '@/services/flush/arcadeService';
import { STARTER_TEMPLATE } from './STARTER_TEMPLATE';
import { TUTORIAL_STEPS } from './TUTORIAL_STEPS';

// Asset uploads stay small so a game's source + assets fit comfortably in the
// arcade_projects row.
const MAX_ASSET_SIZE = 512 * 1024;
const MAX_ASSETS = 8;

interface EditorProject {
  id: string | null;
  title: string;
  code: string;
  assets: ArcadeAsset[];
}

const blankProject = (): EditorProject => ({ id: null, title: 'Untitled Project', code: STARTER_TEMPLATE, assets: [] });

/** Very small TypeScript→JavaScript pass: sufficient for the template source. */
function transpile(tsSource: string): string {
  let js = tsSource
    .replace(/^\s*import\s[^\n]*$/gm, '')
    .replace(/^\s*export\s+default\s+(class|function|const|let|var)?\s*?(\w+)/m, 'export default $2')
    .replace(/\binterface\s+\w+\s+(extends\s+\w+\s+)?\{[\s\S]*?\n\}/g, '')
    .replace(/\btype\s+\w+\s*=\s*[^;\n]+;?/g, '')
    .replace(/:\s*[A-Za-z_$][\w$<>[\].|]*(\s*\|\s*[\w$<>[\].|]*)*(\[\])?/g, '')
    .replace(/\bas\s+const\b/g, '')
    .replace(/\bpublic\s+|\bprivate\s+|\breadonly\s+/g, '');
  js = js.replace(/\bclass\s+(\w+)\s*\{/g, 'class $1{');
  return js;
}

export default function StudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ArcadeProject[]>([]);
  const [active, setActive] = useState<EditorProject>(blankProject());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishDraft, setPublishDraft] = useState({ title: '', blurb: '', description: '', license: 'MIT' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchArcadeProjects(user.id)
      .then(list => setProjects(list))
      .finally(() => setLoading(false));
  }, [user]);

  const compile = useCallback((): string | null => {
    try {
      const js = transpile(active.code);
      return js;
    } catch (err) {
      setPreviewError(String(err));
      return null;
    }
  }, [active.code]);

  const handleRun = () => {
    setPreviewError(null);
    const js = compile();
    if (js === null) return;
    setPreviewKey(k => k + 1);
  };

  const persist = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    setSaving(true);
    try {
      if (active.id) {
        await saveArcadeProject(active.id, active.title, active.code, active.assets);
        void fetchArcadeProjects(user.id).then(setProjects);
        return active.id;
      }
      const created = await createArcadeProject(user.id, active.title, active.code);
      if (!created) {
        toast.error('Could not create the project.');
        return null;
      }
      if (active.assets.length > 0) {
        await saveArcadeProject(created.id, active.title, active.code, active.assets);
      }
      setProjects(prev => [created, ...prev]);
      setActive(prev => ({ ...prev, id: created.id, title: created.title }));
      return created.id;
    } finally {
      setSaving(false);
    }
  }, [active, user]);

  const handleSave = async () => {
    const id = await persist();
    if (id) toast.success('Project saved.');
  };

  const handleNewProject = () => {
    setActive(blankProject());
    setPreviewKey(k => k + 1);
  };

  const openProject = (p: ArcadeProject) => {
    setActive({ id: p.id, title: p.title, code: p.code_content, assets: p.assets_metadata ?? [] });
    setPreviewKey(k => k + 1);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteArcadeProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (active.id === id) setActive(blankProject());
    toast.success('Project deleted.');
  };

  const handleAddAsset = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: ArcadeAsset[] = [];
    for (const file of Array.from(files)) {
      if (active.assets.length + next.length >= MAX_ASSETS) {
        toast.error(`Maximum ${MAX_ASSETS} assets per project.`);
        break;
      }
      if (file.size > MAX_ASSET_SIZE) {
        toast.error(`${file.name} exceeds the ${Math.round(MAX_ASSET_SIZE / 1024)} KB limit.`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push({ name: file.name, type: file.type, size: file.size, dataUrl });
    }
    if (next.length > 0) setActive(prev => ({ ...prev, assets: [...prev.assets, ...next] }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAsset = (name: string) =>
    setActive(prev => ({ ...prev, assets: prev.assets.filter(a => a.name !== name) }));

  const openPublish = async () => {
    const id = await persist();
    if (!id) return;
    const proj = projects.find(p => p.id === id);
    setPublishDraft(d => ({ ...d, title: d.title || proj?.title || active.title }));
    setPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!user || !active.id) return;
    const { title, blurb, description, license } = publishDraft;
    if (!title.trim() || !blurb.trim() || !description.trim()) {
      toast.error('Title, blurb and description are all required.');
      return;
    }
    setPublishing(true);
    const created = await publishArcadeGame({
      creatorId: user.id,
      projectId: active.id!,
      title: title.trim(),
      blurb: blurb.trim(),
      description: description.trim(),
      license,
      codeContent: active.code,
      assetsMetadata: active.assets,
    });
    setPublishing(false);
    if (!created) {
      toast.error('Publishing failed. Try again.');
      return;
    }
    setPublishOpen(false);
    toast.success('Arcade published to the Athenaeum!');
    navigate('/athenaeum/arcades');
  };

  // ── Preview sandbox bridge ────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelRef = useRef<MessageChannel | null>(null);

  useEffect(() => {
    return () => { channelRef.current?.port1.close(); };
  }, []);

  // Test-run cards: pulled from the first deck of the signed-in user. Preview
  // sessions never touch the real reward system — that only happens on play.
  useEffect(() => {
    let cancelled = false;
    const iframe = iframeRef.current;
    if (!iframe || previewKey === 0) return;

    // Import the starter template lazily to keep the initial bundle small.
    void import('@/lib/arcadeSandbox').then(({ buildSandboxHtml, stripTypes }) => {
      if (cancelled || !iframe) return;
      const js = transpile(active.code);
      const html = buildSandboxHtml({ js: stripTypes(js), assets: active.assets });

      if (channelRef.current) channelRef.current.port1.close();
      const channel = new MessageChannel();
      channelRef.current = channel;

      iframe.onload = () => {
        iframe.onload = null;
        iframe.contentWindow?.postMessage({ type: 'INIT_PORT' }, '*', [channel.port2]);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (iframe as any).srcdoc = html;

      channel.port1.onmessage = (ev) => {
        const msg = ev.data as { type: string; message?: string };
        if (msg.type === 'LOG') console.log('[Arcade preview]', msg.message);
        if (msg.type === 'ERROR') setPreviewError(msg.message ?? 'Unknown sandbox error');
      };
    });
    return () => { cancelled = true; };
    // Recompile the preview on every Run or asset change.
  }, [previewKey, active.code, active.assets]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1" onClick={() => navigate('/athenaeum/arcades')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Input
            value={active.title}
            onChange={e => setActive(p => ({ ...p, title: e.target.value }))}
            className="w-56 font-semibold"
            aria-label="Project title"
          />
        </div>
        <div className="flex items-center gap-2">
          <Tabs value="code" onValueChange={() => {}}>
            <TabsList>
              <TabsTrigger value="code">Editor</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={handleNewProject} className="gap-1.5">
            <FolderOpen className="w-4 h-4" /> New
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <Upload className="w-4 h-4" /> Asset
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" onClick={handleRun} className="gap-1.5">
            <Play className="w-4 h-4" /> Run
          </Button>
          <Button size="sm" variant="secondary" onClick={openPublish} disabled={saving} className="gap-1.5">
            <Rocket className="w-4 h-4" /> Publish
          </Button>
        </div>
      </header>

      {/* Body: projects rail / editor / preview */}
      <div className="flex flex-1 min-h-0">
        {/* Projects rail */}
        <aside className="hidden w-52 shrink-0 border-r border-border overflow-y-auto lg:block">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</p>
          {projects.length === 0 ? (
            <p className="px-4 pb-4 text-xs text-muted-foreground">No projects yet — hit New to start.</p>
          ) : (
            <ul className="pb-4">
              {projects.map(p => (
                <li key={p.id}>
                  <div
                    className={`group flex items-center gap-1 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${active.id === p.id ? 'bg-accent font-medium' : ''}`}
                    onClick={() => openProject(p)}
                  >
                    <span className="flex-1 truncate">{p.title}</span>
                    <button
                      aria-label={`Delete ${p.title}`}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={e => { e.stopPropagation(); void handleDeleteProject(p.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Editor + tutorial */}
        <section className="hidden md:flex md:w-[38%] flex-col min-h-0 border-r border-border">
          <textarea
            value={active.code}
            onChange={e => setActive(p => ({ ...p, code: e.target.value }))}
            spellCheck={false}
            className="flex-1 w-full resize-none bg-[#14141f] text-[13px] leading-relaxed text-[#d6d6e0] font-mono p-4 outline-none"
            aria-label="Game source code"
          />
          <div className="border-t border-border max-h-56 overflow-y-auto p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tutorial</p>
            {TUTORIAL_STEPS.map((step, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="font-mono text-foreground/80">{String(step.line).padStart(3, '0')}</span> 
                {step.comment}
              </div>
            ))}
          </div>
        </section>

        {/* Preview */}
        <section className="flex flex-1 flex-col min-h-0 bg-[#1E1E2E]">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <span>Live preview · 800×560</span>
            {previewError && <span className="text-destructive font-medium">{previewError}</span>}
          </div>
          <div className="flex-1 grid place-items-center p-4 min-h-0">
            <iframe
              key={previewKey}
              ref={iframeRef}
              title="Arcade preview"
              sandbox="allow-scripts allow-modals"
              className="border-none bg-[#1E1E2E] w-full max-w-[800px]"
              style={{ aspectRatio: '800 / 560' }}
            />
          </div>
        </section>
      </div>

      {/* Hidden asset input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => void handleAddAsset(e.target.files)}
      />

      {/* Asset strip */}
      {active.assets.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2 shrink-0">
          {active.assets.map(a => (
            <span key={a.name} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs">
              <Globe className="w-3 h-3 text-muted-foreground" />
              {a.name}
              <button aria-label={`Remove ${a.name}`} onClick={() => handleRemoveAsset(a.name)} className="hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Publish dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish to the Athenaeum</DialogTitle>
            <DialogDescription>
              Pick the project to share, then describe it for the marketplace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select
                value={active.id ?? ''}
                onValueChange={() => { /* single-project publish for now */ }}
              >
                <SelectTrigger><SelectValue placeholder={active.id ? active.title : 'Save the project first'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={active.id ?? ''}>{active.title}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Arcade Title</Label>
              <Input
                value={publishDraft.title}
                onChange={e => setPublishDraft(d => ({ ...d, title: e.target.value }))}
                maxLength={100}
                placeholder="My awesome arcade game"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Blurb</Label>
              <Input
                value={publishDraft.blurb}
                onChange={e => setPublishDraft(d => ({ ...d, blurb: e.target.value }))}
                maxLength={120}
                placeholder="e.g. 60 seconds, 3×3 grid. Whack the correct answers!"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={publishDraft.description}
                onChange={e => setPublishDraft(d => ({ ...d, description: e.target.value }))}
                maxLength={500}
                rows={3}
                placeholder="Explain how to play your arcade…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>License</Label>
              <Select value={publishDraft.license} onValueChange={v => setPublishDraft(d => ({ ...d, license: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIT">MIT — anyone can use, modify, and distribute</SelectItem>
                  <SelectItem value="All Rights Reserved">All Rights Reserved — no reuse without permission</SelectItem>
                  <SelectItem value="GPL-3.0">GPL-3.0 — derivatives must stay open source</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button onClick={() => void handlePublish()} disabled={publishing}>
              {publishing ? 'Publishing…' : <><Check className="w-4 h-4 mr-1" /> Publish</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile fallback */}
      <div className="fixed inset-0 z-50 grid place-items-center bg-background p-8 text-center md:hidden">
        <div className="space-y-3">
          <Rocket className="w-10 h-10 mx-auto text-primary" />
          <h2 className="text-lg font-semibold">Arcade Studio needs a desktop</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            The code editor and live preview only fit on larger screens.
          </p>
          <Button asChild variant="outline"><Link to="/athenaeum/arcades">Back to Arcades</Link></Button>
        </div>
      </div>
    </div>
  );
}
