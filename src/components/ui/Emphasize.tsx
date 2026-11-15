import { Fragment } from "react";

/** Renders text with the given words in italics (used for class names in project descriptions). */
export function Emphasize({ text, words = [] }: { text: string; words?: string[] }) {
  if (!words.length) return <>{text}</>;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        words.includes(part) ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>
      )}
    </>
  );
}
