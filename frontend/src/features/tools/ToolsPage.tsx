import React from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type ToolStatus = 'active' | 'needs-config';
type ToolCategory = 'Search' | 'Math' | 'Weather' | 'Productivity';

interface ToolCapability {
  icon: React.ReactNode;
  label: string;
}

interface ExamplePrompt {
  text: string;
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
      { icon: <Globe size={13} />, label: 'General web search' },
      { icon: <ScanSearch size={13} />, label: 'Top-3 result summaries' },
      { icon: <Zap size={13} />, label: 'No API key required' },
    ],
    examples: [
      { text: '"Search for the latest developments in quantum computing"' },
      { text: '"What is the capital of New Zealand?"' },
      { text: '"Find information about React Server Components"' },
    ],
    poweredBy: 'DuckDuckGo Search',
    apiRequired: false,
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
      { icon: <Newspaper size={13} />, label: 'Breaking news headlines' },
      { icon: <Globe size={13} />, label: 'Source attribution' },
      { icon: <Zap size={13} />, label: 'Real-time results' },
    ],
    examples: [
      { text: '"What\'s in the news about artificial intelligence today?"' },
      { text: '"Get me the latest news on climate change"' },
      { text: '"Recent headlines about the stock market"' },
    ],
    poweredBy: 'DuckDuckGo News',
    apiRequired: false,
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
      { icon: <Hash size={13} />, label: 'Arithmetic & algebra' },
      { icon: <Hash size={13} />, label: 'Trig: sin, cos, tan' },
      { icon: <Hash size={13} />, label: 'sqrt, log, exp, ceil, floor' },
      { icon: <Hash size={13} />, label: 'Constants: π and e' },
    ],
    examples: [
      { text: '"What is 13 multiplied by 19?"' },
      { text: '"Calculate the square root of 144"' },
      { text: '"What is sin(pi divided by 2)?"' },
    ],
    poweredBy: 'Python AST (offline)',
    apiRequired: false,
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
      { icon: <Wind size={13} />, label: 'Temperature & feels-like' },
      { icon: <Wind size={13} />, label: 'Wind speed & humidity' },
      { icon: <Globe size={13} />, label: 'Any city worldwide' },
      { icon: <Zap size={13} />, label: 'No API key required' },
    ],
    examples: [
      { text: '"What\'s the weather like in Tokyo?"' },
      { text: '"Current weather in New York"' },
      { text: '"Is it raining in London right now?"' },
    ],
    poweredBy: 'Open-Meteo API',
    apiRequired: false,
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
      { icon: <FileText size={13} />, label: 'Save notes by voice' },
      { icon: <ScanSearch size={13} />, label: 'Search notes by keyword' },
      { icon: <ListChecks size={13} />, label: 'List recent notes' },
      { icon: <BookMarked size={13} />, label: 'Tag support' },
    ],
    examples: [
      { text: '"Save a note: Buy groceries — milk, eggs, bread"' },
      { text: '"Search my notes for project ideas"' },
      { text: '"List my recent notes"' },
    ],
    poweredBy: 'Notion API',
    apiRequired: true,
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

function ToolCard({ tool }: { tool: ToolDefinition }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.div
      variants={cardVariants}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 20,
        border: `1px solid ${hovered ? `${tool.accentColor}30` : 'rgba(99,102,241,0.12)'}`,
        background: hovered
          ? `linear-gradient(145deg, ${tool.gradientFrom}, ${tool.gradientTo})`
          : 'rgba(13,16,24,0.7)',
        backdropFilter: 'blur(24px)',
        padding: '28px 28px 24px',
        transition: 'border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
        boxShadow: hovered
          ? `0 0 40px ${tool.glowColor}, 0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset`
          : '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
        cursor: 'default',
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

      {/* Footer — powered by */}
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

        {tool.apiRequired && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.70rem',
              color: '#f59e0b',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.18)',
              borderRadius: 6,
              padding: '2px 8px',
              fontWeight: 500,
            }}
          >
            API key required
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────────

export function ToolsPage() {
  const activeCount = TOOLS.filter((t) => t.status === 'active').length;
  const needsConfigCount = TOOLS.filter((t) => t.status === 'needs-config').length;

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
              Every tool available to the AI agent — what each one does, how to trigger it by voice, and its current status.
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
          <ToolCard key={tool.id} tool={tool} />
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
    </div>
  );
}
