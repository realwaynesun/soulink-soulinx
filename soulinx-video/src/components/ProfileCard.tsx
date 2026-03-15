import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

interface ProfileCardProps {
  name: string;
  avatarLetter: string;
  owner: string;
  nftId: number;
  credit: number;
  background: string[];
  borderColor: string;
  style: "warm" | "cold";
  appearFrame: number;
}

const GREEN = "#00ff41";
const GLOW = "0 0 8px rgba(0,255,65,0.5), 0 0 16px rgba(0,255,65,0.2)";

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  avatarLetter,
  owner,
  nftId,
  credit,
  background,
  borderColor,
  style,
  appearFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - appearFrame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const glitchOpacity =
    style === "cold"
      ? 0.85 + 0.15 * Math.sin(frame * 0.5) * Math.cos(frame * 0.3)
      : 1;

  const boxShadow =
    style === "warm"
      ? `0 0 20px ${borderColor}44, 0 0 40px ${borderColor}22`
      : `0 0 15px ${borderColor}33`;

  if (frame < appearFrame) return null;

  const filled = Math.round(credit / 10);

  return (
    <div
      style={{
        width: 640,
        background: "#0d1117",
        borderRadius: 14,
        border: `2px solid ${borderColor}`,
        padding: "28px 32px",
        opacity: interpolate(progress, [0, 1], [0, glitchOpacity]),
        transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
        boxShadow,
        fontFamily,
      }}
    >
      {/* Header: avatar + name + Soulink badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: "50%", background: borderColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}
        >
          {avatarLetter}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#e6edf3" }}>{name}</div>
        </div>
        {/* Soulink badge */}
        <div
          style={{
            padding: "5px 14px", borderRadius: 20,
            border: `1px solid ${GREEN}44`,
            background: "rgba(0,255,65,0.08)",
            fontSize: 13, fontWeight: 600,
            color: GREEN, textShadow: GLOW,
            letterSpacing: 0.5,
          }}
        >
          soulink
        </div>
      </div>

      {/* Chain info */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 13, color: "#6d8198" }}>
        <span>X Layer (196)</span>
        <span>|</span>
        <span>ERC-721 #{nftId}</span>
        <span>|</span>
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{owner}</span>
      </div>

      {/* Credit Score Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#6d8198", marginBottom: 6, fontWeight: 500 }}>
          CREDIT SCORE
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Visual bar */}
          <div style={{ display: "flex", gap: 3, flex: 1 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1, height: 8, borderRadius: 4,
                  background: i < filled ? borderColor : "#21262d",
                  opacity: i < filled ? 1 : 0.5,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: borderColor, minWidth: 40, textAlign: "right" }}>
            {credit}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#21262d", marginBottom: 14 }} />

      {/* On-chain details */}
      <div style={{ fontSize: 12, color: "#6d8198", marginBottom: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const }}>
        On-Chain Identity
      </div>
      {background.map((line, i) => (
        <div key={i} style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.7, paddingLeft: 4, fontFamily: "monospace" }}>
          {line}
        </div>
      ))}
    </div>
  );
};
