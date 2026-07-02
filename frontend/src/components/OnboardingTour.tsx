import React, { useEffect, useRef, useState } from 'react';

interface TourStep {
  refKey: 'sidebar' | 'upload' | 'chat' | 'input' | 'mic';
  title: string;
  text: string;
  position: 'right' | 'below' | 'center' | 'above';
}

const STEPS: TourStep[] = [
  {
    refKey: 'sidebar',
    title: 'Your Chat Sessions',
    text: 'All your conversations appear here. Create new chats and switch between them.',
    position: 'right',
  },
  {
    refKey: 'upload',
    title: 'Upload Your Documents',
    text: 'Upload any PDF and ask questions directly from your documents.',
    position: 'below',
  },
  {
    refKey: 'chat',
    title: 'Your Chat Area',
    text: 'Ask anything about AI, Machine Learning, Deep Learning, NLP and Neural Networks.',
    position: 'center',
  },
  {
    refKey: 'input',
    title: 'Ask a Question',
    text: 'Type your question here or click the mic button to speak.',
    position: 'above',
  },
  {
    refKey: 'mic',
    title: 'Voice Input',
    text: 'Click the microphone to speak your question instead of typing.',
    position: 'above',
  },
];

interface OnboardingTourProps {
  sidebarRef: React.RefObject<HTMLElement | null>;
  uploadRef: React.RefObject<HTMLElement | null>;
  chatRef: React.RefObject<HTMLElement | null>;
  inputRef: React.RefObject<HTMLElement | null>;
  micRef: React.RefObject<HTMLElement | null>;
  onComplete: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(el: HTMLElement | null): Rect {
  if (!el) return { top: 0, left: 0, width: 0, height: 0 };
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const CARD_W = 288; // max-w-xs = 20rem = 320px, we use 288 to add some padding
const CARD_OFFSET = 16;

function tooltipStyle(rect: Rect, position: TourStep['position']): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (position === 'center' || rect.width === 0) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  if (position === 'right') {
    let top = rect.top + rect.height / 2;
    let left = rect.left + rect.width + CARD_OFFSET;
    // clamp within viewport
    if (left + CARD_W > vw) left = rect.left - CARD_W - CARD_OFFSET;
    if (top - 80 < 0) top = 80;
    if (top + 80 > vh) top = vh - 80;
    return { position: 'fixed', top, left, transform: 'translateY(-50%)' };
  }

  if (position === 'below') {
    let top = rect.top + rect.height + CARD_OFFSET;
    let left = rect.left + rect.width / 2;
    if (left - CARD_W / 2 < 8) left = CARD_W / 2 + 8;
    if (left + CARD_W / 2 > vw - 8) left = vw - CARD_W / 2 - 8;
    if (top + 180 > vh) top = rect.top - 180 - CARD_OFFSET;
    return { position: 'fixed', top, left, transform: 'translateX(-50%)' };
  }

  // 'above'
  let top = rect.top - CARD_OFFSET;
  let left = rect.left + rect.width / 2;
  if (left - CARD_W / 2 < 8) left = CARD_W / 2 + 8;
  if (left + CARD_W / 2 > vw - 8) left = vw - CARD_W / 2 - 8;
  if (top - 180 < 0) top = rect.top + rect.height + CARD_OFFSET + 180;
  return { position: 'fixed', top, left, transform: 'translate(-50%, -100%)' };
}

export default function OnboardingTour({
  sidebarRef,
  uploadRef,
  chatRef,
  inputRef,
  micRef,
  onComplete,
}: OnboardingTourProps): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect>({ top: 0, left: 0, width: 0, height: 0 });
  const [visible, setVisible] = useState(false);

  const refs: Record<TourStep['refKey'], React.RefObject<HTMLElement | null>> = {
    sidebar: sidebarRef,
    upload: uploadRef,
    chat: chatRef,
    input: inputRef,
    mic: micRef,
  };

  const current = STEPS[step];

  // Measure the target element whenever the step changes
  useEffect(() => {
    setVisible(false);
    const el = refs[current.refKey].current;
    const newRect = getRect(el as HTMLElement | null);
    setRect(newRect);

    // Small delay so the fade-in starts after the rect is set
    const id = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(id);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate on resize / scroll
  useEffect(() => {
    const recalc = () => {
      const el = refs[current.refKey].current;
      setRect(getRect(el as HTMLElement | null));
    };
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  const spotlightStyle: React.CSSProperties =
    rect.width > 0
      ? {
          position: 'fixed',
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
          zIndex: 9998,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }
      : {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          zIndex: 9998,
          pointerEvents: 'none',
        };

  const cardStyle: React.CSSProperties = {
    ...tooltipStyle(rect, current.position),
    zIndex: 9999,
    width: CARD_W,
    opacity: visible ? 1 : 0,
    transform: `${(tooltipStyle(rect, current.position).transform as string) ?? ''} translateY(${visible ? '0' : '8px'})`,
    transition: 'opacity 0.25s ease, transform 0.25s ease',
  };

  return (
    <>
      {/* Dark overlay / spotlight */}
      <div style={spotlightStyle} />

      {/* Tooltip card */}
      <div
        style={cardStyle}
        className="bg-[#1e2130] border border-indigo-500 rounded-xl p-5 shadow-xl"
      >
        {/* Step counter */}
        <p className="text-xs text-indigo-400 font-semibold mb-1 uppercase tracking-widest">
          Step {step + 1} of {STEPS.length}
        </p>

        {/* Title */}
        <h3 className="text-white font-bold text-base mb-2">{current.title}</h3>

        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed mb-4">{current.text}</p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= step ? 'bg-indigo-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Skip Tour
          </button>
          <button
            onClick={handleNext}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            {step < STEPS.length - 1 ? 'Next →' : 'Get Started! 🚀'}
          </button>
        </div>
      </div>
    </>
  );
}
