"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents: Partial<Components> = {
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-ml-blue underline underline-offset-2 hover:opacity-85"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 [overflow-wrap:anywhere] text-ml-ink [text-rendering:geometricPrecision] first:mt-0">
      {children}
    </p>
  ),
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-[1.15em] font-bold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-[1.05em] font-bold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-2 text-[1em] font-semibold first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="my-2 list-disc pl-5 [overflow-wrap:anywhere] first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-5 [overflow-wrap:anywhere] first:mt-0">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-[3px] border-ml-blue-soft pl-3 text-ml-muted not-italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-0 border-t border-ml-line" />,
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto [contain:inline-size]">
      <table className="w-full min-w-[12rem] border-collapse text-left text-[0.92em]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-ml-line bg-ml-preview-bg">{children}</thead>,
  th: ({ children }) => <th className="border border-ml-line px-2 py-1.5 font-semibold text-ml-ink">{children}</th>,
  td: ({ children }) => <td className="border border-ml-line px-2 py-1.5 align-top text-ml-ink">{children}</td>,
  tr: ({ children }) => <tr>{children}</tr>,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-ml-sm border border-ml-line bg-ml-preview-bg p-3 text-[0.88em] [tab-size:2] [font-synthesis-weight:none]">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = typeof className === "string" && /language-/.test(className);
    if (isBlock) {
      return (
        <code className={`block font-mono text-ml-ink ${className ?? ""}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-ml-sm bg-ml-segment-bg px-1.5 py-0.5 font-mono text-[0.9em] text-ml-ink [font-synthesis-weight:none]"
        {...props}
      >
        {children}
      </code>
    );
  },
  strong: ({ children }) => <strong className="font-semibold text-ml-ink [font-synthesis-weight:none]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  img: ({ src, alt }) => <img className="my-2 max-h-[24rem] max-w-full rounded-ml-sm border border-ml-line" src={src} alt={alt ?? ""} loading="lazy" />
};

type MarkdownAnswerProps = {
  source: string;
  /** Visually “typing” caret at the end of the block (streaming) */
  showCaret?: boolean;
  className?: string;
};

/**
 * Renders AI text that may be plain text or light Markdown; GFM (tables, strikethrough, autolink, etc.) enabled.
 */
export function MarkdownAnswer({ source, showCaret, className = "" }: MarkdownAnswerProps) {
  const top = [
    "m-0 min-h-[1.5em] min-w-0 [overflow-wrap:anywhere] text-[0.95rem] leading-[1.65] antialiased [font-synthesis-weight:none] text-ml-ink [contain:layout]",
    showCaret
      ? "after:ml-0.5 after:inline-block after:h-[1.1em] after:w-px after:align-[-0.12em] after:bg-ml-blue after:content-['']"
      : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={[top, className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={mdComponents}
        urlTransform={(url) => (url.startsWith("javascript:") || url.startsWith("data:") ? "" : url)}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
