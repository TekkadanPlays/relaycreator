import { createElement } from 'inferno-create-element';
import { cn } from './utils';

// ---------------------------------------------------------------------------
// DropdownMenu — simple relative wrapper, state managed by parent
// ---------------------------------------------------------------------------

export function DropdownMenu({ children }: { children?: any }) {
  return createElement('div', {
    'data-slot': 'dropdown-menu',
    className: 'relative inline-block',
  }, children);
}

// ---------------------------------------------------------------------------
// DropdownMenuTrigger — just a button, parent provides onClick
// ---------------------------------------------------------------------------

interface DropdownMenuTriggerProps {
  className?: string;
  onClick?: (e: Event) => void;
  children?: any;
}

export function DropdownMenuTrigger({ className, onClick, children }: DropdownMenuTriggerProps) {
  return createElement('button', {
    'data-slot': 'dropdown-menu-trigger',
    type: 'button',
    onClick,
    className: cn('outline-none', className),
  }, children);
}

// ---------------------------------------------------------------------------
// DropdownMenuContent — always renders, parent controls visibility
// ---------------------------------------------------------------------------

interface DropdownMenuContentProps {
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  children?: any;
}

export function DropdownMenuContent({ className, align = 'end', side = 'bottom', children }: DropdownMenuContentProps) {
  const alignClasses: Record<string, string> = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  const sideClasses: Record<string, string> = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
  };

  return createElement('div', {
    'data-slot': 'dropdown-menu-content',
    role: 'menu',
    className: cn(
      'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
      'animate-in fade-in-0 zoom-in-95',
      alignClasses[align],
      sideClasses[side],
      className,
    ),
  }, children);
}

// ---------------------------------------------------------------------------
// DropdownMenuItem
// ---------------------------------------------------------------------------

interface DropdownMenuItemProps {
  className?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick?: (e: Event) => void;
  children?: any;
}

export function DropdownMenuItem(props: DropdownMenuItemProps) {
  const { className, disabled = false, destructive = false, onClick, children } = props;

  return createElement('button', {
    'data-slot': 'dropdown-menu-item',
    type: 'button',
    role: 'menuitem',
    disabled,
    onClick,
    className: cn(
      "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
      "focus-visible:bg-accent focus-visible:text-accent-foreground",
      "hover:bg-accent hover:text-accent-foreground",
      "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      disabled && 'pointer-events-none opacity-50',
      destructive && 'text-destructive focus-visible:text-destructive hover:text-destructive',
      className,
    ),
  }, children);
}

// ---------------------------------------------------------------------------
// DropdownMenuSeparator
// ---------------------------------------------------------------------------

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return createElement('div', {
    'data-slot': 'dropdown-menu-separator',
    role: 'separator',
    className: cn('bg-border -mx-1 my-1 h-px', className),
  });
}

// ---------------------------------------------------------------------------
// DropdownMenuLabel
// ---------------------------------------------------------------------------

interface DropdownMenuLabelProps {
  className?: string;
  children?: any;
}

export function DropdownMenuLabel({ className, children }: DropdownMenuLabelProps) {
  return createElement('div', {
    'data-slot': 'dropdown-menu-label',
    className: cn('px-2 py-1.5 text-sm font-semibold', className),
  }, children);
}

// ---------------------------------------------------------------------------
// DropdownMenuGroup
// ---------------------------------------------------------------------------

interface DropdownMenuGroupProps {
  className?: string;
  children?: any;
}

export function DropdownMenuGroup({ className, children }: DropdownMenuGroupProps) {
  return createElement('div', {
    'data-slot': 'dropdown-menu-group',
    role: 'group',
    className: cn(className),
  }, children);
}
