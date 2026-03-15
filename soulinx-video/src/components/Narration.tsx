import { interpolate, useCurrentFrame } from "remotion";

type Position = "bottom" | "top" | "left" | "right";

interface NarrationProps {
  text: string;
  startFrame: number;
  endFrame: number;
  position?: Position;
}

const positionStyles: Record<Position, React.CSSProperties> = {
  bottom: {
    bottom: 60,
    left: 0,
    right: 0,
    textAlign: "center",
    padding: "18px 80px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
  },
  top: {
    top: 0,
    left: 0,
    right: 0,
    textAlign: "center",
    padding: "24px 80px",
    background: "linear-gradient(rgba(0,0,0,0.8), transparent)",
  },
  left: {
    left: 60,
    bottom: 100,
    maxWidth: 400,
    textAlign: "left",
    padding: "16px 24px",
  },
  right: {
    right: 60,
    bottom: 100,
    maxWidth: 400,
    textAlign: "right",
    padding: "16px 24px",
  },
};

export const Narration: React.FC<NarrationProps> = ({
  text,
  startFrame,
  endFrame,
  position = "bottom",
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > endFrame) return null;

  const fadeIn = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [endFrame - 20, endFrame], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles[position],
        opacity: fadeIn * fadeOut,
        zIndex: 100,
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', 'Helvetica', sans-serif",
          fontSize: 24,
          fontWeight: 600,
          color: "#e6edf3",
          textShadow: "0 2px 16px rgba(0,0,0,0.9)",
          letterSpacing: 0.3,
          lineHeight: 1.5,
        }}
      >
        {text}
      </span>
    </div>
  );
};
