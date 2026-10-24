import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Safe markdown: raw HTML is never rendered (react-markdown skips it without rehype-raw). */
export function Readme({ markdown }: { markdown: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-ink/90 [&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mb-3 [&_h1]:text-[22px] [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-ink [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:my-1 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) =>
            href?.startsWith("#") ? (
              <a href={href}>{children}</a>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
