import { memo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useFeed, type FeedPost } from "@/hooks/useFeed";
import { avatarSrc } from "@/lib/avatars";
import { playSfx } from "@/lib/sfx";
import { timeAgo } from "@/components/clan/timeAgo";
import { useOpenProfile } from "@/components/social/ProfileSheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const DOUBLE_TAP_MS = 300;

function EmptyArt() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-28" aria-hidden fill="none">
      <path d="M16 18l1.6 3.4L21 23l-3.4 1.6L16 28l-1.6-3.4L11 23l3.4-1.6z" className="fill-primary/60" />
      <path d="M100 10l1.2 2.6 2.8 1.2-2.8 1.2L100 18l-1.2-2.8-2.8-1.2 2.8-1.2z" className="fill-primary/40" />
      <circle cx="104" cy="70" r="2" className="fill-primary/40" />
      <circle cx="12" cy="66" r="1.5" className="fill-primary/30" />
      <rect x="26" y="32" width="68" height="48" rx="12" className="stroke-muted-foreground/60" strokeWidth="3" />
      <path d="M46 32l5-8h18l5 8" className="stroke-muted-foreground/60" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="56" r="13" className="stroke-primary" strokeWidth="3" />
      <circle cx="60" cy="56" r="5" className="fill-primary/30" />
      <circle cx="82" cy="42" r="2.5" className="fill-muted-foreground/60" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="surface rounded-3xl p-3" aria-hidden>
      <div className="flex items-center gap-2.5 px-1 pb-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-muted" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

interface CardProps {
  post: FeedPost;
  mine: boolean;
  index: number;
  reduce: boolean;
  onReact: (id: string, force?: boolean) => void;
  onDelete: (post: FeedPost) => void;
  onOpenProfile: (userId: string) => void;
}

const PostCard = memo(function PostCard({ post, mine, index, reduce, onReact, onDelete, onOpenProfile }: CardProps) {
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(0);
  const name = post.author?.display_name || post.author?.username || "Usuario";

  const onPhotoTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setBurst((b) => b + 1);
      if (!post.reacted) { playSfx("complete"); onReact(post.id, true); }
    } else {
      lastTap.current = now;
    }
  };

  return (
    <m.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : Math.min(index % 15, 6) * 0.05 }}
      className="surface rounded-3xl p-3"
    >
      <header className="flex items-center gap-2.5 px-1 pb-3">
        <button
          type="button"
          onClick={() => onOpenProfile(post.user_id)}
          className="flex min-w-0 items-center gap-2.5 rounded-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={avatarSrc(post.author?.avatar_url, post.user_id)}
            alt=""
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-full bg-muted object-cover"
          />
          <span className="truncate text-sm font-semibold">{name}</span>
        </button>
        <span className="shrink-0 text-xs text-muted-foreground">· {timeAgo(post.created_at)}</span>
        {mine && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-full" aria-label="Opciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(post)}>
                <Trash2 className="mr-2 h-4 w-4" />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div
        className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl bg-muted [-webkit-touch-callout:none] [touch-action:manipulation]"
        onClick={onPhotoTap}
      >
        {post.url && (
          <img src={post.url} alt={post.caption || post.task_title || ""} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
        )}
        <AnimatePresence>
          {burst > 0 && (
            <m.span
              key={burst}
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-8xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
              animate={reduce ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.05] }}
              transition={{ duration: reduce ? 0.6 : 0.8, times: reduce ? undefined : [0, 0.25, 0.7, 1], ease: "easeOut" }}
              onAnimationComplete={() => setBurst(0)}
            >
              🔥
            </m.span>
          )}
        </AnimatePresence>
      </div>

      <footer className="flex flex-col gap-2 px-1 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <m.button
            type="button"
            aria-pressed={post.reacted}
            aria-label="Fuego"
            whileTap={reduce ? undefined : { scale: 0.88 }}
            onClick={() => { playSfx("click"); onReact(post.id); }}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums transition-colors",
              post.reacted ? "bg-primary/15 text-primary ring-1 ring-primary/40" : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            <span className={cn("text-base leading-none transition-[filter]", !post.reacted && "grayscale")}>🔥</span>
            {post.reactions}
          </m.button>
          {post.task_title && (
            <span className="max-w-full truncate rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              ✓ {post.task_title}
            </span>
          )}
        </div>
        {post.caption && <p className="whitespace-pre-line break-words text-sm leading-relaxed">{post.caption}</p>}
      </footer>
    </m.article>
  );
});

export default function FeedPanel() {
  const { user } = useAuth();
  const reduce = !!useReducedMotion();
  const openProfile = useOpenProfile();
  const { posts, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage, toggleReaction, deletePost } = useFeed();

  const onReact = (id: string, force?: boolean) => toggleReaction(id, { force });
  const onDelete = (post: FeedPost) => {
    deletePost(post).then(
      () => toast.success("Publicación eliminada"),
      () => toast.error("No se pudo eliminar"),
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Button variant="outline" className="rounded-full" onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3 py-14 text-center"
      >
        <EmptyArt />
        <p className="text-sm font-medium text-muted-foreground">Sin publicaciones</p>
      </m.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((p, i) => (
        <PostCard
          key={p.id}
          post={p}
          index={i}
          mine={p.user_id === user?.id}
          reduce={reduce}
          onReact={onReact}
          onDelete={onDelete}
          onOpenProfile={openProfile}
        />
      ))}
      {hasNextPage && (
        <Button
          variant="outline"
          className="mx-auto h-10 rounded-full px-6"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Cargando…" : "Cargar más"}
        </Button>
      )}
    </div>
  );
}
