import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

interface Message {
  sender: "agent" | "human";
  text: string;
  time?: string;
}

interface TelegramChatProps {
  title: string;
  avatarLetter: string;
  avatarColor: string;
  messages: Message[];
  startFrame: number;
  messageDelay?: number;
  width?: number;
  height?: number;
}

const COLORS = {
  bg: "#000000",
  navBar: "#1c1c1d",
  navShadow: "0px 0.33px 0px 0px #3d3d3f",
  inputBar: "#1c1c1d",
  inputBarShadow: "0px -0.33px 0px 0px #3d3d3f",
  inputField: "#060606",
  inputBorder: "#3a3a3c",
  timestamp: "#8e8e93",
  subtitle: "#787878",
  onlineGreen: "#34c759",
  outgoingBubble: "#3b82a0",
  incomingBubble: "#1c1c1d",
  white: "#ffffff",
  inputPlaceholder: "#8e8e93",
  homeIndicator: "#ffffff",
};

function StatusBar({ width }: { width: number }) {
  return (
    <div
      style={{
        height: 54,
        width,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "0 32px 8px",
        background: COLORS.navBar,
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize: 15,
          fontWeight: 600,
          color: COLORS.white,
        }}
      >
        9:41
      </span>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
      <rect x="0" y="9" width="3" height="3" rx="0.5" fill="#fff" />
      <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="#fff" />
      <rect x="9" y="3" width="3" height="9" rx="0.5" fill="#fff" />
      <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#fff" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
      <path
        d="M7.5 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"
        fill="#fff"
      />
      <path
        d="M3.5 8.5C4.6 7.2 6 6.5 7.5 6.5s2.9.7 4 2"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M1 5.5c2-2.2 4-3 6.5-3s4.5.8 6.5 3"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="21"
        height="11"
        rx="2"
        stroke="#fff"
        strokeOpacity="0.35"
      />
      <rect x="2" y="2" width="18" height="7" rx="1" fill="#fff" />
      <path
        d="M23 4v4a2 2 0 000-4z"
        fill="#fff"
        fillOpacity="0.4"
      />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg width="13" height="21" viewBox="0 0 13 21" fill="none">
      <path
        d="M11 1L2 10.5L11 20"
        stroke="#007aff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        stroke="#8e8e93"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="22" viewBox="0 0 18 24" fill="none">
      <rect x="5" y="1" width="8" height="14" rx="4" fill="#8e8e93" />
      <path
        d="M1 11a8 8 0 0016 0"
        stroke="#8e8e93"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="19"
        x2="9"
        y2="23"
        stroke="#8e8e93"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const TelegramChat: React.FC<TelegramChatProps> = ({
  title,
  avatarLetter,
  avatarColor,
  messages,
  startFrame,
  messageDelay = 40,
  width = 420,
  height = 750,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width,
        height,
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily,
        position: "relative",
      }}
    >
      {/* Status bar */}
      <StatusBar width={width} />

      {/* Navigation bar */}
      <div
        style={{
          height: 44,
          background: COLORS.navBar,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          boxShadow: COLORS.navShadow,
        }}
      >
        {/* Back arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            width: 60,
          }}
        >
          <BackArrow />
        </div>

        {/* Center: avatar + name + status */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: avatarColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.white,
              marginBottom: 1,
            }}
          >
            {avatarLetter}
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: COLORS.white,
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: COLORS.onlineGreen,
              lineHeight: 1.3,
            }}
          >
            online
          </div>
        </div>

        {/* Right spacer */}
        <div style={{ width: 60 }} />
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          padding: "8px 8px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 3,
          overflow: "hidden",
        }}
      >
        {messages.map((msg, i) => {
          const msgFrame = startFrame + i * messageDelay;
          if (frame < msgFrame) return null;

          const slideUp = spring({
            frame: frame - msgFrame,
            fps,
            config: { damping: 15, stiffness: 120 },
          });

          const isHuman = msg.sender === "human";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isHuman ? "flex-end" : "flex-start",
                opacity: interpolate(slideUp, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(slideUp, [0, 1], [15, 0])}px)`,
                paddingLeft: isHuman ? 50 : 0,
                paddingRight: isHuman ? 0 : 50,
              }}
            >
              <div
                style={{
                  background: isHuman ? COLORS.outgoingBubble : COLORS.incomingBubble,
                  borderRadius: isHuman
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  padding: "7px 12px 5px",
                  maxWidth: "85%",
                }}
              >
                {!isHuman && (
                  <div
                    style={{
                      fontSize: 14,
                      color: avatarColor,
                      fontWeight: 500,
                      marginBottom: 2,
                      lineHeight: 1.2,
                    }}
                  >
                    {title}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 17,
                    color: COLORS.white,
                    lineHeight: 1.35,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    letterSpacing: -0.4,
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.timestamp,
                    textAlign: "right",
                    marginTop: 1,
                    lineHeight: 1.2,
                    fontStyle: "italic",
                  }}
                >
                  {msg.time || "now"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div
        style={{
          height: 50,
          background: COLORS.inputBar,
          boxShadow: COLORS.inputBarShadow,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: 8,
        }}
      >
        <AttachIcon />
        <div
          style={{
            flex: 1,
            height: 33,
            borderRadius: 16.5,
            background: COLORS.inputField,
            border: `0.5px solid ${COLORS.inputBorder}`,
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            fontSize: 17,
            color: COLORS.inputPlaceholder,
            letterSpacing: -0.4,
          }}
        >
          Message
        </div>
        <MicIcon />
      </div>

      {/* Home indicator */}
      <div
        style={{
          height: 34,
          background: COLORS.bg,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            width: 134,
            height: 5,
            borderRadius: 100,
            background: COLORS.homeIndicator,
          }}
        />
      </div>
    </div>
  );
};
