// A habit/area label. Names are short by default (single line, exactly as the
// bar looks today), but a long one simply wraps to its full length within the
// card rather than being cut off — no chevron, no tap, nothing to miss on touch.
// Names are length-capped at the input, so this stays at most a couple of lines.
export default function TruncatedText({ text, className = '' }: { text: string; className?: string }) {
  return <span className={`block break-words ${className}`}>{text}</span>;
}
