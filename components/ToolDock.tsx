import { TOOLS } from '@/src/game/constants';

const SHORT = ['SICKLE', 'HOE', 'HAMMER', 'AXE', 'WATER', 'ROD'];
const SHAPES = [
  'M8 21V12M8 12C18 12 21 5 15 3C17 7 12 9 6 8',
  'M9 21V6M4 6H20V11M6 4H18',
  'M10 21V10M5 4H17V10H5ZM17 6H20V9H17',
  'M13 3V21M13 5C7 3 3 6 4 12L13 10',
  'M7 9H17V20H7ZM17 11H20V6H16M7 12L2 8V13L7 17M9 9V5H14V9',
  'M4 21L12 3L20 7V16C20 20 16 20 16 16M10 8L14 10',
];

/** Selection goes through the engine's normal hotkeys and tool restrictions. */
export default function ToolDock({ tool, tier, upgrading, locked, disabled, onSelect }: {
  tool: string; tier: string; upgrading: string | null; locked: boolean;
  disabled: boolean; onSelect: (key: string, pointer: boolean) => void;
}) {
  return (
    <div className="tool-dock" role="toolbar" aria-label="Field tools" onKeyDown={(e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const index = buttons.indexOf(e.target as HTMLButtonElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1
        : (index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
      buttons[next]?.click();
    }}>
      <div className="tool-dock-heading" aria-hidden="true"><span>◇ FIELD KIT ◇</span><small>1–6 · QUICK SELECT</small></div>
      <div className="tool-slots">
        {TOOLS.map((name, i) => {
          const selected = name === tool;
          const inForge = name === upgrading;
          return (
            <button key={name} type="button" className="tool-slot" aria-pressed={selected}
              aria-label={`${name}${inForge ? ' — at the forge' : ''}`} aria-keyshortcuts={String(i + 1)}
              disabled={disabled || inForge || (locked && !selected)}
              tabIndex={selected || (!TOOLS.includes(tool) && i === 0) ? 0 : -1}
              title={inForge ? `${name}: Saibara is upgrading it` : locked && !selected ? 'Your cursed tool cannot be unequipped' : `${name} (${i + 1})`}
              onClick={(e) => onSelect(String(i + 1), e.detail > 0)}>
              <kbd aria-hidden="true">{i + 1}</kbd>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"><path d={SHAPES[i]} /></svg>
              <span>{inForge ? 'FORGING' : SHORT[i]}</span><i aria-hidden="true">{selected ? '◆' : '·'}</i>
            </button>
          );
        })}
      </div>
      <div className="tool-dock-detail"><span>{tool}</span><small>{locked ? 'CURSED · VISIT CARTER' : tier}</small></div>
    </div>
  );
}
