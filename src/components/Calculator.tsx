import { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { Delete, Undo2, Redo2, Settings2, CornerDownLeft, ArrowLeft, ArrowRight } from 'lucide-react';

interface Calculation {
  equation: string;
  result: string;
}

interface CalculatorProps {
  onUnlock: () => void;
}

export default function Calculator({ onUnlock }: CalculatorProps) {
  const [display, setDisplay] = useState('');
  const [history, setHistory] = useState<Calculation[]>([]);
  const [activeTab, setActiveTab] = useState<'main' | 'abc' | 'func'>('main');
  const [isRad, setIsRad] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleNumber = (num: string) => {
    setDisplay(prev => prev + num);
  };

  const handleOperator = (op: string) => {
    setDisplay(prev => prev + ' ' + op + ' ');
  };

  const handleClear = () => {
    setDisplay('');
  };

  const handleEqual = useCallback(() => {
    // Secret code: 1 * 1 or 1x1
    const sanitized = display.replace(/\s/g, '').toLowerCase();
    if (sanitized === '1*1' || sanitized === '1x1') {
      // about:blank cloaking
      const win = window.open('about:blank', '_blank');
      if (win) {
        const doc = win.document;
        doc.title = 'Home - Classroom';
        
        // Add favicon
        const link = doc.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = 'https://upload.wikimedia.org/wikipedia/commons/5/59/Google_Classroom_logo.svg';
        doc.head.appendChild(link);

        doc.body.style.margin = '0';
        doc.body.style.height = '100vh';
        doc.body.style.overflow = 'hidden';
        
        const iframe = doc.createElement('iframe');
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.margin = '0';
        // Append unlocked=true to ensure the game site loads
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('unlocked', 'true');
        iframe.src = currentUrl.toString();
        doc.body.appendChild(iframe);
      }
      return;
    }

    if (!display) return;

    try {
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + display.replace(/×/g, '*').replace(/÷/g, '/').replace(/x/g, '*'))();
      setHistory(prev => [...prev, { equation: display, result: String(result) }]);
      setDisplay('');
    } catch {
      setHistory(prev => [...prev, { equation: display, result: 'Error' }]);
      setDisplay('');
    }
  }, [display, onUnlock]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      if (e.key === '.') handleNumber('.');
      if (e.key === '+') handleOperator('+');
      if (e.key === '-') handleOperator('-');
      if (e.key === '*') handleOperator('*');
      if (e.key === '/') handleOperator('/');
      if (e.key === 'Enter' || e.key === '=') handleEqual();
      if (e.key === 'Backspace') setDisplay(prev => prev.slice(0, -1));
      if (e.key === 'Escape') handleClear();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEqual]);

  const handleScientific = (func: string) => {
    setDisplay(prev => prev + func + '(');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-serif text-[var(--fg)]">
      {/* History Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-0 border-b border-[var(--bg-card)]">
        <div className="max-w-4xl mx-auto">
          {history.length === 0 && !display && (
            <div className="h-full flex items-center justify-center text-[var(--fg-muted)] italic text-xl py-20">
              Coral
            </div>
          )}
          {history.map((calc, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-[var(--bg-card)] group">
              <div className="text-2xl italic text-[var(--fg-muted)]">{calc.equation}</div>
              <div className="text-2xl font-medium text-[var(--fg)]">= {calc.result}</div>
            </div>
          ))}
          {(display || history.length > 0) && (
            <div className="flex justify-between items-center py-6 bg-[var(--accent)]/5 -mx-4 px-4 border-y border-[var(--accent)]/20">
              <div className="text-3xl italic flex-1 text-[var(--fg)]">
                {display}
                <span className="w-0.5 h-8 bg-[var(--accent)] inline-block align-middle ml-1 animate-pulse" />
              </div>
              <div className="text-3xl font-medium text-[var(--fg-muted)]">
                = ...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--bg-card)] px-2 py-1 flex items-center gap-1 text-sm font-sans">
        <div className="flex bg-[var(--bg)] rounded border border-[var(--bg-card)] overflow-hidden">
          <button 
            onClick={() => setActiveTab('main')}
            className={`px-4 py-1.5 font-medium transition-colors ${activeTab === 'main' ? 'bg-[var(--bg-card)] border-b-2 border-[var(--accent)] text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:bg-[var(--bg-card)]'}`}
          >
            main
          </button>
          <button 
            onClick={() => setActiveTab('abc')}
            className={`px-4 py-1.5 font-medium transition-colors ${activeTab === 'abc' ? 'bg-[var(--bg-card)] border-b-2 border-[var(--accent)] text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:bg-[var(--bg-card)]'}`}
          >
            abc
          </button>
          <button 
            onClick={() => setActiveTab('func')}
            className={`px-4 py-1.5 font-medium transition-colors ${activeTab === 'func' ? 'bg-[var(--bg-card)] border-b-2 border-[var(--accent)] text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:bg-[var(--bg-card)]'}`}
          >
            func
          </button>
        </div>

        <div className="flex ml-4 rounded border border-[var(--bg-card)] overflow-hidden">
          <button 
            onClick={() => setIsRad(true)}
            className={`px-3 py-1.5 text-[10px] font-bold ${isRad ? 'bg-[var(--bg-card)] text-[var(--fg)]' : 'bg-[var(--bg)] text-[var(--fg-muted)]'}`}
          >
            RAD
          </button>
          <button 
            onClick={() => setIsRad(false)}
            className={`px-3 py-1.5 text-[10px] font-bold ${!isRad ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] text-[var(--fg-muted)]'}`}
          >
            DEG
          </button>
        </div>

        <div className="flex ml-auto items-center gap-4 text-[var(--fg-muted)]">
          <Undo2 className="w-5 h-5 cursor-pointer hover:text-[var(--fg)]" />
          <Redo2 className="w-5 h-5 cursor-pointer hover:text-[var(--fg)]" />
          <button onClick={handleClear} className="font-medium hover:text-[var(--fg)]">clear</button>
          <Settings2 className="w-5 h-5 cursor-pointer hover:text-[var(--fg)]" />
        </div>
      </div>

      {/* Keypad */}
      <div className="bg-[var(--bg)] p-2 grid grid-cols-10 gap-1 font-sans select-none">
        {/* Left Block: Scientific */}
        <div className="col-span-3 grid grid-cols-3 gap-1">
          <Key label="a²" onClick={() => setDisplay(prev => prev + '^2')} />
          <Key label="aᵇ" onClick={() => setDisplay(prev => prev + '^')} />
          <Key label="|a|" onClick={() => handleScientific('abs')} />
          <Key label="√" onClick={() => handleScientific('sqrt')} />
          <Key label="ⁿ√" onClick={() => handleScientific('nthroot')} />
          <Key label="π" onClick={() => handleNumber('π')} />
          <Key label="sin" onClick={() => handleScientific('sin')} />
          <Key label="cos" onClick={() => handleScientific('cos')} />
          <Key label="tan" onClick={() => handleScientific('tan')} />
          <Key label="(" onClick={() => handleNumber('(')} />
          <Key label=")" onClick={() => handleNumber(')')} />
          <Key label="," onClick={() => handleNumber(',')} />
        </div>

        {/* Middle Block: Numbers */}
        <div className="col-span-4 grid grid-cols-3 gap-1">
          <NumKey label="7" onClick={() => handleNumber('7')} />
          <NumKey label="8" onClick={() => handleNumber('8')} />
          <NumKey label="9" onClick={() => handleNumber('9')} />
          <NumKey label="4" onClick={() => handleNumber('4')} />
          <NumKey label="5" onClick={() => handleNumber('5')} />
          <NumKey label="6" onClick={() => handleNumber('6')} />
          <NumKey label="1" onClick={() => handleNumber('1')} />
          <NumKey label="2" onClick={() => handleNumber('2')} />
          <NumKey label="3" onClick={() => handleNumber('3')} />
          <NumKey label="0" onClick={() => handleNumber('0')} />
          <NumKey label="." onClick={() => handleNumber('.')} />
          <NumKey label="ans" onClick={() => handleNumber('ans')} className="text-xs" />
        </div>

        {/* Right Block: Operators */}
        <div className="col-span-3 grid grid-cols-2 gap-1">
          <OpKey label="÷" onClick={() => handleOperator('/')} />
          <OpKey label="%" onClick={() => handleOperator('%')} />
          <OpKey label="×" onClick={() => handleOperator('*')} />
          <OpKey label="a/b" onClick={() => handleOperator('/')} className="text-xs" />
          <OpKey label="-" onClick={() => handleOperator('-')} />
          <div className="grid grid-cols-2 gap-1">
            <OpKey icon={<ArrowLeft className="w-4 h-4" />} onClick={() => {}} />
            <OpKey icon={<ArrowRight className="w-4 h-4" />} onClick={() => {}} />
          </div>
          <OpKey label="+" onClick={() => handleOperator('+')} />
          <OpKey icon={<Delete className="w-5 h-5" />} onClick={() => setDisplay(prev => prev.slice(0, -1))} className="bg-[var(--bg-card)]" />
          <button 
            onClick={handleEqual}
            className="col-span-2 bg-[var(--accent)] hover:opacity-90 text-white rounded flex items-center justify-center transition-colors active:scale-95 py-3"
          >
            <CornerDownLeft className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Key({ label, onClick, className = "" }: { label: string, onClick: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--fg)] rounded py-3 text-lg italic transition-colors active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

function NumKey({ label, onClick, className = "" }: { label: string, onClick: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`bg-[var(--bg-card)] hover:opacity-80 text-[var(--fg)] rounded py-3 text-xl font-medium transition-colors active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

function OpKey({ label, icon, onClick, className = "" }: { label?: string, icon?: ReactNode, onClick: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--fg)] rounded py-3 text-xl transition-colors active:scale-95 flex items-center justify-center ${className}`}
    >
      {label || icon}
    </button>
  );
}
