"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type QuickAction = {
  title: string;
  description: string;
  icon: string;
};

type ActivityEntry = {
  time: string;
  label: string;
  meta: string;
};

type ChecklistItem = {
  label: string;
  done: boolean;
};

type BuildStream = {
  name: string;
  status: string;
  description: string;
  checklist: ChecklistItem[];
};

type LiveSignal = {
  id: string;
  label: string;
  value: string;
  tone: "ok" | "warn" | "info";
};

type Character = {
  id: string;
  name: string;
  slug: string;
  archetype: string | null;
  description: string | null;
  look: string | null;
  cta: string | null;
  marketing_hook: string | null;
  tone: string | null;
  color: string | null;
};

const quickActions: QuickAction[] = [
  {
    title: "New Tool",
    description: "Generate a blank scaffold with routing and data hooks.",
    icon: "🛠️",
  },
  {
    title: "Automation",
    description: "Connect triggers to scripts or webhooks in seconds.",
    icon: "⚡",
  },
  {
    title: "Data Feed",
    description: "Wire up APIs, spreadsheets, or DB snapshots.",
    icon: "📡",
  },
];

const defaultBuildStreams: BuildStream[] = [
  {
    name: "Toolsmith",
    status: "3 drafts",
    description:
      "Blueprint, preview, and iterate on internal interfaces before wiring them to data.",
    checklist: [
      { label: "Canvas templates", done: false },
      { label: "Component library", done: false },
      { label: "Version snapshots", done: false },
    ],
  },
  {
    name: "Automations",
    status: "2 live",
    description:
      "Pair UI actions with scripts, queues, or outbound webhooks—no copy/paste ops.",
    checklist: [
      { label: "Trigger matrix", done: false },
      { label: "Runbooks", done: false },
      { label: "Audit trail", done: false },
    ],
  },
  {
    name: "Telemetry",
    status: "5 feeds",
    description:
      "Aggregate metrics, alerts, and AI signals into a single control room view.",
    checklist: [
      { label: "API bridges", done: false },
      { label: "Signal scoring", done: false },
      { label: "Digest scheduling", done: false },
    ],
  },
];

const defaultLiveSignals: LiveSignal[] = [
  { id: "deploy", label: "Deploy queue", value: "Clear", tone: "ok" },
  { id: "credits", label: "AI credits", value: "72%", tone: "warn" },
  { id: "pings", label: "User pings", value: "4 unread", tone: "info" },
];

const defaultReadyNext = ["Embed auth", "Add persistence layer", "Hook up notifications"];

const defaultMissionFocus = [
  "Finalize base UI scaffolding",
  "Document quick-action API contract",
  "Outline first automation (sync CRM → tasks)",
];

const defaultActivityLog: ActivityEntry[] = [
  {
    time: "11:50",
    label: "Synced Notion product tracker",
    meta: "12 items ingested",
  },
  {
    time: "11:32",
    label: "Drafted prompts for backlog triage bot",
    meta: "Needs review",
  },
  {
    time: "11:05",
    label: "Connected Slack alerts to escalation queue",
    meta: "Live",
  },
];

const defaultScratchpad = "• Need Env vars for future DB adapters\n• Draft dataset schema options\n• Decide on auth (Clerk vs custom)";

const STORAGE_KEYS = {
  activity: "mission-control-activity-log",
  missionFocus: "mission-control-mission-focus",
  buildStreams: "mission-control-build-streams",
  liveSignals: "mission-control-live-signals",
  readyNext: "mission-control-ready-next",
  scratchpad: "mission-control-scratchpad",
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(key);
    if (!stored) return;

    try {
      setState(JSON.parse(stored));
    } catch (error) {
      console.warn(`Failed to parse stored value for ${key}`, error);
    }
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}

export default function Home() {
  const [activityLog, setActivityLog] = usePersistentState<ActivityEntry[]>(
    STORAGE_KEYS.activity,
    defaultActivityLog,
  );
  const [missionFocusItems, setMissionFocusItems] = usePersistentState<string[]>(
    STORAGE_KEYS.missionFocus,
    defaultMissionFocus,
  );
  const [buildStreamsState, setBuildStreamsState] = usePersistentState<BuildStream[]>(
    STORAGE_KEYS.buildStreams,
    defaultBuildStreams,
  );
  const [liveSignalsState, setLiveSignalsState] = usePersistentState<LiveSignal[]>(
    STORAGE_KEYS.liveSignals,
    defaultLiveSignals,
  );
  const [readyNextItems, setReadyNextItems] = usePersistentState<string[]>(
    STORAGE_KEYS.readyNext,
    defaultReadyNext,
  );
  const [scratchpad, setScratchpad] = usePersistentState<string>(
    STORAGE_KEYS.scratchpad,
    defaultScratchpad,
  );

  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  const [formState, setFormState] = useState({ title: "", summary: "", nextSteps: "" });
  const [newReadyItem, setNewReadyItem] = useState("");
  const [editingSignal, setEditingSignal] = useState<string | null>(null);
  const [signalDraft, setSignalDraft] = useState<{ value: string; tone: LiveSignal["tone"] }>(
    { value: "", tone: "ok" },
  );
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [charactersError, setCharactersError] = useState<string | null>(null);

  const latestCaptures = useMemo(() => activityLog.slice(0, 3), [activityLog]);

  useEffect(() => {
    let isMounted = true;

    const loadCharacters = async () => {
      try {
        const response = await fetch('/api/characters');
        if (!response.ok) throw new Error('Failed to load characters');
        const payload = await response.json();
        if (isMounted) {
          setCharacters(payload.characters ?? []);
          setCharactersError(null);
        }
      } catch (error) {
        if (isMounted) {
          setCharactersError(
            error instanceof Error ? error.message : 'Unable to load characters',
          );
        }
      } finally {
        if (isMounted) {
          setCharactersLoading(false);
        }
      }
    };

    loadCharacters();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAction = (action: QuickAction) => {
    setSelectedAction(action);
    setFormState({ title: "", summary: "", nextSteps: "" });
  };

  const handleSubmitAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAction) return;

    const trimmedTitle = formState.title.trim() || selectedAction.title;
    const summary = formState.summary.trim();
    const nextSteps = formState.nextSteps
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const newActivity: ActivityEntry = {
      time: formatTime(new Date()),
      label: `${selectedAction.icon} ${selectedAction.title} · ${trimmedTitle}`,
      meta: summary || "Captured via Mission Control",
    };

    const additions = nextSteps.length
      ? nextSteps
      : [`${selectedAction.title}: ${trimmedTitle}`];

    setActivityLog((prev) => [newActivity, ...prev].slice(0, 16));
    setMissionFocusItems((prev) => [...additions, ...prev].slice(0, 10));

    setSelectedAction(null);
    setFormState({ title: "", summary: "", nextSteps: "" });
  };

  const handleCompleteFocusItem = (item: string) => {
    setMissionFocusItems((prev) => prev.filter((entry) => entry !== item));
  };

  const handleAddReadyNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newReadyItem.trim()) return;
    setReadyNextItems((prev) => [...prev, newReadyItem.trim()]);
    setNewReadyItem("");
  };

  const toggleChecklistItem = (streamName: string, label: string) => {
    setBuildStreamsState((prev) =>
      prev.map((stream) =>
        stream.name === streamName
          ? {
              ...stream,
              checklist: stream.checklist.map((item) =>
                item.label === label ? { ...item, done: !item.done } : item,
              ),
            }
          : stream,
      ),
    );
  };

  const updateStreamStatus = (streamName: string, value: string) => {
    setBuildStreamsState((prev) =>
      prev.map((stream) =>
        stream.name === streamName ? { ...stream, status: value } : stream,
      ),
    );
  };

  const startEditingSignal = (signal: LiveSignal) => {
    setEditingSignal(signal.id);
    setSignalDraft({ value: signal.value, tone: signal.tone });
  };

  const handleSignalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSignal) return;

    setLiveSignalsState((prev) =>
      prev.map((signal) =>
        signal.id === editingSignal ? { ...signal, ...signalDraft } : signal,
      ),
    );
    setEditingSignal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="pointer-events-none fixed inset-0 select-none opacity-40" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.20),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(147,51,234,0.18),_transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Mission Control</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
              Ghost & Brandon · Build Ops HQ
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-300">
              A customizable cockpit for spinning up tools, automations, and data feeds the
              moment we need them.
            </p>
          </div>
          <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Status</p>
            <div className="text-3xl font-semibold text-cyan-300">Operational ✅</div>
            <p className="text-sm text-slate-400">Last sync · {formatTime(new Date())} CST</p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-500/5 backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Quick actions</p>
                  <h2 className="text-2xl font-semibold text-white">Spin up the next tool in minutes</h2>
                </div>
                <button className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-300 hover:text-cyan-200">
                  Configure stack
                </button>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {quickActions.map((action) => (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => handleOpenAction(action)}
                    className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-left transition hover:border-cyan-300/60 hover:bg-slate-900/80"
                  >
                    <div className="text-2xl">{action.icon}</div>
                    <div>
                      <p className="text-base font-semibold text-white">{action.title}</p>
                      <p className="text-sm text-slate-400">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ghost roster</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Brand characters</h3>
                  <p className="text-sm text-slate-400">Pulled live from Supabase so the Vault stays accurate.</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                  {charactersLoading ? "Syncing" : "Live"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {charactersLoading && (
                  <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 text-sm text-slate-400">
                    Loading characters…
                  </div>
                )}
                {!charactersLoading && charactersError && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                    {charactersError}
                  </div>
                )}
                {!charactersLoading && !charactersError && characters.length === 0 && (
                  <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 text-sm text-slate-400">
                    No characters yet—add one from the Vault intake form.
                  </div>
                )}
                {!charactersLoading && !charactersError && characters.length > 0 &&
                  characters.map((character) => (
                    <div
                      key={character.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"
                      style={{ borderColor: character.color ?? undefined }}
                    >
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{character.archetype}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{character.name}</p>
                      <p className="mt-2 text-sm text-slate-300">{character.marketing_hook}</p>
                      {character.cta && (
                        <p className="mt-2 text-xs text-slate-400">
                          CTA: <span className="text-slate-200">{character.cta}</span>
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Mission focus</p>
                <h3 className="mt-3 text-xl font-semibold text-white">Ops runway – active queue</h3>
                <ul className="mt-5 space-y-4 text-sm text-slate-300">
                  {missionFocusItems.length === 0 && (
                    <li className="text-slate-500">Queue clear — add a quick action to populate it.</li>
                  )}
                  {missionFocusItems.map((item) => (
                    <li key={item} className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                        {item}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCompleteFocusItem(item)}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-slate-200 transition hover:border-emerald-300 hover:text-emerald-200"
                      >
                        Done
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ready next</p>
                <h3 className="mt-3 text-xl font-semibold text-white">Queued once runway clears</h3>
                <ul className="mt-5 space-y-4 text-sm text-slate-300">
                  {readyNextItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                      {item}
                    </li>
                  ))}
                </ul>
                <form onSubmit={handleAddReadyNext} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newReadyItem}
                    onChange={(event) => setNewReadyItem(event.target.value)}
                    placeholder="Add another task"
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-2xl bg-cyan-400/80 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Activity feed</p>
                <ol className="mt-4 space-y-4 text-sm">
                  {activityLog.map((entry, index) => (
                    <li key={`${entry.time}-${index}`} className="flex gap-3">
                      <div>
                        <div className="text-xs text-slate-500">{entry.time}</div>
                        <div className="font-medium text-white">{entry.label}</div>
                        <div className="text-slate-400">{entry.meta}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Scratchpad</p>
                <textarea
                  value={scratchpad}
                  onChange={(event) => setScratchpad(event.target.value)}
                  rows={10}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                />
                <p className="mt-2 text-xs text-slate-500">Autosaves locally.</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {buildStreamsState.map((stream) => (
                <div
                  key={stream.name}
                  className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-900/30 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-white">{stream.name}</h3>
                    <input
                      type="text"
                      value={stream.status}
                      onChange={(event) => updateStreamStatus(stream.name, event.target.value)}
                      className="w-24 rounded-full border border-white/20 bg-slate-950/40 px-3 py-1 text-center text-xs uppercase tracking-widest text-slate-200 focus:border-cyan-300 focus:outline-none"
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{stream.description}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    {stream.checklist.map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleChecklistItem(stream.name, item.label)}
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                            item.done
                              ? "border-emerald-300 bg-emerald-400/20 text-emerald-200"
                              : "border-white/20 text-slate-400"
                          }`}
                        >
                          {item.done ? "✓" : ""}
                        </button>
                        <span className={item.done ? "line-through text-slate-500" : undefined}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-white transition hover:border-cyan-300 hover:text-cyan-200">
                    Open workspace
                  </button>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Live signals</p>
              <div className="mt-4 space-y-3">
                {liveSignalsState.map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-2xl border border-white/5 bg-slate-900/50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">{signal.label}</p>
                        <p className="text-lg font-semibold text-white">{signal.value}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold uppercase tracking-widest ${
                          signal.tone === "ok"
                            ? "text-emerald-300"
                            : signal.tone === "warn"
                              ? "text-amber-300"
                              : "text-cyan-200"
                        }`}
                      >
                        {signal.tone}
                      </span>
                    </div>
                    {editingSignal === signal.id ? (
                      <form onSubmit={handleSignalSubmit} className="mt-3 space-y-2 text-xs text-slate-300">
                        <input
                          type="text"
                          value={signalDraft.value}
                          onChange={(event) =>
                            setSignalDraft((prev) => ({ ...prev, value: event.target.value }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
                        />
                        <select
                          value={signalDraft.tone}
                          onChange={(event) =>
                            setSignalDraft((prev) => ({
                              ...prev,
                              tone: event.target.value as LiveSignal["tone"],
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:border-cyan-300 focus:outline-none"
                        >
                          <option value="ok">OK</option>
                          <option value="warn">Warn</option>
                          <option value="info">Info</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 rounded-xl bg-emerald-400/80 py-2 text-sm font-semibold text-slate-900"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSignal(null)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditingSignal(signal)}
                        className="mt-3 text-xs text-cyan-200 underline-offset-2 hover:underline"
                      >
                        Adjust signal
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Latest captures</p>
              <ul className="mt-4 space-y-4 text-sm text-slate-300">
                {latestCaptures.map((entry, index) => (
                  <li key={`latest-${entry.time}-${index}`} className="border-b border-white/5 pb-3 last:border-none last:pb-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.time}</p>
                    <p className="mt-1 font-medium text-white">{entry.label}</p>
                    <p className="text-slate-400">{entry.meta}</p>
                  </li>
                ))}
                {latestCaptures.length === 0 && <li className="text-slate-500">No captures yet.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {selectedAction && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="h-full w-full max-w-md border-l border-white/10 bg-slate-900/95 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Capture</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {selectedAction.icon} {selectedAction.title}
                </h2>
                <p className="text-sm text-slate-400">Log the intent, context, and next steps.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
              >
                Close
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmitAction}>
              <label className="block text-sm font-medium text-slate-200">
                Working title
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="e.g. Q2 onboarding flow"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Context / summary
                <textarea
                  value={formState.summary}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, summary: event.target.value }))
                  }
                  rows={4}
                  placeholder="What problem are we solving? What does success look like?"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Next steps (one per line)
                <textarea
                  value={formState.nextSteps}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, nextSteps: event.target.value }))
                  }
                  rows={4}
                  placeholder="Draft spec outline\nList data inputs\nAssign handoff"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                />
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-cyan-400/90 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Save to mission control
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-300 hover:text-cyan-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
