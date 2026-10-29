import { supabase } from '@/db/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ArcadeProject {
  id: string;
  user_id: string;
  title: string;
  code_content: string;
  assets_metadata: ArcadeAsset[];
  last_saved: string;
  created_at: string;
  is_deleted: boolean;
}

export interface ArcadeAsset {
  name: string;
  type: string;        // MIME type
  size: number;
  dataUrl?: string;    // base64 data URL, used by the preview sandbox
  storedKey?: string;  // future Supabase Storage key
}

export interface ArcadeGame {
  id: string;
  creator_id: string;
  project_id: string | null;
  title: string;
  blurb: string;
  description: string;
  license: string;
  code_content: string;
  assets_metadata: ArcadeAsset[];
  install_count: number;
  rating_sum: number;
  rating_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // joined
  creator_username?: string;
  creator_emoji?: string;
  is_installed?: boolean;
  user_rating?: number;
}

export interface ArcadeSuggestion {
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  username?: string;
}

export interface ArcadeReport {
  id: string;
  game_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
}

export interface ArcadeMod {
  game_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  username?: string;
}

// ── Arcade Projects ──────────────────────────────────────────────────────────

export async function fetchArcadeProjects(userId: string): Promise<ArcadeProject[]> {
  const { data } = await supabase
    .from('arcade_projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('last_saved', { ascending: false });
  return Array.isArray(data) ? data : [];
}

export async function createArcadeProject(
  userId: string,
  title: string,
  codeContent: string,
): Promise<ArcadeProject | null> {
  const { data } = await supabase
    .from('arcade_projects')
    .insert({ user_id: userId, title, code_content: codeContent })
    .select()
    .maybeSingle();
  return data ?? null;
}

export async function saveArcadeProject(
  projectId: string,
  title: string,
  codeContent: string,
  assetsMetadata: ArcadeAsset[],
): Promise<void> {
  const clean = assetsMetadata.map(({ dataUrl: _d, ...rest }) => rest);
  await supabase
    .from('arcade_projects')
    .update({ title, code_content: codeContent, assets_metadata: clean, last_saved: new Date().toISOString() })
    .eq('id', projectId);
}

export async function deleteArcadeProject(projectId: string): Promise<void> {
  await supabase
    .from('arcade_projects')
    .update({ is_deleted: true })
    .eq('id', projectId);
}

// ── Arcade Games (published) ─────────────────────────────────────────────────

export async function fetchArcadeGames(opts?: {
  sortBy?: 'install_count' | 'newest';
  search?: string;
  userId?: string;
}): Promise<ArcadeGame[]> {
  const { sortBy = 'install_count', search, userId } = opts ?? {};

  let query = supabase
    .from('arcade_games')
    .select(`
      *,
      profiles!arcade_games_creator_id_fkey(username, profile_character)
    `)
    .eq('is_published', true);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  if (sortBy === 'install_count') {
    query = query.order('install_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data } = await query.limit(50);
  const games: ArcadeGame[] = (Array.isArray(data) ? data : []).map((row: ArcadeGame & { profiles?: { username?: string; profile_character?: string } }) => ({
    ...row,
    creator_username: row.profiles?.username ?? 'Unknown',
    creator_emoji: row.profiles?.profile_character ?? '🎮',
  }));

  if (userId) {
    const { data: installs } = await supabase
      .from('user_installed_games')
      .select('game_id')
      .eq('user_id', userId);
    const installedSet = new Set((installs ?? []).map((i: { game_id: string }) => i.game_id));
    games.forEach(g => { g.is_installed = installedSet.has(g.id); });
  }

  return games;
}

export async function fetchArcadeGame(gameId: string, userId?: string): Promise<ArcadeGame | null> {
  const { data } = await supabase
    .from('arcade_games')
    .select(`
      *,
      profiles!arcade_games_creator_id_fkey(username, profile_character)
    `)
    .eq('id', gameId)
    .maybeSingle();

  if (!data) return null;

  const game: ArcadeGame = {
    ...data,
    creator_username: (data.profiles as { username?: string })?.username ?? 'Unknown',
    creator_emoji: (data.profiles as { profile_character?: string })?.profile_character ?? '🎮',
  };

  if (userId) {
    const [installRow, ratingRow] = await Promise.all([
      supabase.from('user_installed_games').select('user_id').eq('user_id', userId).eq('game_id', gameId).maybeSingle(),
      supabase.from('arcade_ratings').select('rating').eq('user_id', userId).eq('game_id', gameId).maybeSingle(),
    ]);
    game.is_installed = !!installRow.data;
    game.user_rating = ratingRow.data?.rating ?? 0;
  }

  return game;
}

export async function publishArcadeGame(opts: {
  creatorId: string;
  projectId: string;
  title: string;
  blurb: string;
  description: string;
  license: string;
  codeContent: string;
  assetsMetadata: ArcadeAsset[];
}): Promise<ArcadeGame | null> {
  const clean = opts.assetsMetadata.map(({ dataUrl: _d, ...rest }) => rest);
  const { data } = await supabase
    .from('arcade_games')
    .insert({
      creator_id: opts.creatorId,
      project_id: opts.projectId,
      title: opts.title,
      blurb: opts.blurb,
      description: opts.description,
      license: opts.license,
      code_content: opts.codeContent,
      assets_metadata: clean,
    })
    .select()
    .maybeSingle();
  return data ?? null;
}

export async function updatePublishedGame(
  gameId: string,
  opts: Partial<Pick<ArcadeGame, 'title' | 'description' | 'license' | 'code_content' | 'assets_metadata'>>,
): Promise<void> {
  await supabase
    .from('arcade_games')
    .update({ ...opts, updated_at: new Date().toISOString() })
    .eq('id', gameId);
}

export async function unpublishArcadeGame(gameId: string): Promise<void> {
  await supabase.from('arcade_games').update({ is_published: false }).eq('id', gameId);
}

// ── Install / Uninstall ──────────────────────────────────────────────────────

export async function installArcadeGame(userId: string, gameId: string): Promise<void> {
  await supabase.from('user_installed_games').insert({ user_id: userId, game_id: gameId });
  await supabase.rpc('increment_arcade_install_count', { game_id_arg: gameId });
}

export async function uninstallArcadeGame(userId: string, gameId: string): Promise<void> {
  await supabase.from('user_installed_games').delete().eq('user_id', userId).eq('game_id', gameId);
  await supabase.rpc('decrement_arcade_install_count', { game_id_arg: gameId });
}

export async function fetchInstalledGames(userId: string): Promise<ArcadeGame[]> {
  const { data } = await supabase
    .from('user_installed_games')
    .select(`
      game_id,
      arcade_games (
        *,
        profiles!arcade_games_creator_id_fkey(username, profile_character)
      )
    `)
    .eq('user_id', userId)
    .order('installed_at', { ascending: false });

  if (!Array.isArray(data)) return [];

  type RawRow = {
    game_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arcade_games: any;
  };

  const results: ArcadeGame[] = [];
  for (const row of data as RawRow[]) {
    const g = row.arcade_games;
    if (!g || typeof g !== 'object' || Array.isArray(g)) continue;
    if (!g.is_published) continue;
    results.push({
      ...g,
      is_installed: true as const,
      creator_username: g.profiles?.username ?? 'Unknown',
      creator_emoji: g.profiles?.profile_character ?? '🎮',
    } as ArcadeGame);
  }
  return results;
}

// ── Ratings ──────────────────────────────────────────────────────────────────

export async function upsertArcadeRating(userId: string, gameId: string, rating: number): Promise<void> {
  const { data: existing } = await supabase
    .from('arcade_ratings')
    .select('rating')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('arcade_ratings')
      .update({ rating })
      .eq('user_id', userId)
      .eq('game_id', gameId);
    await supabase.rpc('update_arcade_rating', {
      game_id_arg: gameId,
      old_rating: existing.rating,
      new_rating: rating,
      is_new: false,
    });
  } else {
    await supabase.from('arcade_ratings').insert({ user_id: userId, game_id: gameId, rating });
    await supabase.rpc('update_arcade_rating', {
      game_id_arg: gameId,
      old_rating: 0,
      new_rating: rating,
      is_new: true,
    });
  }
}

export async function fetchUserArcadeRating(userId: string, gameId: string): Promise<number> {
  const { data } = await supabase
    .from('arcade_ratings')
    .select('rating')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .maybeSingle();
  return data?.rating ?? 0;
}

// ── Suggestions ──────────────────────────────────────────────────────────────

export async function fetchArcadeSuggestions(gameId: string): Promise<ArcadeSuggestion[]> {
  const { data } = await supabase
    .from('arcade_suggestions')
    .select(`*, profiles!arcade_suggestions_user_id_fkey(username)`)
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (Array.isArray(data) ? data : []).map((row: ArcadeSuggestion & { profiles?: { username?: string } }) => ({
    ...row,
    username: row.profiles?.username ?? 'Unknown',
  }));
}

export async function addArcadeSuggestion(userId: string, gameId: string, content: string): Promise<void> {
  await supabase.from('arcade_suggestions').insert({ user_id: userId, game_id: gameId, content });
}

export async function resolveArcadeSuggestion(suggestionId: string, status: 'resolved' | 'dismissed'): Promise<void> {
  await supabase
    .from('arcade_suggestions')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', suggestionId);
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function submitArcadeReport(reporterId: string, gameId: string, reason: string): Promise<void> {
  await supabase.from('arcade_reports').insert({ reporter_id: reporterId, game_id: gameId, reason });
}

// ── Mods ─────────────────────────────────────────────────────────────────────

export async function fetchArcadeMods(gameId: string): Promise<ArcadeMod[]> {
  const { data } = await supabase
    .from('arcade_mods')
    .select(`*, profiles!arcade_mods_user_id_fkey(username)`)
    .eq('game_id', gameId)
    .order('invited_at', { ascending: true });
  return (Array.isArray(data) ? data : []).map((row: ArcadeMod & { profiles?: { username?: string } }) => ({
    ...row,
    username: row.profiles?.username ?? 'Unknown',
  }));
}

export async function inviteArcadeMod(gameId: string, invitedByUserId: string, targetUserId: string): Promise<void> {
  await supabase.from('arcade_mods').insert({
    game_id: gameId,
    user_id: targetUserId,
    invited_by: invitedByUserId,
  });
}

export async function removeArcadeMod(gameId: string, userId: string): Promise<void> {
  await supabase.from('arcade_mods').delete().eq('game_id', gameId).eq('user_id', userId);
}

export async function isUserArcadeMod(gameId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('arcade_mods')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function lookupUserByUsername(username: string): Promise<{ id: string; username: string } | null> {
  const { data } = await supabase.rpc('lookup_user_by_username', { uname: username });
  if (Array.isArray(data) && data.length > 0) return data[0] as { id: string; username: string };
  return null;
}
