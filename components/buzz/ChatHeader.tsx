// Adapted from block/buzz desktop/src/features/chat/ui/ChatHeader.tsx (Apache-2.0).
// Native shell, update indicator, and clipboard services omitted; title/actions hierarchy retained.
import type { ReactNode } from 'react';
type Props = { title: string; onTitleClick?: () => void; leadingContent?: ReactNode; titleAdornment?: ReactNode; actions?: ReactNode };
export function ChatHeader({title,onTitleClick,leadingContent,titleAdornment,actions}:Props) {
 return <header className="pointer-events-auto relative z-30 min-w-0 shrink-0 cursor-default select-none bg-transparent px-5 py-2" data-testid="chat-header">
  <div className="flex h-9 min-w-0 items-center gap-2.5">
   <div className="min-w-0 flex-1"><div className="group/title flex min-w-0 items-center gap-[4px] overflow-hidden">
    <div className="flex shrink-0 items-center">{leadingContent}</div>
    <h1 className="min-w-0 truncate text-base font-semibold leading-6 tracking-tight" data-testid="chat-title">{onTitleClick ? <button className="chat-title-button" onClick={onTitleClick}>{title}</button> : title}</h1>
    {titleAdornment}
   </div></div>
   <div className="flex shrink-0 items-center gap-1">{actions}</div>
  </div>
 </header>;
}
