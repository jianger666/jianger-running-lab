export interface MarkdownBlock {
  type: "h1" | "h2" | "h3" | "li" | "hr" | "em" | "p";
  content: string;
}

export const parseMarkdown = ({ text }: { text: string }): MarkdownBlock[] => {
  return text.split("\n").map((raw) => {
    const line = raw.replace(/\s+$/, "");
    if (!line) return { type: "p", content: "" };
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      if (level === 1) return { type: "h1", content };
      if (level === 2) return { type: "h2", content };
      return { type: "h3", content };
    }
    if (/^[-*_]{3,}\s*$/.test(line)) return { type: "hr", content: "" };
    if (/^\s*[-*+]\s+/.test(line))
      return { type: "li", content: line.replace(/^\s*[-*+]\s+/, "") };
    if (/^\s*\d+[\.\)]\s+/.test(line))
      return { type: "li", content: line.replace(/^\s*\d+[\.\)]\s+/, "") };
    if (/^>\s*/.test(line))
      return { type: "p", content: line.replace(/^>\s*/, "") };
    if (line.startsWith("*") && line.endsWith("*") && line.length > 2) {
      return { type: "em", content: line.slice(1, -1) };
    }
    return { type: "p", content: line };
  });
};

export const stripInline = ({ text }: { text: string }) =>
  text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/(?:^|\s)\*(\S(?:.*?\S)?)\*(?=\s|[，。、！？,.\!\?:;)）】]|$)/g, " $1")
    .replace(/(?:^|\s)_(\S(?:.*?\S)?)_(?=\s|[，。、！？,.\!\?:;)）】]|$)/g, " $1")
    .replace(/^\s+/, "");
