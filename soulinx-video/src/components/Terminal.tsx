import { interpolate, useCurrentFrame } from "remotion";

interface TerminalLine {
  text: string;
  color?: string;
  indent?: number;
}

interface TerminalProps {
  title: string;
  titleEmoji?: string;
  titleColor?: string;
  lines: TerminalLine[];
  startFrame: number;
  lineDelay?: number;
  width?: number;
  height?: number;
}

export const Terminal: React.FC<TerminalProps> = ({
  title,
  titleEmoji = "",
  titleColor = "#e6edf3",
  lines,
  startFrame,
  lineDelay = 6,
  width = 1400,
  height = 700,
}) => {
  const frame = useCurrentFrame();
  const visibleLines = Math.floor(
    Math.max(0, (frame - startFrame) / lineDelay)
  );
  const showCursor = frame > startFrame && frame % 30 < 20;

  return (
    <div
      style={{
        width,
        height,
        background: "#0d1117",
        borderRadius: 12,
        border: "1px solid #30363d",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 40,
          background: "#161b22",
          borderBottom: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#f85149",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#d29922",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#3fb950",
          }}
        />
        <span
          style={{
            marginLeft: 12,
            fontFamily: "monospace",
            fontSize: 14,
            color: titleColor,
          }}
        >
          {titleEmoji} {title}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          padding: "16px 20px",
          fontFamily: "'Fira Code', 'SF Mono', monospace",
          fontSize: 15,
          lineHeight: 1.6,
          overflowY: "hidden",
        }}
      >
        {lines.slice(0, visibleLines).map((line, i) => {
          const lineOpacity = interpolate(
            frame,
            [startFrame + i * lineDelay, startFrame + i * lineDelay + 4],
            [0, 1],
            { extrapolateRight: "clamp" }
          );
          return (
            <div
              key={i}
              style={{
                color: line.color || "#e6edf3",
                opacity: lineOpacity,
                paddingLeft: (line.indent || 0) * 16,
                whiteSpace: "pre-wrap",
              }}
            >
              {line.text}
            </div>
          );
        })}
        {showCursor && visibleLines <= lines.length && (
          <span style={{ color: "#3fb950" }}>_</span>
        )}
      </div>
    </div>
  );
};
