"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────

interface Tweet {
  id: string;
  name: string;
  handle: string;
  content: string;
  time: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  verified: boolean;
}

interface GrokMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Helpers ───────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getColor(handle: string): string {
  const c = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#be123c", "#4f46e5", "#0d9488", "#c026d3"];
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = handle.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Fallback Data ─────────────────────────────────────

const FALLBACK: Tweet[] = [
  { id: "1", name: "Elon Musk", handle: "elonmusk", content: "Starship Flight 8 orbital insertion nominal. Booster catch was perfect. Full payload to orbit confirmed.\n\nMars colony timeline just moved up.", time: "45m", likes: 189000, retweets: 34000, replies: 12400, views: 28000000, verified: true },
  { id: "2", name: "Andrej Karpathy", handle: "karpathy", content: "The biggest unlock in AI right now isn't model size — it's inference-time compute. Let the model think longer and it gets dramatically better at hard problems.\n\nScaling test-time compute is the new frontier.", time: "3h", likes: 28000, retweets: 5600, replies: 892, views: 4200000, verified: true },
  { id: "3", name: "Reuters", handle: "Reuters", content: "BREAKING: SEC approves first spot Ethereum ETF options trading, opening derivatives market to institutional investors effective March 15.", time: "15m", likes: 45000, retweets: 12000, replies: 3400, views: 8900000, verified: true },
  { id: "4", name: "Satya Nadella", handle: "satyanadella", content: "The next 10 years of computing will be fundamentally different from the last 10. AI will be woven into every surface, every application, every interaction.", time: "2h", likes: 42000, retweets: 8400, replies: 1200, views: 2100000, verified: true },
  { id: "5", name: "daniel", handle: "danielcroe", content: "just shipped a side project in 3 hours using cursor + claude. from idea to deployed product before my coffee got cold.\n\nwe are genuinely not going back.", time: "5h", likes: 12000, retweets: 2100, replies: 345, views: 890000, verified: false },
  { id: "6", name: "vitalik.eth", handle: "VitalikButerin", content: "Ethereum's blob throughput just hit a new record. The L2 ecosystem is working exactly as designed.\n\nScaling is no longer a bottleneck. Now the question is: what do we build?", time: "1h", likes: 31000, retweets: 6700, replies: 2300, views: 5800000, verified: true },
  { id: "7", name: "Lex Fridman", handle: "lexfridman", content: "New episode: 4-hour conversation with Geoffrey Hinton on consciousness, AI safety, and whether machines can truly understand.\n\nOne of the most profound conversations I've ever had.", time: "6h", likes: 18000, retweets: 3400, replies: 567, views: 3100000, verified: true },
  { id: "8", name: "Marc Andreessen", handle: "pmarca", content: "Every great technology goes through three phases:\n\n1. \"This is overhyped\"\n2. \"This is dead\"\n3. \"This changed everything\"\n\nAI is somewhere between 1 and 3. Buckle up.", time: "4h", likes: 35000, retweets: 7200, replies: 1800, views: 6400000, verified: true },
];

const TOPICS = [
  { id: "trending", label: "Trending", emoji: "🔥" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "ai", label: "AI", emoji: "🤖" },
  { id: "crypto", label: "Crypto", emoji: "₿" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "politics", label: "Politics", emoji: "🏛" },
  { id: "entertainment", label: "Fun", emoji: "🎬" },
];

const TRENDING = [
  { title: "Starship Flight 8", posts: "89.2K" },
  { title: "#GPT5", posts: "234K" },
  { title: "Ethereum ETF", posts: "156K" },
  { title: "Claude Opus", posts: "123K" },
  { title: "#AIRegulation", posts: "67.4K" },
];

const SUGGESTIONS = [
  { name: "OpenAI", handle: "OpenAI", bio: "Creating safe AGI", verified: true },
  { name: "Anthropic", handle: "AnthropicAI", bio: "AI safety research", verified: true },
  { name: "xAI", handle: "xai", bio: "Understand the universe", verified: true },
];

// ── Components ────────────────────────────────────────

function TopBar({ onGrok }: { onGrok: () => void }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-black/90 backdrop-blur-md border-b border-border h-14">
      <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">
          social<span className="text-accent">ok</span>
        </span>
        <button
          onClick={onGrok}
          className="flex items-center gap-1.5 text-grok hover:opacity-80 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
          </svg>
          <span className="text-sm font-semibold hidden sm:inline">Grok</span>
        </button>
      </div>
    </header>
  );
}

function TopicBar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 px-2 border-b border-border">
      {TOPICS.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div
            className={`w-[66px] h-[66px] rounded-full p-[2.5px] transition-all ${
              active === t.id
                ? "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600"
                : "bg-border"
            }`}
          >
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-2xl">
              {t.emoji}
            </div>
          </div>
          <span
            className={`text-[11px] ${
              active === t.id ? "text-text-primary" : "text-text-secondary"
            }`}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1d9bf0" className="shrink-0">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
    </svg>
  );
}

function PostCard({
  tweet,
  liked,
  bookmarked,
  onLike,
  onBookmark,
}: {
  tweet: Tweet;
  liked: boolean;
  bookmarked: boolean;
  onLike: () => void;
  onBookmark: () => void;
}) {
  const [heartAnim, setHeartAnim] = useState(false);

  function handleLike() {
    if (!liked) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 250);
    }
    onLike();
  }

  return (
    <article className="border-b border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600">
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: getColor(tweet.handle) }}
          >
            {getInitials(tweet.name)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-sm font-semibold truncate">{tweet.name}</span>
          {tweet.verified && <VerifiedBadge />}
          <span className="text-sm text-text-secondary truncate">
            @{tweet.handle}
          </span>
        </div>
        <span className="text-xs text-text-secondary shrink-0">{tweet.time}</span>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {tweet.content}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="group">
            <div
              className={`transition-colors ${
                liked
                  ? "text-danger"
                  : "text-text-primary group-hover:text-danger"
              } ${heartAnim ? "animate-heart" : ""}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
          </button>
          <button className="text-text-primary hover:text-text-secondary transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button className="text-text-primary hover:text-success transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m17 1 4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="m7 23-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
          <button className="text-text-primary hover:text-text-secondary transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
        <button
          onClick={onBookmark}
          className={`transition-colors ${
            bookmarked
              ? "text-accent"
              : "text-text-primary hover:text-text-secondary"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </button>
      </div>

      {/* Engagement */}
      <div className="px-4 pb-3.5 space-y-0.5">
        <p className="text-sm font-semibold">
          {fmt(tweet.likes + (liked ? 1 : 0))} likes
        </p>
        <p className="text-xs text-text-secondary">
          {fmt(tweet.replies)} replies &middot; {fmt(tweet.retweets)} reposts &middot;{" "}
          {fmt(tweet.views)} views
        </p>
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 py-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="px-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-surface" />
            <div className="space-y-1.5 flex-1">
              <div className="w-32 h-3.5 bg-surface rounded" />
              <div className="w-20 h-3 bg-surface rounded" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="w-full h-3.5 bg-surface rounded" />
            <div className="w-full h-3.5 bg-surface rounded" />
            <div className="w-2/3 h-3.5 bg-surface rounded" />
          </div>
          <div className="flex gap-5 mt-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="w-5 h-5 bg-surface rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopSidebar() {
  return (
    <div className="pt-6 space-y-6">
      {/* Profile */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold">
          JD
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">johndoe</p>
          <p className="text-sm text-text-secondary">John Doe</p>
        </div>
        <button className="text-xs text-accent font-bold">Switch</button>
      </div>

      {/* Trending */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-text-secondary">
            Trending on X
          </h3>
        </div>
        {TRENDING.map((t, i) => (
          <div
            key={i}
            className="py-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <p className="text-sm font-semibold">{t.title}</p>
            <p className="text-xs text-text-secondary">{t.posts} posts</p>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-text-secondary">
            Suggested for you
          </h3>
        </div>
        {SUGGESTIONS.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: getColor(s.handle) }}
            >
              {getInitials(s.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold truncate">{s.name}</p>
                {s.verified && <VerifiedBadge size={12} />}
              </div>
              <p className="text-xs text-text-secondary truncate">{s.bio}</p>
            </div>
            <button className="text-xs text-accent font-bold hover:underline">
              Follow
            </button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-text-secondary/40 leading-relaxed">
        Powered by Grok &middot; socialok
      </p>
    </div>
  );
}

function GrokDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<GrokMessage[]>([
    {
      role: "assistant",
      content:
        "Hey, I'm Grok. Ask me anything about what's happening — trending topics, tweet analysis, or whatever's on your mind.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: GrokMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", messages: updated }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.error || data.content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-black border-l border-border z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
            </svg>
            <span className="font-bold text-grok">Grok</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.07] transition-colors text-text-secondary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white rounded-br-sm"
                    : "bg-surface text-text-primary rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-pulse-subtle" />
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-pulse-subtle" style={{ animationDelay: "0.3s" }} />
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-pulse-subtle" style={{ animationDelay: "0.6s" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 bg-surface rounded-full px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask Grok..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="text-grok disabled:opacity-30 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────

export default function Home() {
  const [tweets, setTweets] = useState<Tweet[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState("trending");
  const [grokOpen, setGrokOpen] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const fetchTweets = useCallback(async (topic: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch_tweets", topic }),
      });
      const data = await res.json();
      if (data.tweets && Array.isArray(data.tweets) && data.tweets.length > 0) {
        setTweets(data.tweets);
      } else {
        setTweets(FALLBACK);
      }
    } catch {
      setTweets(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTweets(activeTopic);
  }, [activeTopic, fetchTweets]);

  function handleTopic(id: string) {
    if (id !== activeTopic) {
      setActiveTopic(id);
      setLiked(new Set());
      setBookmarked(new Set());
    }
  }

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar onGrok={() => setGrokOpen(true)} />

      <div className="pt-14 max-w-5xl mx-auto flex justify-center gap-12 px-4">
        {/* Feed */}
        <main className="w-full max-w-[470px]">
          <TopicBar active={activeTopic} onSelect={handleTopic} />

          {loading ? (
            <LoadingSkeleton />
          ) : (
            tweets.map((t) => (
              <PostCard
                key={t.id}
                tweet={t}
                liked={liked.has(t.id)}
                bookmarked={bookmarked.has(t.id)}
                onLike={() => setLiked(toggle(liked, t.id))}
                onBookmark={() => setBookmarked(toggle(bookmarked, t.id))}
              />
            ))
          )}
        </main>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-[300px] shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto no-scrollbar">
          <DesktopSidebar />
        </aside>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-black/90 backdrop-blur-md border-t border-border h-14 flex items-center justify-around px-6 z-40">
        <button className="text-text-primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
        <button className="text-text-secondary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        <button onClick={() => setGrokOpen(true)} className="text-grok">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
          </svg>
        </button>
        <button className="text-text-secondary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </button>
        <button className="text-text-secondary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </button>
      </nav>

      {grokOpen && <GrokDrawer onClose={() => setGrokOpen(false)} />}
    </div>
  );
}
