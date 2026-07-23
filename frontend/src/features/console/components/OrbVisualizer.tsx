import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle, Vec3 } from 'ogl';
import { cn } from '@/lib/utils';
import type { AgentState, SpeakingState } from '../../../types/agent';

// ── Shader source ─────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float iTime;
  uniform vec3  iResolution;
  uniform float hue;
  uniform float hover;
  uniform float rot;
  uniform float hoverIntensity;
  uniform float errorMode;    // 0=normal  1=error (red)
  uniform float brightness;   // overall brightness multiplier
  varying vec2 vUv;

  // ── YIQ hue rotation ───────────────────────────────────────────────────────
  vec3 rgb2yiq(vec3 c) {
    return vec3(
      dot(c, vec3(0.299,  0.587,  0.114)),
      dot(c, vec3(0.596, -0.274, -0.322)),
      dot(c, vec3(0.211, -0.523,  0.312))
    );
  }
  vec3 yiq2rgb(vec3 c) {
    return vec3(
      c.x + 0.956*c.y + 0.621*c.z,
      c.x - 0.272*c.y - 0.647*c.z,
      c.x - 1.106*c.y + 1.703*c.z
    );
  }
  vec3 adjustHue(vec3 color, float deg) {
    float r = deg * 3.14159265 / 180.0;
    vec3 yiq = rgb2yiq(color);
    float cosA = cos(r), sinA = sin(r);
    yiq.yz = vec2(yiq.y*cosA - yiq.z*sinA, yiq.y*sinA + yiq.z*cosA);
    return yiq2rgb(yiq);
  }

  // ── Simplex 3D noise ────────────────────────────────────────────────────────
  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031,0.11369,0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z)*p3.zyx);
  }
  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i  = floor(p + (p.x+p.y+p.z)*K1);
    vec3 d0 = p - (i - (i.x+i.y+i.z)*K2);
    vec3 e  = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e*(1.0-e.zxy);
    vec3 i2 = 1.0-e.zxy*(1.0-e);
    vec3 d1 = d0-(i1-K2), d2 = d0-(i2-K1), d3 = d0-0.5;
    vec4 h  = max(0.6 - vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)), 0.0);
    vec4 n  = h*h*h*h * vec4(
      dot(d0,hash33(i)),      dot(d1,hash33(i+i1)),
      dot(d2,hash33(i+i2)),   dot(d3,hash33(i+1.0))
    );
    return dot(vec4(31.316), n);
  }

  // ── Alpha extraction ────────────────────────────────────────────────────────
  vec4 extractAlpha(vec3 colorIn) {
    float a = max(max(colorIn.r, colorIn.g), colorIn.b);
    return vec4(colorIn / (a + 1e-5), a);
  }

  // ── Base palette (cyan → purple) ────────────────────────────────────────────
  // Normal palette
  const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078); // vivid purple
  const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725); // bright cyan
  const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000); // deep blue
  // Error palette (red tones)
  const vec3 errColor1  = vec3(0.98, 0.18, 0.18);             // bright red
  const vec3 errColor2  = vec3(0.85, 0.40, 0.10);             // orange-red
  const vec3 errColor3  = vec3(0.40, 0.03, 0.03);             // dark red

  const float innerRadius = 0.6;
  const float noiseScale  = 0.65;

  float light1(float i, float a, float d) { return i/(1.0+d*a); }
  float light2(float i, float a, float d) { return i/(1.0+d*d*a); }

  vec4 draw(vec2 uv) {
    // Blend between normal and error palette
    vec3 color1 = mix(adjustHue(baseColor1, hue), errColor1, errorMode);
    vec3 color2 = mix(adjustHue(baseColor2, hue), errColor2, errorMode);
    vec3 color3 = mix(adjustHue(baseColor3, hue), errColor3, errorMode);

    float ang    = atan(uv.y, uv.x);
    float len    = length(uv);
    float invLen = len > 0.0 ? 1.0/len : 0.0;

    // Noise-driven ring shape
    float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
    float r0 = mix(mix(innerRadius,1.0,0.4), mix(innerRadius,1.0,0.6), n0);
    float d0 = distance(uv, (r0*invLen)*uv);
    float v0 = light1(1.0, 10.0, d0);
    v0 *= smoothstep(r0*1.05, r0, len);
    float cl = cos(ang + iTime*2.0)*0.5 + 0.5;

    // Orbiting light point
    float a   = iTime * -1.0;
    vec2  pos = vec2(cos(a), sin(a))*r0;
    float d   = distance(uv, pos);
    float v1  = light2(1.5, 5.0, d) * light1(1.0, 50.0, d0);

    float v2 = smoothstep(1.0, mix(innerRadius,1.0,n0*0.5), len);
    float v3 = smoothstep(innerRadius, mix(innerRadius,1.0,0.5), len);

    vec3 col = mix(color1, color2, cl);
    col = mix(color3, col, v0);
    col = (col + v1) * v2 * v3;
    col = clamp(col * brightness, 0.0, 1.0);

    return extractAlpha(col);
  }

  vec4 mainImage(vec2 fragCoord) {
    vec2 center = iResolution.xy * 0.5;
    float size  = min(iResolution.x, iResolution.y);
    vec2 uv     = (fragCoord - center) / size * 2.0;

    // Rotation
    float s = sin(rot), c = cos(rot);
    uv = vec2(c*uv.x - s*uv.y, s*uv.x + c*uv.y);

    // Hover / jiggle distortion
    uv.x += hover * hoverIntensity * 0.12 * sin(uv.y * 10.0 + iTime * 3.0);
    uv.y += hover * hoverIntensity * 0.12 * sin(uv.x * 10.0 + iTime * 3.0);

    return draw(uv);
  }

  void main() {
    vec2  fragCoord = vUv * iResolution.xy;
    vec4  col       = mainImage(fragCoord);
    gl_FragColor    = vec4(col.rgb * col.a, col.a);
  }
`;

// ── State → animation parameter mapping ──────────────────────────────────────
interface OrbParams {
  /** radians/second base rotation speed */
  rotSpeed: number;
  /** target hover distortion value (0–1) */
  hoverTarget: number;
  /** target hoverIntensity (0–1) */
  hoverIntensityTarget: number;
  /** 0 = normal colours, 1 = full red */
  errorMode: number;
  /** brightness multiplier — clamped to [0, 1.3] to prevent shader clamp pop */
  brightness: number;
}

function getOrbParams(
  agentState: AgentState,
  speakingState: SpeakingState,
  amplitude: number,
): OrbParams {
  const isError = agentState === 'ERROR';
  const isConnecting = agentState === 'CONNECTING';
  const isWarming = agentState === 'WARMING_UP';
  const isIdle = agentState === 'IDLE';
  const isListening = agentState === 'CONNECTED' && speakingState === 'LISTENING';
  const isSpeaking = agentState === 'CONNECTED' && speakingState === 'SPEAKING';
  const isThinking = agentState === 'CONNECTED' && speakingState === 'QUIET';

  if (isError) {
    return { rotSpeed: 2.2, hoverTarget: 0, hoverIntensityTarget: 0, errorMode: 1, brightness: 1.0 };
  }
  if (isConnecting) {
    return { rotSpeed: 1.2, hoverTarget: 0.2, hoverIntensityTarget: 0.3, errorMode: 0, brightness: 0.85 };
  }
  if (isWarming) {
    return { rotSpeed: 0.8, hoverTarget: 0.25, hoverIntensityTarget: 0.4, errorMode: 0, brightness: 0.9 };
  }
  if (isThinking) {
    return { rotSpeed: 0.55, hoverTarget: 0.08, hoverIntensityTarget: 0.15, errorMode: 0, brightness: 0.9 };
  }
  if (isListening) {
    const boost = amplitude * 1.1;
    return {
      rotSpeed: 0.15 + amplitude * 0.6,
      hoverTarget: Math.min(0.35 + boost * 0.65, 1.0),
      hoverIntensityTarget: Math.min(0.4 + boost * 0.6, 1.0),
      errorMode: 0,
      // Cap brightness so the lerp never overshoots past shader clamp
      brightness: Math.min(1.0 + amplitude * 0.15, 1.3),
    };
  }
  if (isSpeaking) {
    const boost = amplitude * 1.2;
    return {
      rotSpeed: 0.2 + amplitude * 0.7,
      hoverTarget: Math.min(0.4 + boost * 0.6, 1.0),
      hoverIntensityTarget: Math.min(0.45 + boost * 0.55, 1.0),
      errorMode: 0,
      brightness: Math.min(1.0 + amplitude * 0.2, 1.3),
    };
  }
  if (isIdle) {
    return { rotSpeed: 0.08, hoverTarget: 0, hoverIntensityTarget: 0, errorMode: 0, brightness: 0.75 };
  }
  // Fallback (CONNECTED + INTERRUPTED, etc.)
  return { rotSpeed: 0.15, hoverTarget: 0, hoverIntensityTarget: 0, errorMode: 0, brightness: 0.8 };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface OrbVisualizerProps {
  agentState: AgentState;
  speakingState: SpeakingState;
  bars?: number[];
  amplitude?: number;
  className?: string;
}

export function OrbVisualizer({
  agentState,
  speakingState,
  amplitude = 0,
  className,
}: OrbVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Store mutable orb params in a ref so the animation loop reads them without
  // needing a re-render on every audio frame.
  const paramsRef = useRef<OrbParams>(getOrbParams(agentState, speakingState, amplitude));

  // Keep paramsRef in sync whenever props change
  useEffect(() => {
    paramsRef.current = getOrbParams(agentState, speakingState, amplitude);
  }, [agentState, speakingState, amplitude]);

  // ── WebGL setup — runs once ─────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // FIX 1: initialise to -1 so cleanup cancelAnimationFrame(-1) is a safe no-op
    let rafId = -1;
    let resize: () => void;

    try {
      const renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: window.devicePixelRatio || 1,
      });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Mount canvas
      while (container.firstChild) container.removeChild(container.firstChild);
      container.appendChild(gl.canvas);

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
          hue: { value: 0 },
          hover: { value: 0 },
          rot: { value: 0 },
          hoverIntensity: { value: 0 },
          errorMode: { value: 0 },
          brightness: { value: 1 },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });

      // ── Resize handler ────────────────────────────────────────────────────
      resize = () => {
        if (!container || !renderer || !gl) return;
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;
        renderer.setSize(width * dpr, height * dpr);
        const canvas = gl.canvas as HTMLCanvasElement;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
      };
      window.addEventListener('resize', resize);
      resize();

      // ── Animation loop ────────────────────────────────────────────────────
      // FIX 2: seed lastTime from performance.now() so the first frame dt ≈ 0
      let lastTime = performance.now();
      let currentRot = 0;

      // Smoothed uniform values (to prevent jarring jumps)
      let smoothHover = 0;
      let smoothHoverIntensity = 0;
      let smoothErrorMode = 0;
      let smoothBrightness = 1;

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const update = (t: number) => {
        rafId = requestAnimationFrame(update);

        // FIX 3: cap dt AND guard against 0 (first frame edge-case)
        const dt = Math.min(Math.max((t - lastTime) * 0.001, 0), 0.05);
        lastTime = t;
        const seconds = t * 0.001;

        // Read current target params
        const p = paramsRef.current;

        // FIX 4: guard lerpSpeed so a tiny dt still produces visible progress
        // Use a fixed lerp factor floored at 0.03 to avoid "frozen" transitions
        const lerpFactor = Math.min(Math.max(6.0 * dt, 0.03), 1);
        const slowLerpFactor = Math.min(Math.max(3.0 * dt, 0.015), 1);

        smoothHover = lerp(smoothHover, p.hoverTarget, lerpFactor);
        smoothHoverIntensity = lerp(smoothHoverIntensity, p.hoverIntensityTarget, lerpFactor);
        smoothErrorMode = lerp(smoothErrorMode, p.errorMode, slowLerpFactor);
        smoothBrightness = lerp(smoothBrightness, p.brightness, lerpFactor);

        // Advance rotation
        currentRot += dt * p.rotSpeed;

        // Update shader uniforms
        program.uniforms.iTime.value = seconds;
        program.uniforms.hue.value = 0; // fixed palette; no hue cycling
        program.uniforms.rot.value = currentRot;
        program.uniforms.hover.value = smoothHover;
        program.uniforms.hoverIntensity.value = smoothHoverIntensity;
        program.uniforms.errorMode.value = smoothErrorMode;
        program.uniforms.brightness.value = smoothBrightness;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        renderer.render({ scene: mesh });
      };

      rafId = requestAnimationFrame(update);

      return () => {
        cancelAnimationFrame(rafId);
        if (resize) window.removeEventListener('resize', resize);
        // FIX 5: cast canvas once and use type-safe contains check
        try {
          const canvas = gl.canvas as HTMLCanvasElement | undefined;
          if (canvas && container.contains(canvas)) {
            container.removeChild(canvas);
          }
        } catch { /* ignore DOM timing races */ }
        // Explicitly release GPU resources
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      };

    } catch (err) {
      console.error('[OrbVisualizer] WebGL init failed:', err);
      // Fallback cleanup if setup failed
      return () => {
        cancelAnimationFrame(rafId);
        if (resize) window.removeEventListener('resize', resize);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setup once — live props fed via paramsRef

  return (
    // FIX 6: use open+close tags (not self-closing) so React attaches the ref
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('orb-root', className)}
      style={{
        position: 'relative',
        width: '260px',
        height: '260px',
        flexShrink: 0,
      }}
    ></div>
  );
}
