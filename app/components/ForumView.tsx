import { SelectField } from "@/components/SelectField";
import { PageHeader } from "@/components/buzz/PageHeader";
import { useMemo, useState, type SyntheticEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  Bookmark,
  Check,
  CircleHelp,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  ThumbsUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Reply = { id: string; author: string; initials: string; text: string; time: string };
type Topic = {
  id: string;
  title: string;
  body: string;
  category: string;
  author: string;
  initials: string;
  time: string;
  pinned: boolean;
  likes: number;
  liked: boolean;
  subscribed: boolean;
  replies: Reply[];
};
const categories = [
  "All discussions",
  "Ideas & feedback",
  "Decisions",
  "Questions",
  "Team updates",
];
const initialTopics: Topic[] = [
  {
    id: "f1",
    title: "How we work with agents at Meridian",
    body: "Our agents are becoming part of the team, so let’s be thoughtful about how we work together.\n\nA few starting principles:\n\n1. Give an agent an outcome, useful context, and a clear owner.\n2. Keep sensitive work on local compute whenever the data policy calls for it.\n3. Review external messages and material changes before they happen.\n4. Share what you learn so every team benefits.\n\nThis is a living conversation. What would make working with agents more useful for your team?",
    category: "Team updates",
    author: "Maya Chen",
    initials: "MC",
    time: "2 hours ago",
    pinned: true,
    likes: 18,
    liked: false,
    subscribed: false,
    replies: [
      {
        id: "r1",
        author: "Alex Morgan",
        initials: "AM",
        text: "Clear ownership is the big one for engineering. Every agent task should have someone who can make the final call.",
        time: "1 hour ago",
      },
      {
        id: "r2",
        author: "Jordan Lee",
        initials: "JL",
        text: "Love this. We could add a few great examples to the onboarding guide so new teammates have somewhere to start.",
        time: "42 minutes ago",
      },
    ],
  },
  {
    id: "f2",
    title: "Proposal: a shared customer context layer",
    body: "Engineering, Operations, and Customer Success often have different pieces of the same customer story.\n\nI’d like to explore a shared context collection that brings together approved account notes, product decisions, and launch plans. Agents could use it to answer questions with sources, while keeping confidential records scoped to the right team.\n\nWhat information do you find yourself asking another team for most often?",
    category: "Ideas & feedback",
    author: "Jordan Lee",
    initials: "JL",
    time: "4 hours ago",
    pinned: false,
    likes: 12,
    liked: false,
    subscribed: false,
    replies: [
      {
        id: "r3",
        author: "Maya Chen",
        initials: "MC",
        text: "The latest agreed launch scope. That one gets lost between the account notes and engineering conversations.",
        time: "3 hours ago",
      },
    ],
  },
  {
    id: "f3",
    title: "Decision: restricted data stays on our local agents",
    body: "We have aligned on a default for the pilot: restricted company data should be assigned only to locally hosted agents.\n\nThe interface should make the compute location visible before anyone shares context. Any change to this policy should have a named owner and a recorded decision.",
    category: "Decisions",
    author: "Alex Morgan",
    initials: "AM",
    time: "Yesterday",
    pinned: false,
    likes: 9,
    liked: false,
    subscribed: false,
    replies: [],
  },
  {
    id: "f4",
    title: "What’s a great first workflow for Operations?",
    body: "We’re setting up our first team agent and looking for a small, useful place to start.\n\nThe weekly customer health summary seems promising: gather updates, flag open questions, and prepare a short draft for a person to review.\n\nHas anyone tried something similar? I’d love to hear where it helped and where it needed more guidance.",
    category: "Questions",
    author: "Sam Rivera",
    initials: "SR",
    time: "Yesterday",
    pinned: false,
    likes: 6,
    liked: false,
    subscribed: false,
    replies: [
      {
        id: "r4",
        author: "Jordan Lee",
        initials: "JL",
        text: "Start with the draft and review step. It is immediately useful, and the team learns how to give better context.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "f5",
    title: "This week’s small wins",
    body: "A space for the progress that might not make a launch announcement.\n\nWe cut down the time spent collecting onboarding context, connected our first local agent, and gave the launch team one shared view of open work.\n\nWhat made your week a little better?",
    category: "Team updates",
    author: "Maya Chen",
    initials: "MC",
    time: "2 days ago",
    pinned: false,
    likes: 14,
    liked: false,
    subscribed: false,
    replies: [],
  },
];

export function ForumView({ onNotify }: { onNotify?: (message: string) => void }) {
  const [topics, setTopics] = useState(initialTopics);
  const [category, setCategory] = useState("All discussions");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Latest");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newCategory, setNewCategory] = useState("Ideas & feedback");
  const [reply, setReply] = useState("");
  const [subscribedOnly, setSubscribedOnly] = useState(false);
  const active = topics.find((topic) => topic.id === activeId);
  const visible = useMemo(
    () =>
      topics
        .filter(
          (topic) =>
            (category === "All discussions" || topic.category === category) &&
            `${topic.title} ${topic.body}`.toLowerCase().includes(search.toLowerCase()) &&
            (!subscribedOnly || topic.subscribed),
        )
        .sort(
          (a, b) =>
            Number(b.pinned) - Number(a.pinned) ||
            (sort === "Most appreciated"
              ? b.likes - a.likes
              : sort === "Most discussed"
                ? b.replies.length - a.replies.length
                : 0),
        ),
    [topics, category, search, sort, subscribedOnly],
  );
  function updateTopic(id: string, changes: Partial<Topic>) {
    setTopics((items) =>
      items.map((topic) => (topic.id === id ? { ...topic, ...changes } : topic)),
    );
  }
  function toggleLike(topic: Topic) {
    updateTopic(topic.id, { liked: !topic.liked, likes: topic.likes + (topic.liked ? -1 : 1) });
  }
  function createTopic(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const id = crypto.randomUUID();
    setTopics((items) => [
      {
        id,
        title: title.trim(),
        body: body.trim(),
        category: newCategory,
        author: "You",
        initials: "YO",
        time: "Just now",
        pinned: false,
        likes: 0,
        liked: false,
        subscribed: true,
        replies: [],
      },
      ...items,
    ]);
    setCreateOpen(false);
    setTitle("");
    setBody("");
    setActiveId(id);
    onNotify?.("Discussion added.");
  }
  function postReply(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || !reply.trim()) return;
    updateTopic(active.id, {
      replies: [
        ...active.replies,
        {
          id: crypto.randomUUID(),
          author: "You",
          initials: "YO",
          text: reply.trim(),
          time: "Just now",
        },
      ],
    });
    setReply("");
    onNotify?.("Reply added in this browser");
  }

  return (
    <div className="page work-page">
      <PageHeader
        className="page-heading"
        title="Forum"
        action={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={17} />
            New discussion
          </button>
        }
      />
      <div className="work-forum-layout">
        <aside className="work-forum-sidebar">
          <span className="work-sidebar-label">BROWSE</span>
          {categories.map((item, index) => (
            <button
              key={item}
              className={category === item && !active && !subscribedOnly ? "active" : ""}
              onClick={() => {
                setCategory(item);
                setActiveId(null);
                setSubscribedOnly(false);
              }}
            >
              {index === 0 ? (
                <MessageSquare size={17} />
              ) : index === 1 ? (
                <Lightbulb size={17} />
              ) : index === 2 ? (
                <Check size={17} />
              ) : index === 3 ? (
                <CircleHelp size={17} />
              ) : (
                <MessageCircle size={17} />
              )}
              <span>{item}</span>
              <span className="work-category-count">
                {item === "All discussions"
                  ? topics.length
                  : topics.filter((topic) => topic.category === item).length}
              </span>
            </button>
          ))}
          <div className="divider" />
          <button
            className={subscribedOnly && !active ? "active" : ""}
            onClick={() => {
              setSubscribedOnly(true);
              setCategory("All discussions");
              setActiveId(null);
            }}
          >
            <Bookmark size={17} />
            <span>Following</span>
            <span className="work-category-count">
              {topics.filter((topic) => topic.subscribed).length}
            </span>
          </button>
          <div className="work-forum-tip">
            <span className="work-symbol work-symbol-amber">
              <Lightbulb size={19} />
            </span>
            <strong>Make room for a good idea.</strong>
            <p>
              Use the forum for conversations worth coming back to. Keep quick updates in channels.
            </p>
          </div>
        </aside>
        <div className="work-forum-main">
          {active ? (
            <article className="work-topic-detail">
              <button className="btn btn-ghost work-back" onClick={() => setActiveId(null)}>
                <ArrowLeft size={16} />
                Back to discussions
              </button>
              <div className="work-topic-topline">
                <span
                  className={`work-topic-category work-category-${active.category.split(" ")[0].toLowerCase()}`}
                >
                  {active.category}
                </span>
                {active.pinned && (
                  <span className="work-pinned">
                    <Pin size={13} />
                    Pinned
                  </span>
                )}
              </div>
              <h2>{active.title}</h2>
              <div className="work-topic-author">
                <span className="avatar">{active.initials}</span>
                <strong>{active.author}</strong>
                <span>{active.time}</span>
              </div>
              <div className="work-topic-body">{active.body}</div>
              <div className="work-topic-actions">
                <button
                  className={`btn btn-secondary ${active.liked ? "work-liked" : ""}`}
                  aria-pressed={active.liked}
                  onClick={() => toggleLike(active)}
                >
                  <ThumbsUp size={16} />
                  {active.likes} {active.liked ? "Appreciated" : "Appreciate"}
                </button>
                <button
                  className="btn btn-ghost"
                  aria-pressed={active.subscribed}
                  onClick={() => updateTopic(active.id, { subscribed: !active.subscribed })}
                >
                  {active.subscribed ? <BellOff size={16} /> : <Bell size={16} />}
                  {active.subscribed ? "Unfollow discussion" : "Follow discussion"}
                </button>
              </div>
              <div className="work-topic-replies">
                <h3>
                  {active.replies.length} {active.replies.length === 1 ? "reply" : "replies"}
                </h3>
                {active.replies.map((item) => (
                  <div className="work-forum-reply" key={item.id}>
                    <span className="avatar">{item.initials}</span>
                    <div>
                      <div>
                        <strong>{item.author}</strong>
                        <span>{item.time}</span>
                      </div>
                      <p>{item.text}</p>
                    </div>
                  </div>
                ))}
                <form className="work-reply-compose" onSubmit={postReply}>
                  <label htmlFor="forum-reply" className="field-label">
                    Add to the conversation
                  </label>
                  <textarea
                    className="textarea"
                    id="forum-reply"
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Share a thought, a question, or another perspective…"
                    maxLength={10000}
                    required
                  />
                  <div>
                    <button type="submit" className="btn btn-primary" disabled={!reply.trim()}>
                      <Send size={15} />
                      Post reply
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ) : (
            <>
              <div className="work-forum-heading">
                <h2>{subscribedOnly ? "Following" : category}</h2>
                <SelectField
                  aria-label="Sort discussions"
                  className="select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option>Latest</option>
                  <option>Most appreciated</option>
                  <option>Most discussed</option>
                </SelectField>
              </div>
              <label className="work-search work-forum-search">
                <Search size={17} />
                <input
                  aria-label="Search discussions"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a discussion…"
                />
              </label>
              <div className="work-topic-list">
                {visible.map((topic) => (
                  <article className="work-topic-card" key={topic.id}>
                    <div className="work-topic-topline">
                      <span
                        className={`work-topic-category work-category-${topic.category.split(" ")[0].toLowerCase()}`}
                      >
                        {topic.category}
                      </span>
                      {topic.pinned && (
                        <span className="work-pinned">
                          <Pin size={12} />
                          Pinned
                        </span>
                      )}
                    </div>
                    <button
                      className="work-topic-title"
                      onClick={() => {
                        setActiveId(topic.id);
                        setReply("");
                      }}
                    >
                      {topic.title}
                      <ArrowUpRight size={17} />
                    </button>
                    <p className="work-topic-excerpt">{topic.body.split("\n")[0]}</p>
                    <div className="work-topic-card-footer">
                      <span className="work-topic-author">
                        <span className="avatar">{topic.initials}</span>
                        <strong>{topic.author}</strong>
                        <span>{topic.time}</span>
                      </span>
                      <span className="work-topic-engagement">
                        <button
                          aria-label={`${topic.liked ? "Remove appreciation from" : "Appreciate"} ${topic.title}`}
                          aria-pressed={topic.liked}
                          className={topic.liked ? "work-liked" : ""}
                          onClick={() => toggleLike(topic)}
                        >
                          <ThumbsUp size={14} />
                          {topic.likes}
                        </button>
                        <button
                          aria-label={`View ${topic.replies.length} replies to ${topic.title}`}
                          onClick={() => {
                            setActiveId(topic.id);
                            setReply("");
                          }}
                        >
                          <MessageSquare size={14} />
                          {topic.replies.length}
                        </button>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
              {!visible.length && (
                <div className="empty-state">
                  <MessageCircle size={30} />
                  <h3>
                    {subscribedOnly
                      ? "Your reading list starts here"
                      : "Room for a new conversation"}
                  </h3>
                  <p>
                    {subscribedOnly
                      ? "Follow a discussion to keep it close at hand."
                      : "No discussions match these filters."}
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearch("");
                      setCategory("All discussions");
                      setSubscribedOnly(false);
                    }}
                  >
                    Browse all discussions
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="work-dialog work-dialog-wide">
          <DialogHeader>
            <DialogTitle>Start a discussion</DialogTitle>
            <DialogDescription>Start a discussion.</DialogDescription>
          </DialogHeader>
          <form className="work-form" onSubmit={createTopic}>
            <label className="field">
              <span className="field-label">Title</span>
              <input
                className="input"
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What’s on your mind?"
              />
            </label>
            <label className="field">
              <span className="field-label">Category</span>
              <SelectField
                className="select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {categories.slice(1).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </SelectField>
            </label>
            <label className="field">
              <span className="field-label">Your post</span>
              <textarea
                className="textarea"
                required
                rows={7}
                maxLength={20000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Set the context, share your perspective, and invite others in…"
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Post discussion
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
