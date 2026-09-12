'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  HardDrive,
  LockKeyhole,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  duration,
  scenes,
  sceneAt,
  stamp,
  runtimeTime,
  appStart,
  appEnd,
} from './timeline';
import './demo.css';

declare global {
  interface Window {
    __SHOAL_APP_HTML?: string;
    shoalDemo?: {
      seek: (time: number) => void;
      play: () => void;
      pause: () => void;
      getTime: () => number;
      ready: boolean;
    };
  }
}
function Intro({ time }: { time: number }) {
  const scene = sceneAt(time);
  if (scene.id === 'opening')
    return (
      <div className="film-slide film-opening">
        <div className="film-wordmark">
          <Image
            className="film-shell"
            width={56}
            height={56}
            unoptimized
            src="/brand/shoal-shell-icon.png"
            alt=""
          />
          shoal.
        </div>

        <div className="film-gb10-opening">
          <div>
            <h1>
              Shoal: A team communication platform
              <br />
              built from the ground up to natively
              <br />
              support local LLMs.
            </h1>
            <p>
              <strong>Runs entirely on Dell GB10</strong>
              <br />
              NVIDIA NemoClaw · OpenClaw · OpenShell
            </p>
          </div>
          <Image
            src="/compute/dell-shoal.png"
            width={480}
            height={480}
            unoptimized
            alt="Dell GB10"
          />
        </div>
      </div>
    );
  if (scene.id === 'tokens')
    return (
      <div className="film-slide film-token-slide">
        <div className="film-eyebrow">01 / THE TOKEN WASTE TAX</div>
        <div className="film-token-layout">
          <div>
            <h1>
              Buying the same
              <br />
              context. Again.
            </h1>
            <div className="film-big-number">
              {Math.round(
                99 *
                  (1 -
                    Math.pow(
                      1 - Math.max(0, Math.min(1, (time - 6.2) / 1.5)),
                      3,
                    )),
              )}
              <span>¢</span>
            </div>
            <p>of every AI dollar.</p>
            <div className="film-legend">
              <span>
                <i />
                Repeated context
              </span>
              <span>
                <i />
                New work
              </span>
            </div>
          </div>
          <div>
            <div className="film-dot-grid">
              {Array.from({ length: 100 }, (_, i) => (
                <span
                  key={i}
                  className={i === 99 ? 'useful' : ''}
                  style={{ opacity: time >= 6.4 + i * 0.025 ? 1 : 0.16 }}
                />
              ))}
            </div>
            <div className="film-token-prompts">
              {['Question 01', 'Question 02', 'Question 03'].map((label, i) => (
                <div
                  key={label}
                  style={{ opacity: time >= 8.4 + i * 0.8 ? 1 : 0.15 }}
                >
                  <span>{label}</span>
                  <div>
                    <b />
                    <i />
                  </div>
                  <strong>Context re-sent</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="film-source-note">
          Illustrative scenario from the script.
        </div>
      </div>
    );
  if (scene.id === 'security')
    return (
      <div className="film-slide film-security-slide">
        <div className="film-eyebrow">02 / THE DATA EXPOSURE PROBLEM</div>
        <div className="film-security-layout">
          <div>
            <h1>
              Sensitive files.
              <br />
              <span>Unapproved readers.</span>
            </h1>
            <div className="film-leak-flow">
              <div>
                <span>
                  <FileText size={23} />
                  Legal contracts
                </span>
                <span>
                  <FileText size={23} />
                  Financial records
                </span>
              </div>
              <ArrowRight size={34} />
              <div className="film-unapproved">
                <LockKeyhole size={31} />
                <strong>
                  Unapproved
                  <br />
                  AI agents
                </strong>
              </div>
            </div>
          </div>
          <div className="film-breach">
            <small>BREACH COST</small>
            <div>
              $
              {(
                5.4 *
                (1 -
                  Math.pow(
                    1 - Math.max(0, Math.min(1, (time - 12.2) / 1.3)),
                    3,
                  ))
              ).toFixed(1)}
              <span>M</span>
            </div>
            <p>per incident in the cited cohort</p>
            <span className="film-breach-line" />
          </div>
        </div>
        <div className="film-source-note">
          IBM 2022: critical infrastructure organizations without a zero-trust
          approach. This is not the global average.
        </div>
      </div>
    );
  if (scene.id === 'stack')
    return (
      <div className="film-slide film-architecture">
        <Image
          src="/demo-art/shoal-architecture.png"
          width={1536}
          height={1024}
          unoptimized
          priority
          alt="Shoal workspace connected to NemoClaw, OpenClaw specialists, and OpenShell routing inference to the local Dell GB10 model"
        />
      </div>
    );
  if (time >= appEnd && time < 117)
    return (
      <div className="film-slide film-cost-slide">
        <div>
          <span>Cloud inference</span>
          <strong>$0</strong>
          <small>Local-only scenario</small>
        </div>
        <div>
          <span>Enterprise setup</span>
          <strong>$160,000</strong>
          <small>Illustrative budget · plus software and operating costs</small>
        </div>
      </div>
    );
  return (
    <div className="film-slide film-close">
      <div className="film-wordmark">
        <Image
          width={56}
          height={56}
          unoptimized
          className="film-shell"
          src="/brand/shoal-shell-icon.png"
          alt=""
        />
        shoal.
      </div>
      <h1>
        Knowledge that compounds.
        <br />
        <span>Control that stays with you.</span>
      </h1>
      <div className="film-close-tags">
        <span>NemoClaw</span>
        <i>+</i>
        <span>OpenClaw</span>
        <i>+</i>
        <span>OpenShell</span>
      </div>
      <div className="film-close-pill">
        <HardDrive size={21} />
        Local inference
        <Database size={21} />
        Persistent context
        <ShieldCheck size={21} />
        Human approval
      </div>
      <small>Bell workflow simulation · illustrative economics</small>
    </div>
  );
}
export function DemoPlayer() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [record, setRecord] = useState(false);
  const [scale, setScale] = useState(1);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioName, setAudioName] = useState('');
  const [audioError, setAudioError] = useState('');
  const [appReady, setAppReady] = useState(false);
  const playAttempt = useRef(0);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [appHtml] = useState<string | undefined>(() =>
    typeof window === 'undefined' ? undefined : window.__SHOAL_APP_HTML,
  );
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const now = useRef(0);
  const playingRef = useRef(false);
  const anchor = useRef({ clock: 0, time: 0 });
  const selected = sceneAt(time);
  const seek = useCallback((value: number) => {
    const t = Math.max(
      0,
      Math.min(duration, Number.isFinite(value) ? value : 0),
    );
    now.current = t;
    setTime(t);
    iframe.current?.contentWindow?.postMessage(
      { type: 'shoal:time', time: runtimeTime(t), seek: true },
      '*',
    );
    anchor.current = { clock: performance.now(), time: t };
    if (audio.current?.src && audio.current.readyState >= 1)
      audio.current.currentTime = Math.min(
        t,
        Number.isFinite(audio.current.duration) ? audio.current.duration : t,
      );
  }, []);
  const pause = useCallback(() => {
    playAttempt.current++;
    setPlaying(false);
    playingRef.current = false;
    audio.current?.pause();
  }, []);
  const play = useCallback(() => {
    if (!appReady || playingRef.current) return;
    if (now.current >= duration) seek(0);
    const attempt = ++playAttempt.current;
    setAudioError('');
    const begin = () => {
      if (attempt !== playAttempt.current) return;
      anchor.current = { clock: performance.now(), time: now.current };
      setPlaying(true);
      playingRef.current = true;
    };
    const track = audio.current;
    if (
      track?.src &&
      !(Number.isFinite(track.duration) && now.current >= track.duration)
    ) {
      void track
        .play()
        .then(begin)
        .catch(() => {
          if (attempt !== playAttempt.current) return;
          setAudioError('Voiceover could not play. Press Play to retry.');
          pause();
        });
    } else begin();
  }, [appReady, seek, pause]);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setRecord(new URLSearchParams(window.location.search).has('record')),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const resize = new ResizeObserver(() =>
      setScale(
        Math.min(element.clientWidth / 1600, element.clientHeight / 900),
      ),
    );
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const update = (clock: number) => {
      if (playingRef.current && clock - last > 30) {
        last = clock;
        const track = audio.current;
        // Audio is the master clock while present: buffering must freeze the
        // picture instead of allowing narration and scenes to drift apart.
        const audioTime =
          track?.src &&
          !track.ended &&
          (!Number.isFinite(track.duration) || now.current < track.duration)
            ? track.currentTime
            : undefined;
        const t = Math.min(
          duration,
          audioTime ??
            anchor.current.time + (clock - anchor.current.clock) / 1000,
        );
        if (audioTime !== undefined) anchor.current = { clock, time: t };
        now.current = t;
        setTime(t);
        if (t >= duration) pause();
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [pause]);
  useEffect(() => {
    window.shoalDemo = {
      seek,
      play,
      pause,
      getTime: () => now.current,
      ready: appReady,
    };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches('input,textarea,button'))
        return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (playingRef.current) pause();
        else play();
      }
      if (event.code === 'Escape') {
        setRecord(false);
        if (document.fullscreenElement) void document.exitFullscreen();
      }
      if (event.code === 'ArrowRight') seek(now.current + 5);
      if (event.code === 'ArrowLeft') seek(now.current - 5);
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      delete window.shoalDemo;
      window.removeEventListener('keydown', keyboard);
    };
  }, [seek, play, pause, appReady]);
  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );
  useEffect(() => {
    iframe.current?.contentWindow?.postMessage(
      { type: 'shoal:time', time: runtimeTime(time) },
      '*',
    );
  }, [time]);
  useEffect(() => {
    let disposed = false;
    const ready = async (event: MessageEvent) => {
      if (
        event.source !== iframe.current?.contentWindow ||
        event.data?.type !== 'shoal:app-ready'
      )
        return;
      // The child's ready message precedes its React commit. Let that commit
      // and initial fonts/images settle before recording automation proceeds.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      // Hidden iframes defer font layout and lazy images; waiting for their
      // font set here deadlocks readiness until the app scene becomes visible.
      await Promise.allSettled([
        document.fonts.ready,
        ...Array.from(document.images).map((image) =>
          image.decode().catch(() => {}),
        ),
      ]);
      if (disposed) return;
      iframe.current?.contentWindow?.postMessage(
        { type: 'shoal:time', time: runtimeTime(now.current) },
        '*',
      );
      setAppReady(true);
    };
    window.addEventListener('message', ready);
    return () => {
      disposed = true;
      window.removeEventListener('message', ready);
    };
  }, []);
  const isApp = time >= appStart && time < appEnd;
  return (
    <div className={`film-player ${record ? 'recording' : ''}`}>
      {!record && (
        <header className="film-player-header">
          <Link href="/">shoal.</Link>
          <span>Bell · two-minute voiceover demo</span>
          <div>
            <a
              className="film-player-button"
              href={
                appHtml
                  ? './shoal-bell-demo.html'
                  : '/demo-downloads/shoal-demo-current.zip'
              }
              download={
                appHtml ? 'shoal-bell-demo.html' : 'shoal-demo-current.zip'
              }
            >
              <Download size={15} /> Download replay
            </a>
            <a
              className="film-player-button"
              href={
                appHtml
                  ? './shoal-bell-demo.mp4'
                  : '/demo-downloads/shoal-bell-demo.mp4'
              }
              download="shoal-bell-demo.mp4"
            >
              <Download size={15} /> Download video
            </a>
            <label className="film-player-button">
              <Upload size={15} />
              Add voiceover
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    pause();
                    setAudioUrl(URL.createObjectURL(file));
                    setAudioName(file.name);
                    setAudioError('');
                  }
                }}
              />
            </label>
            <button
              className="film-player-button"
              onClick={() => {
                setRecord(true);
                void document.documentElement.requestFullscreen?.();
              }}
            >
              <Maximize size={15} />
              Present
            </button>
          </div>
        </header>
      )}
      <div ref={host} className="film-stage-host">
        <div
          ref={stage}
          className={`film-stage ${isApp ? 'app-scene' : ''}`}
          style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
          data-scene={selected.id}
          data-time={time.toFixed(2)}
        >
          <iframe
            ref={iframe}
            className="film-exact-app"
            title="Shoal workspace"
            src={appHtml ? undefined : '/demo/workspace'}
            srcDoc={appHtml}
            style={{ visibility: isApp ? 'visible' : 'hidden' }}
            onLoad={() =>
              iframe.current?.contentWindow?.postMessage(
                { type: 'shoal:time', time: runtimeTime(time) },
                '*',
              )
            }
          />
          {!isApp && <Intro key={selected.id} time={time} />}
          {isApp && (
            <span className="film-replay-label">
              Bell demo · simulated actions
            </span>
          )}
          <div className="film-bottom-progress">
            <i style={{ width: `${(time / duration) * 100}%` }} />
          </div>
        </div>
      </div>
      {!record && (
        <footer className="film-player-controls">
          <div className="film-transport">
            <button aria-label="Restart demo" onClick={() => seek(0)}>
              <RotateCcw size={19} />
            </button>
            <button
              className="film-play"
              disabled={!appReady}
              aria-label={playing ? 'Pause demo' : 'Play demo'}
              onClick={() => (playing ? pause() : play())}
            >
              {playing ? (
                <Pause size={21} />
              ) : (
                <Play size={21} fill="currentColor" />
              )}
            </button>
            <time>{stamp(time)} / 2:00</time>
            <input
              type="range"
              min={0}
              max={120}
              step={0.1}
              value={time}
              aria-label="Demo timeline"
              onChange={(event) => seek(Number(event.target.value))}
            />
            <span>
              {audioError ||
                (!appReady
                  ? 'Preparing replay…'
                  : audioName || 'Silent · ready for your narration')}
            </span>
          </div>
          <nav className="film-chapters" aria-label="Demo chapters">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                className={scene.id === selected.id ? 'active' : ''}
                onClick={() => seek(scene.start)}
              >
                <small>{stamp(scene.start)}</small>
                {scene.label}
              </button>
            ))}
          </nav>
          <div className="film-cue">
            <span>VOICEOVER CUE</span>
            <p>{selected.cue}</p>
            <button
              aria-label="Previous chapter"
              onClick={() =>
                seek(
                  scenes[
                    Math.max(
                      0,
                      scenes.findIndex((s) => s.id === selected.id) - 1,
                    )
                  ].start,
                )
              }
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next chapter"
              onClick={() =>
                seek(
                  scenes[
                    Math.min(
                      scenes.length - 1,
                      scenes.findIndex((s) => s.id === selected.id) + 1,
                    )
                  ].start,
                )
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}
      {/* Optional user-supplied audio has no supplied caption track; visible chapter cues accompany the demo. */}
      {audioUrl && (
        // oxlint-disable-next-line jsx-a11y/media-has-caption -- Optional local voiceover has no supplied caption track.
        <audio
          ref={audio}
          src={audioUrl}
          preload="auto"
          onLoadedMetadata={() => {
            const track = audio.current;
            if (track)
              track.currentTime = Math.min(
                now.current,
                Number.isFinite(track.duration) ? track.duration : now.current,
              );
          }}
          onEnded={() => {
            const end = Math.min(
              duration,
              audio.current?.duration || now.current,
            );
            now.current = end;
            setTime(end);
            anchor.current = { clock: performance.now(), time: end };
          }}
          onError={() => {
            pause();
            setAudioError(
              'This voiceover could not be loaded. Choose another audio file.',
            );
          }}
        />
      )}
      {record && (
        <button
          className="film-exit"
          onClick={() => {
            setRecord(false);
            if (document.fullscreenElement) void document.exitFullscreen();
          }}
        >
          Exit presentation
        </button>
      )}
    </div>
  );
}
