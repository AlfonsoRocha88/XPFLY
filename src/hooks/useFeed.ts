import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const FEED_PAGE_SIZE = 15;

export interface FeedAuthor {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface FeedPost {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string | null;
  caption: string | null;
  image_path: string;
  created_at: string;
  url: string;
  author: FeedAuthor | null;
  reactions: number;
  reacted: boolean;
}

interface FeedPage { posts: FeedPost[]; nextOffset: number | null }
type FeedData = InfiniteData<FeedPage, number>;

export interface CreatePostInput {
  blob: Blob;
  caption?: string | null;
  task?: { id: string; title: string } | null;
}

export function useFeed() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = useMemo(() => ["feed", user?.id] as const, [user?.id]);

  const query = useInfiniteQuery({
    queryKey: key,
    enabled: !!user,
    initialPageParam: 0,
    getNextPageParam: (last: FeedPage) => last.nextOffset ?? undefined,
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      const from = pageParam;
      const { data: rows, error } = await supabase
        .from("posts")
        .select("id, user_id, task_id, task_title, caption, image_path, created_at")
        .order("created_at", { ascending: false })
        .range(from, from + FEED_PAGE_SIZE - 1);
      if (error) throw error;
      if (!rows?.length) return { posts: [], nextOffset: null };

      const ids = rows.map((r) => r.id);
      const authorIds = [...new Set(rows.map((r) => r.user_id))];
      const [signed, profiles, reactions] = await Promise.all([
        supabase.storage.from("posts").createSignedUrls(rows.map((r) => r.image_path), 3600),
        supabase.rpc("get_profiles_public", { _user_ids: authorIds }),
        supabase.from("post_reactions").select("post_id, user_id").in("post_id", ids),
      ]);

      const urlByPath = new Map<string, string>();
      signed.data?.forEach((s) => { if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl); });
      const authorById = new Map<string, FeedAuthor>();
      profiles.data?.forEach((p) => authorById.set(p.user_id, {
        user_id: p.user_id, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url,
      }));
      const counts = new Map<string, number>();
      const mine = new Set<string>();
      reactions.data?.forEach((r) => {
        counts.set(r.post_id, (counts.get(r.post_id) ?? 0) + 1);
        if (r.user_id === user?.id) mine.add(r.post_id);
      });

      const posts = rows.map((r) => ({
        ...r,
        url: urlByPath.get(r.image_path) ?? "",
        author: authorById.get(r.user_id) ?? null,
        reactions: counts.get(r.id) ?? 0,
        reacted: mine.has(r.id),
      }));
      return { posts, nextOffset: rows.length < FEED_PAGE_SIZE ? null : from + FEED_PAGE_SIZE };
    },
  });

  const patchPost = useCallback((postId: string, fn: (p: FeedPost) => FeedPost | null) => {
    qc.setQueryData<FeedData>(key, (old) => old && {
      ...old,
      pages: old.pages.map((pg) => ({
        ...pg,
        posts: pg.posts.flatMap((p) => {
          if (p.id !== postId) return [p];
          const next = fn(p);
          return next ? [next] : [];
        }),
      })),
    });
  }, [qc, key]);

  const findPost = useCallback((postId: string) =>
    qc.getQueryData<FeedData>(key)?.pages.flatMap((pg) => pg.posts).find((p) => p.id === postId), [qc, key]);

  const reactMutation = useMutation({
    mutationFn: async ({ postId, react }: { postId: string; react: boolean }) => {
      if (!user) throw new Error("Sin sesión");
      const res = react
        ? await supabase.from("post_reactions").insert({ post_id: postId })
        : await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
      // duplicate insert (already reacted elsewhere) is fine
      if (res.error && res.error.code !== "23505") throw res.error;
    },
    onMutate: async ({ postId, react }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FeedData>(key);
      patchPost(postId, (p) => ({ ...p, reacted: react, reactions: Math.max(0, p.reactions + (react ? 1 : -1)) }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
  });

  const { mutate: react } = reactMutation;

  /** Toggle my 🔥 on a post. Pass `force: true` to only add (double-tap). */
  const toggleReaction = useCallback((postId: string, opts?: { force?: boolean }) => {
    const post = findPost(postId);
    if (!post) return;
    if (opts?.force && post.reacted) return;
    react({ postId, react: !post.reacted });
  }, [findPost, react]);

  const deleteMutation = useMutation({
    mutationFn: async (post: Pick<FeedPost, "id" | "image_path">) => {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      await supabase.storage.from("posts").remove([post.image_path]);
    },
    onMutate: async (post) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FeedData>(key);
      patchPost(post.id, () => null);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      if (user) qc.invalidateQueries({ queryKey: ["profile-photos", user.id] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ blob, caption, task }: CreatePostInput) => {
      if (!user) throw new Error("Sin sesión");
      const path = `${user.id}/${crypto.randomUUID()}.webp`;
      const up = await supabase.storage.from("posts").upload(path, blob, { contentType: "image/webp", upsert: false });
      if (up.error) throw up.error;
      const { error } = await supabase.from("posts").insert({
        image_path: path,
        caption: caption?.trim().slice(0, 200) || null,
        task_id: task?.id ?? null,
        task_title: task?.title ? task.title.slice(0, 120) : null,
      });
      if (error) {
        await supabase.storage.from("posts").remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      if (user) qc.invalidateQueries({ queryKey: ["profile-photos", user.id] });
    },
  });

  const posts = query.data?.pages.flatMap((pg) => pg.posts) ?? [];

  return {
    ...query,
    posts,
    toggleReaction,
    deletePost: deleteMutation.mutateAsync,
    createPost: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
