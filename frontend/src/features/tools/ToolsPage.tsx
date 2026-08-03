import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calculator,
  CloudSun,
  BookMarked,
  Newspaper,
  AlertCircle,
  CheckCircle2,
  Zap,
  ArrowRight,
  Globe,
  Hash,
  Wind,
  FileText,
  ListChecks,
  ScanSearch,
  X,
  ChevronRight,
  Info,
  Settings2,
  Cpu,
  MessageSquareCode,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type ToolStatus = 'active' | 'needs-config';
type ToolCategory = 'Search' | 'Math' | 'Weather' | 'Productivity';

interface ToolCapability {
  icon: React.ReactNode;
  label: string;
  detail: string;
}

interface ExamplePrompt {
  text: string;
}

interface ArchStep {
  step: string;
  label: string;
  detail: string;
}

interface ToolDefinition {
  id: string;
  name: string;
  subtitle: string;
  category: ToolCategory;
  status: ToolStatus;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  accentColor: string;
  capabilities: ToolCapability[];
  examples: ExamplePrompt[];
  poweredBy: string;
  apiRequired: boolean;
  /** Step-by-step architecture / data-flow for the modal */
  archSteps: ArchStep[];
  /** Config guide shown in the modal */
  configSteps?: string[];
  /** Deeper "how it works" prose for the modal */
  howItWorks: string;
}

// ── Tool Definitions ────────────────────────────────────────────────────────────

const TOOLS: ToolDefinition[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    subtitle: 'Real-time internet lookup',
    category: 'Search',
    status: 'active',
    description:
      'Search the web in real time using DuckDuckGo — privacy-first, no API key needed.',
    longDescription:
      'Retrieves up to 3 top results per query and delivers a concise, voice-friendly summary. Ideal for factual questions, current events, and topic overviews.',
    icon: <Search size={22} />,
    gradientFrom: 'rgba(59,130,246,0.18)',
    gradientTo: 'rgba(99,102,241,0.06)',
    glowColor: 'rgba(59,130,246,0.22)',
    accentColor: '#3b82f6',
    capabilities: [
      { icon: <Globe size={13} />, label: 'General web search', detail: 'Queries DuckDuckGo\'s HTML search endpoint, scrapes the top organic results.' },
      { icon: <ScanSearch size={13} />, label: 'Top-3 result summaries', detail: 'Title, URL, and snippet extracted per result, then synthesised into one concise answer.' },
      { icon: <Zap size={13} />, label: 'No API key required', detail: 'Uses DuckDuckGo\'s public endpoint — completely free with no registration.' },
    ],
    examples: [
      { text: '"Search for the latest developments in quantum computing"' },
      { text: '"What is the capital of New Zealand?"' },
      { text: '"Find information about React Server Components"' },
    ],
    poweredBy: 'DuckDuckGo Search',
    apiRequired: false,
    howItWorks:
      'The agent receives your voice query, detects that a web lookup is needed, and calls the web_search tool with a cleaned search string. The tool sends an HTTP GET to DuckDuckGo, parses the HTML response with BeautifulSoup, extracts the top 3 result titles and snippets, and returns them as a structured list. The LLM then summarises those results into a single, voice-friendly sentence.',
    archSteps: [
      { step: '1', label: 'Voice → ASR', detail: 'Groq Whisper transcribes your speech to text in real time.' },
      { step: '2', label: 'LLM Intent', detail: 'LangGraph\'s LLM node decides a web search is needed and calls web_search(query).' },
      { step: '3', label: 'DuckDuckGo HTTP', detail: 'Tool sends GET request to DuckDuckGo. No API key. Results arrive in <300ms.' },
      { step: '4', label: 'Parse & Rank', detail: 'BeautifulSoup parses the HTML. Top 3 organic snippets are extracted.' },
      { step: '5', label: 'Summarise → TTS', detail: 'LLM synthesises a concise answer. Cartesia renders it as speech.' },
    ],
  },
  {
    id: 'news-search',
    name: 'News Search',
    subtitle: 'Live news & current events',
    category: 'Search',
    status: 'active',
    description:
      'Fetches the latest headlines and breaking news from DuckDuckGo News — always up to date.',
    longDescription:
      'Pulls recent news articles from verified sources and summarises them in a voice-friendly format. Great for staying informed on any topic without leaving the conversation.',
    icon: <Newspaper size={22} />,
    gradientFrom: 'rgba(34,211,238,0.16)',
    gradientTo: 'rgba(59,130,246,0.06)',
    glowColor: 'rgba(34,211,238,0.2)',
    accentColor: '#22d3ee',
    capabilities: [
      { icon: <Newspaper size={13} />, label: 'Breaking news headlines', detail: 'Queries the DuckDuckGo News vertical — returns articles published within hours.' },
      { icon: <Globe size={13} />, label: 'Source attribution', detail: 'Each result includes the publisher name and publication time.' },
      { icon: <Zap size={13} />, label: 'Real-time results', detail: 'No cached index — articles are fetched live on every query.' },
    ],
    examples: [
      { text: '"What\'s in the news about artificial intelligence today?"' },
      { text: '"Get me the latest news on climate change"' },
      { text: '"Recent headlines about the stock market"' },
    ],
    poweredBy: 'DuckDuckGo News',
    apiRequired: false,
    howItWorks:
      'Identical pipeline to Web Search but targets DuckDuckGo\'s News vertical (?ia=news). The parser extracts article titles, source names, and publication timestamps. Results are ranked by recency and the top 3 are summarised. Because DuckDuckGo indexes from thousands of verified publishers, no individual news API subscription is needed.',
    archSteps: [
      { step: '1', label: 'Voice → ASR', detail: 'Groq Whisper transcribes your spoken query.' },
      { step: '2', label: 'LLM Intent', detail: 'LangGraph detects a news query and calls search_news(query).' },
      { step: '3', label: 'DuckDuckGo News', detail: 'HTTP GET to DDG News vertical. Recency filter applied automatically.' },
      { step: '4', label: 'Parse Headlines', detail: 'Title, source, and timestamp extracted per article. Top 3 returned.' },
      { step: '5', label: 'Summarise → TTS', detail: 'LLM synthesises a live news briefing. Cartesia speaks it aloud.' },
    ],
  },
  {
    id: 'calculator',
    name: 'Calculator',
    subtitle: 'Safe mathematical evaluator',
    category: 'Math',
    status: 'active',
    description:
      'Evaluates any mathematical expression offline using a secure AST parser — no eval(), no risk.',
    longDescription:
      'Supports arithmetic, algebra, trigonometry, logarithms, and common constants (π, e). Completely offline and injection-safe — expressions are parsed via Python\'s AST module, not eval().',
    icon: <Calculator size={22} />,
    gradientFrom: 'rgba(168,85,247,0.18)',
    gradientTo: 'rgba(99,102,241,0.06)',
    glowColor: 'rgba(168,85,247,0.22)',
    accentColor: '#a855f7',
    capabilities: [
      { icon: <Hash size={13} />, label: 'Arithmetic & algebra', detail: 'All four operators, exponentiation (**), modulo (%), and parentheses.' },
      { icon: <Hash size={13} />, label: 'Trig: sin, cos, tan', detail: 'Also asin, acos, atan — all in radians, with degree conversion helpers.' },
      { icon: <Hash size={13} />, label: 'sqrt, log, exp, ceil, floor', detail: 'From Python\'s math module, safely whitelisted in the AST evaluator.' },
      { icon: <Hash size={13} />, label: 'Constants: π and e', detail: 'Recognised as "pi" and "e" in expressions — no special syntax needed.' },
    ],
    examples: [
      { text: '"What is 13 multiplied by 19?"' },
      { text: '"Calculate the square root of 144"' },
      { text: '"What is sin(pi divided by 2)?"' },
    ],
    poweredBy: 'Python AST (offline)',
    apiRequired: false,
    howItWorks:
      'The LLM converts your natural-language math question into a clean expression string (e.g. "sin(pi/2)"). The calculator tool parses this string using Python\'s ast.parse() — never eval() — so arbitrary code execution is impossible. Only numeric literals, whitelisted operators, and whitelisted math functions can appear in the AST. The result is returned as a float and formatted naturally by the LLM ("The answer is 1.0").',
    archSteps: [
      { step: '1', label: 'Voice → ASR', detail: 'Groq Whisper captures the math question.' },
      { step: '2', label: 'LLM → Expression', detail: 'LangGraph LLM converts "13 times 19" → "13 * 19" as a clean string.' },
      { step: '3', label: 'AST Parse', detail: 'ast.parse() builds a safe syntax tree. Only allowed nodes pass through.' },
      { step: '4', label: 'Evaluate', detail: 'The AST is walked recursively. Result is a Python float — no network call.' },
      { step: '5', label: 'Format → TTS', detail: 'LLM formats the number naturally. Cartesia speaks the answer.' },
    ],
  },
  {
    id: 'weather',
    name: 'Weather',
    subtitle: 'Current conditions worldwide',
    category: 'Weather',
    status: 'active',
    description:
      'Fetches live weather for any city using Open-Meteo — temperature, humidity, wind, and sky conditions.',
    longDescription:
      'Two-step process: city name is geocoded to coordinates, then live weather data is fetched from Open-Meteo. Returns temperature, feels-like, humidity, wind speed, and a human-readable sky condition.',
    icon: <CloudSun size={22} />,
    gradientFrom: 'rgba(16,185,129,0.18)',
    gradientTo: 'rgba(34,211,238,0.06)',
    glowColor: 'rgba(16,185,129,0.22)',
    accentColor: '#10b981',
    capabilities: [
      { icon: <Wind size={13} />, label: 'Temperature & feels-like', detail: 'Current temperature and apparent temperature from Open-Meteo WMO data.' },
      { icon: <Wind size={13} />, label: 'Wind speed & humidity', detail: 'Wind speed in km/h and relative humidity as percentage.' },
      { icon: <Globe size={13} />, label: 'Any city worldwide', detail: 'Open-Meteo Geocoding API maps city names to lat/lon — covers 200k+ locations.' },
      { icon: <Zap size={13} />, label: 'No API key required', detail: 'Open-Meteo is fully free and open for non-commercial use.' },
    ],
    examples: [
      { text: '"What\'s the weather like in Tokyo?"' },
      { text: '"Current weather in New York"' },
      { text: '"Is it raining in London right now?"' },
    ],
    poweredBy: 'Open-Meteo API',
    apiRequired: false,
    howItWorks:
      'Step 1: the city name is sent to Open-Meteo\'s geocoding endpoint which returns latitude/longitude. Step 2: those coordinates are used to query the Open-Meteo forecast API for the current-hour weather variables (temperature_2m, apparent_temperature, wind_speed_10m, relative_humidity_2m, weathercode). The WMO weather code is mapped to a human-readable description ("partly cloudy", "heavy rain", etc.) and the LLM assembles a natural voice response.',
    archSteps: [
      { step: '1', label: 'Voice → ASR', detail: 'Groq Whisper transcribes the city name.' },
      { step: '2', label: 'LLM → Tool call', detail: 'LangGraph calls get_weather(city="London").' },
      { step: '3', label: 'Geocode', detail: 'HTTP GET to Open-Meteo Geocoding. Returns lat/lon in ~80ms.' },
      { step: '4', label: 'Weather API', detail: 'Coordinates sent to Open-Meteo forecast endpoint. Current-hour data returned.' },
      { step: '5', label: 'WMO Decode → TTS', detail: 'Weather code mapped to text. LLM narrates. Cartesia speaks.' },
    ],
  },
  {
    id: 'notion-notes',
    name: 'Notion Notes',
    subtitle: 'Save & retrieve personal notes',
    category: 'Productivity',
    status: 'needs-config',
    description:
      'Integrates with your Notion workspace to save, search, and list personal notes via voice commands.',
    longDescription:
      'Connects to a Notion database using your personal integration token. You can dictate notes hands-free and retrieve them by keyword search. Requires a Notion API key and a shared database ID configured in your .env file.',
    icon: <BookMarked size={22} />,
    gradientFrom: 'rgba(245,158,11,0.15)',
    gradientTo: 'rgba(239,68,68,0.06)',
    glowColor: 'rgba(245,158,11,0.2)',
    accentColor: '#f59e0b',
    capabilities: [
      { icon: <FileText size={13} />, label: 'Save notes by voice', detail: 'Dictate any text — the tool creates a new Notion page with title + body.' },
      { icon: <ScanSearch size={13} />, label: 'Search notes by keyword', detail: 'Notion\'s full-text search API finds matching pages across your database.' },
      { icon: <ListChecks size={13} />, label: 'List recent notes', detail: 'Returns the last N pages sorted by created_time descending.' },
      { icon: <BookMarked size={13} />, label: 'Tag support', detail: 'Tags are stored as a multi-select Notion property for later filtering.' },
    ],
    examples: [
      { text: '"Save a note: Buy groceries — milk, eggs, bread"' },
      { text: '"Search my notes for project ideas"' },
      { text: '"List my recent notes"' },
    ],
    poweredBy: 'Notion API',
    apiRequired: true,
    howItWorks:
      'The Notion tool uses the official Notion API client. On a "save" command, it calls pages.create() with a database_id, page title, and rich-text body block. On "search", it calls search() with a query string and filters to your database. The integration token is stored server-side in your .env — it never touches the frontend.',
    archSteps: [
      { step: '1', label: 'Voice → ASR', detail: 'Groq Whisper captures your dictation or query.' },
      { step: '2', label: 'LLM routes intent', detail: 'LangGraph classifies: save_note, search_notes, or list_notes.' },
      { step: '3', label: 'Notion API call', detail: 'Tool calls pages.create() or search() via the Notion Python SDK.' },
      { step: '4', label: 'Response', detail: 'Page URL or result list returned as structured data.' },
      { step: '5', label: 'Confirm → TTS', detail: 'LLM confirms "Note saved!" or reads search results aloud.' },
    ],
    configSteps: [
      'Go to notion.so/my-integrations → New Integration → copy the Internal Integration Token.',
      'Open your target Notion database → Share → Invite your integration.',
      'Copy the Database ID from the database URL (the 32-char hex string).',
      'Add to your .env file: NOTION_API_KEY=secret_xxx and NOTION_DATABASE_ID=xxx.',
      'Restart the backend. The Notion tool will appear as "Active" on this page.',
    ],
  },
];

// ── Animation variants ──────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  },
};

// ── Sub-components ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ToolStatus }) {
  const isActive = status === 'active';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 100,
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        fontFamily: "'Inter', sans-serif",
        background: isActive
          ? 'rgba(16,185,129,0.12)'
          : 'rgba(245,158,11,0.12)',
        color: isActive ? '#10b981' : '#f59e0b',
        border: `1px solid ${isActive ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
        flexShrink: 0,
      }}
    >
      {isActive ? (
        <CheckCircle2 size={11} strokeWidth={2.5} />
      ) : (
        <AlertCircle size={11} strokeWidth={2.5} />
      )}
      {isActive ? 'Active' : 'Needs Config'}
    </div>
  );
}

function CategoryBadge({
  category,
  accentColor,
}: {
  category: ToolCategory;
  accentColor: string;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        borderRadius: 100,
        fontSize: '0.70rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        fontFamily: "'Inter', sans-serif",
        background: `${accentColor}18`,
        color: accentColor,
        border: `1px solid ${accentColor}28`,
        textTransform: 'uppercase',
      }}
    >
      {category}
    </div>
  );
}

function CapabilityChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: '0.76rem',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        color: '#94a3b8',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span style={{ opacity: 0.75 }}>{icon}</span>
      {label}
    </div>
  );
}

function ExamplePromptRow({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '7px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <ArrowRight
        size={13}
        style={{ marginTop: 2, opacity: 0.4, flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.8rem',
          color: '#7a8aa0',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ── Tool Detail Modal ─────────────────────────────────────────────────────────

function ToolDetailModal({
  tool,
  onClose,
}: {
  tool: ToolDefinition;
  onClose: () => void;
}) {
  // Close on Escape key
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(4,6,12,0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <motion.div
        key="modal-panel"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 22,
          background: 'rgba(10,13,21,0.97)',
          border: `1px solid ${tool.accentColor}28`,
          boxShadow: `0 0 80px ${tool.glowColor}, 0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset`,
          scrollbarWidth: 'none',
        }}
      >
        {/* ── Modal header ── */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            padding: '24px 28px 20px',
            background: 'rgba(10,13,21,0.97)',
            borderBottom: `1px solid ${tool.accentColor}18`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icon */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${tool.accentColor}28, ${tool.accentColor}10)`,
                border: `1px solid ${tool.accentColor}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tool.accentColor,
                flexShrink: 0,
                boxShadow: `0 0 24px ${tool.glowColor}`,
              }}
            >
              {tool.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: '#f0f4ff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {tool.name}
                </h2>
                <CategoryBadge category={tool.category} accentColor={tool.accentColor} />
                <StatusBadge status={tool.status} />
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  color: '#64748b',
                }}
              >
                {tool.subtitle} · Powered by{' '}
                <span style={{ color: tool.accentColor, opacity: 0.85 }}>{tool.poweredBy}</span>
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close tool details"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 10,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#7a8aa0',
                flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = '#f0f4ff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = '#7a8aa0';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Modal body ── */}
        <div style={{ padding: '24px 28px 32px' }}>

          {/* ── Overview ── */}
          <Section icon={<Info size={14} />} title="Overview" accentColor={tool.accentColor}>
            <p
              style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                lineHeight: 1.75,
                color: '#94a3b8',
              }}
            >
              {tool.howItWorks}
            </p>
          </Section>

          {/* ── Data Flow ── */}
          <Section icon={<Cpu size={14} />} title="Data Flow" accentColor={tool.accentColor}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {tool.archSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14 }}>
                  {/* Stepper track */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: `${tool.accentColor}22`,
                        border: `1.5px solid ${tool.accentColor}55`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: tool.accentColor,
                        flexShrink: 0,
                      }}
                    >
                      {s.step}
                    </div>
                    {i < tool.archSteps.length - 1 && (
                      <div
                        style={{
                          width: 1.5,
                          flex: 1,
                          minHeight: 20,
                          background: `linear-gradient(to bottom, ${tool.accentColor}40, transparent)`,
                          margin: '4px 0',
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ paddingBottom: i < tool.archSteps.length - 1 ? 18 : 0, paddingTop: 3 }}>
                    <p
                      style={{
                        margin: '0 0 2px',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#e2e8f0',
                      }}
                    >
                      {s.label}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.78rem',
                        color: '#64748b',
                        lineHeight: 1.6,
                      }}
                    >
                      {s.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Capabilities deep-dive ── */}
          <Section icon={<Zap size={14} />} title="Capabilities" accentColor={tool.accentColor}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tool.capabilities.map((cap, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${tool.accentColor}15`,
                      border: `1px solid ${tool.accentColor}28`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: tool.accentColor,
                      flexShrink: 0,
                    }}
                  >
                    {cap.icon}
                  </div>
                  <div>
                    <p
                      style={{
                        margin: '0 0 2px',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#cbd5e1',
                      }}
                    >
                      {cap.label}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.76rem',
                        color: '#4a5568',
                        lineHeight: 1.55,
                      }}
                    >
                      {cap.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Example voice prompts ── */}
          <Section icon={<MessageSquareCode size={14} />} title="Example Voice Prompts" accentColor={tool.accentColor}>
            <div
              style={{
                borderRadius: 10,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              {tool.examples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 14px',
                    borderBottom: i < tool.examples.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <ChevronRight size={13} style={{ color: tool.accentColor, opacity: 0.7, flexShrink: 0 }} />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      fontStyle: 'italic',
                    }}
                  >
                    {ex.text}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Configuration (only if needed) ── */}
          {tool.apiRequired && tool.configSteps && (
            <Section icon={<Settings2 size={14} />} title="Configuration Guide" accentColor="#f59e0b">
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px solid rgba(245,158,11,0.18)',
                  marginBottom: 12,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.78rem',
                    color: '#f59e0b',
                    fontWeight: 500,
                  }}
                >
                  ⚠️ This tool requires API credentials before it becomes active.
                </p>
              </div>
              <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tool.configSteps.map((step, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8rem',
                      color: '#7a8aa0',
                      lineHeight: 1.65,
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* ── No config needed badge ── */}
          {!tool.apiRequired && (
            <div
              style={{
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.18)',
              }}
            >
              <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8rem',
                  color: '#10b981',
                  fontWeight: 500,
                }}
              >
                No configuration required — this tool works out of the box.
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Section wrapper (modal) ───────────────────────────────────────────────────
function Section({
  icon,
  title,
  accentColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ color: accentColor, opacity: 0.8 }}>{icon}</span>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: '#4a5568',
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ── Tool Card ─────────────────────────────────────────────────────────────────

function ToolCard({
  tool,
  onOpen,
}: {
  tool: ToolDefinition;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.div
      variants={cardVariants}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        position: 'relative',
        borderRadius: 20,
        border: `1px solid ${hovered ? `${tool.accentColor}40` : 'rgba(99,102,241,0.12)'}`,
        background: hovered
          ? `linear-gradient(145deg, ${tool.gradientFrom}, ${tool.gradientTo})`
          : 'rgba(13,16,24,0.7)',
        backdropFilter: 'blur(24px)',
        padding: '28px 28px 24px',
        transition: 'border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
        boxShadow: hovered
          ? `0 0 40px ${tool.glowColor}, 0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset`
          : '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow orb */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${tool.glowColor} 0%, transparent 70%)`,
          opacity: hovered ? 0.5 : 0.15,
          pointerEvents: 'none',
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
        {/* Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${tool.accentColor}28, ${tool.accentColor}10)`,
            border: `1px solid ${tool.accentColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tool.accentColor,
            flexShrink: 0,
            boxShadow: `0 0 20px ${tool.glowColor}`,
            transition: 'box-shadow 0.3s ease',
          }}
        >
          {tool.icon}
        </div>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#f0f4ff',
                letterSpacing: '-0.01em',
              }}
            >
              {tool.name}
            </h3>
            <CategoryBadge category={tool.category} accentColor={tool.accentColor} />
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.78rem',
              color: '#7a8aa0',
              fontWeight: 500,
            }}
          >
            {tool.subtitle}
          </p>
        </div>

        {/* Status badge */}
        <StatusBadge status={tool.status} />
      </div>

      {/* Description */}
      <p
        style={{
          margin: '0 0 10px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          lineHeight: 1.65,
          color: '#cbd5e1',
          fontWeight: 400,
        }}
      >
        {tool.description}
      </p>
      <p
        style={{
          margin: '0 0 20px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.81rem',
          lineHeight: 1.65,
          color: '#64748b',
          fontWeight: 400,
        }}
      >
        {tool.longDescription}
      </p>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%)',
          marginBottom: 18,
        }}
      />

      {/* Capabilities */}
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            margin: '0 0 10px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#4a5568',
          }}
        >
          Capabilities
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tool.capabilities.map((cap, i) => (
            <CapabilityChip key={i} icon={cap.icon} label={cap.label} />
          ))}
        </div>
      </div>

      {/* Example prompts */}
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            margin: '0 0 4px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#4a5568',
          }}
        >
          Example Voice Prompts
        </p>
        <div>
          {tool.examples.map((ex, i) => (
            <ExamplePromptRow key={i} text={ex.text} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.72rem',
            color: '#4a5568',
            fontWeight: 500,
          }}
        >
          Powered by{' '}
          <span style={{ color: tool.accentColor, opacity: 0.8 }}>{tool.poweredBy}</span>
        </span>

        {/* View details CTA */}
        <motion.div
          animate={{ x: hovered ? 2 : 0, opacity: hovered ? 1 : 0.55 }}
          transition={{ duration: 0.18 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.72rem',
            fontWeight: 600,
            color: tool.accentColor,
          }}
        >
          View Details
          <ChevronRight size={12} />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────────

export function ToolsPage() {
  const activeCount = TOOLS.filter((t) => t.status === 'active').length;
  const needsConfigCount = TOOLS.filter((t) => t.status === 'needs-config').length;
  const [selectedTool, setSelectedTool] = React.useState<ToolDefinition | null>(null);

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#080b12',
        padding: '36px 40px 60px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        style={{ marginBottom: 36 }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Inter', sans-serif",
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#f0f4ff',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              Capabilities
            </h1>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                color: '#7a8aa0',
                fontWeight: 400,
                maxWidth: 520,
                lineHeight: 1.6,
              }}
            >
              Every tool available to the AI agent — click any card to see how it works in depth.
            </p>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <CheckCircle2 size={14} color="#10b981" />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#10b981',
                }}
              >
                {activeCount} Active
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <AlertCircle size={14} color="#f59e0b" />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#f59e0b',
                }}
              >
                {needsConfigCount} Needs Config
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            marginTop: 24,
            height: 1,
            background: 'linear-gradient(90deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.05) 60%, transparent 100%)',
          }}
        />
      </motion.div>

      {/* ── Tool cards grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))',
          gap: 20,
        }}
      >
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onOpen={() => setSelectedTool(tool)} />
        ))}
      </motion.div>

      {/* ── Info footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        style={{
          marginTop: 40,
          padding: '18px 22px',
          borderRadius: 14,
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <Zap size={16} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.82rem',
            color: '#7a8aa0',
            lineHeight: 1.65,
          }}
        >
          <span style={{ color: '#a5b4fc', fontWeight: 600 }}>How it works: </span>
          The AI agent automatically selects the right tool based on your voice input — no manual selection needed.
          Tools marked <span style={{ color: '#f59e0b', fontWeight: 500 }}>Needs Config</span> require API credentials in your{' '}
          <code
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '1px 6px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.78rem',
              color: '#cbd5e1',
            }}
          >
            .env
          </code>{' '}
          file before they become available.
        </p>
      </motion.div>

      {/* ── Tool Detail Modal (portal-like fixed overlay) */}
      <AnimatePresence>
        {selectedTool && (
          <ToolDetailModal
            tool={selectedTool}
            onClose={() => setSelectedTool(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
