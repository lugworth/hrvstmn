'use client';

import React, { useEffect, useRef } from 'react';

export type MenuItem = {
  id: string;
  label: string;
  /** Keyboard shortcut shown beside the label, e.g. "Shift+H". */
  shortcut?: string;
  run: () => void;
  /** Checkbox items toggle in place and keep the menu open; radio items mark the one current choice. */
  kind?: 'checkbox' | 'radio';
  checked?: boolean;
  disabled?: boolean;
};
export type MenuSection = { title: string; items: MenuItem[] };
export type MenuClose = 'escape' | 'command' | 'tab' | 'outside';

const itemsIn = (root: HTMLElement | null) =>
  root ? Array.from(root.querySelectorAll<HTMLElement>('[role^="menuitem"]')) : [];

/**
 * The game menu (WAI-ARIA APG menu pattern): arrow keys move through the items, Left/Right jump
 * between sections, Home/End, type-ahead, Escape closes. `pop` hangs above the desktop toolbar;
 * `sheet` is the touch layout with thumb-sized buttons.
 */
export default function GameMenu({
  id,
  sections,
  focus,
  variant,
  onClose,
}: {
  id: string;
  sections: MenuSection[];
  /** Which item takes focus when the menu opens (keyboard and mouse); null leaves focus alone (touch). */
  focus: 'first' | 'last' | null;
  variant: 'pop' | 'sheet';
  onClose: (why: MenuClose) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focus) return;
    const items = itemsIn(ref.current);
    (focus === 'last' ? items[items.length - 1] : items[0])?.focus({ preventScroll: true });
  }, [focus]);

  // A press anywhere else closes the menu (its own button toggles it instead).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (ref.current?.contains(t) || t?.closest?.(`[aria-controls="${id}"]`)) return;
      onClose('outside');
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [id, onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = itemsIn(ref.current);
    const i = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (i + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const groups = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="group"]') ?? []);
      const g = groups.findIndex((el) => el.contains(document.activeElement));
      const to = groups[(g + (e.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length];
      next = items.indexOf(itemsIn(to)[0]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose('escape');
      return;
    } else if (e.key === 'Tab') {
      onClose('tab');
      return;
    } else if (e.key.length === 1 && e.key !== ' ') {
      const ch = e.key.toLowerCase();
      for (let k = 1; k <= items.length && next < 0; k++) {
        const j = (i + k) % items.length;
        if (items[j].dataset.label?.toLowerCase().startsWith(ch)) next = j;
      }
    }
    if (next < 0) return;
    e.preventDefault();
    items[next].focus();
  };

  const activate = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.kind !== 'checkbox') onClose('command');
    item.run();
  };

  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      aria-label="Game menu"
      className={`game-menu game-menu-${variant}`}
      data-ui=""
      onKeyDown={onKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {sections.map((s) => (
        <div key={s.title} role="group" aria-label={s.title} data-title={s.title} className="menu-group">
          {s.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role={item.kind ? `menuitem${item.kind}` : 'menuitem'}
              aria-checked={item.kind ? Boolean(item.checked) : undefined}
              aria-disabled={item.disabled || undefined}
              aria-keyshortcuts={item.shortcut === 'Esc' ? 'Escape' : item.shortcut}
              tabIndex={-1}
              data-label={item.label}
              className="menu-item"
              onClick={() => activate(item)}
            >
              {item.kind && (
                <span className="menu-mark" aria-hidden="true">
                  {item.kind === 'radio' ? (item.checked ? '(•)' : '( )') : item.checked ? '[x]' : '[ ]'}
                </span>
              )}
              <span className="menu-label">{item.label}</span>
              {item.shortcut && <kbd className="menu-key">{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
