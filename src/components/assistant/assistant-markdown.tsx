"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const ASSISTANT_MARKDOWN_CLASS =
  "max-w-none text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_code]:rounded [&_code]:bg-neutral-950 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre]:my-2 [&_pre]:max-h-[min(24rem,70vh)] [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-neutral-950 [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-600 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-300 [&_th]:border [&_th]:border-neutral-700 [&_th]:bg-neutral-950 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-neutral-800 [&_td]:px-2 [&_td]:py-1 [&_hr]:my-4 [&_hr]:border-neutral-700 [&_strong]:font-semibold";

export function AssistantMarkdown({ source }: { source: string }) {
  return (
    <div className={ASSISTANT_MARKDOWN_CLASS}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 w-full overflow-x-auto">
              <table className="w-full min-w-[12rem] border-collapse border border-neutral-800 text-xs">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
