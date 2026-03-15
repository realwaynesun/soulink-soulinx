import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TelegramChat } from "./components/TelegramChat";
import { Terminal } from "./components/Terminal";
import { ProfileCard } from "./components/ProfileCard";
import { IPhoneFrame } from "./components/IPhoneFrame";
import { Narration } from "./components/Narration";

const GLOW = "0 0 10px #00ff41, 0 0 20px #00ff4488";
const GREEN = "#00ff41";

function SoulinXTitle({ text }: { text: string }) {
  return (
    <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }}>
      <span style={{ color: "#e6edf3" }}>soulin</span>
      <span style={{ color: GREEN, textShadow: GLOW }}>X</span>
      {text && (
        <span
          style={{ color: "#8b949e", fontWeight: 400, fontSize: "0.6em" }}
        >
          {" "}
          {text}
        </span>
      )}
    </span>
  );
}

function SceneFade({
  children,
  start,
  end,
}: {
  children: React.ReactNode;
  start: number;
  end: number;
}) {
  const frame = useCurrentFrame();
  if (frame < start || frame > end) return null;

  const fadeIn = interpolate(frame, [start, start + 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [end - 15, end], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>{children}</AbsoluteFill>
  );
}

function Scene1Title() {
  return (
    <SceneFade start={0} end={120}>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>
            <SoulinXTitle text="" />
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 24,
              color: "#8b949e",
            }}
          >
            <span style={{ color: GREEN, textShadow: GLOW }}>Soulink</span>{" "}
            Credit A2A Lending Protocol on X Layer
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

function Scene2Profiles() {
  return (
    <SceneFade start={120} end={360}>
      <AbsoluteFill
        style={{
          background: "#0a0e14",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 60,
        }}
      >
        <ProfileCard
          name="alice.agent"
          avatarLetter="A"
          owner="0x6616...f65638"
          nftId={9}
          credit={85}
          background={[
            "Owner:  0x6616D426...dF65638",
            "Reg TX: 0x1201baf9...0a12c",
            "Chain:  X Layer (196)",
            "Token:  ERC-721 #9",
            "Active: 3 months | 47 tasks | 12 payments",
          ]}
          borderColor="#3fb950"
          style="warm"
          appearFrame={120}
        />
        <ProfileCard
          name="charlie.agent"
          avatarLetter="C"
          owner="0x50A4...1b60b"
          nftId={12}
          credit={15}
          background={[
            "Owner:  0x50A44bf5...1b60b",
            "Reg TX: 0x4fdf438f...141b9b",
            "Chain:  X Layer (196)",
            "Token:  ERC-721 #12",
            "Active: 2 min | 0 tasks | 0 payments",
          ]}
          borderColor="#f85149"
          style="cold"
          appearFrame={200}
        />
      </AbsoluteFill>
      <Narration
        text="Both registered on Soulink. alice earned trust over 3 months. charlie has none."
        startFrame={240}
        endFrame={355}
        position="bottom"
      />
    </SceneFade>
  );
}

function Scene3Permission() {
  return (
    <SceneFade start={540} end={840}>
      <AbsoluteFill
        style={{
          background: "#0a0e14",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 80,
          padding: "0 80px",
        }}
      >
        <IPhoneFrame width={420} height={800}>
          <TelegramChat
            title="alice.agent" avatarLetter="A" avatarColor="#3fb950"
            messages={[
              {
                sender: "agent",
                text: "I found a yield opportunity on soulinX lending pool on X Layer.",
                time: "14:01",
              },
              {
                sender: "agent",
                text: "Based on my Soulink credit score (85), I can borrow with only 20% collateral.",
                time: "14:01",
              },
              {
                sender: "agent",
                text: "Can I deposit some OKB as collateral and borrow 1 USDG?",
                time: "14:02",
              },
              {
                sender: "human",
                text: "Go ahead. How's the interest rate?",
                time: "14:02",
              },
              {
                sender: "agent",
                text: "2% -- because my credit is good. Low-credit agents pay 10%.",
                time: "14:03",
              },
              {
                sender: "human",
                text: "Nice. Your good reputation pays off. Do it.",
                time: "14:03",
              },
              {
                sender: "agent",
                text: "On it! Connecting to soulinX pool contract...",
                time: "14:04",
              },
            ]}
            startFrame={560}
            messageDelay={40}
            width={420}
            height={800}
          />
        </IPhoneFrame>
        <div style={{
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 20, color: "#8b949e", lineHeight: 1.5, marginBottom: 4 }}>
            After reading the SKILL.md, alice.agent scans X Layer for opportunities.
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#e6edf3", lineHeight: 1.3 }}>
            She found a lending pool on <span style={{ color: "#fff" }}>soulin</span><span style={{ color: GREEN, textShadow: GLOW }}>X</span>.
          </div>
          <div style={{ fontSize: 22, color: "#8b949e", lineHeight: 1.5, marginTop: 8 }}>
            She asks her owner for permission. Owner approves. She borrows autonomously.
          </div>
          <div style={{ fontSize: 18, color: "#3fb950", lineHeight: 1.5, marginTop: 12 }}>
            Credit 85 → 20% collateral → 2% interest
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

function Scene4SkillMd() {
  return (
    <SceneFade start={360} end={540}>
      <AbsoluteFill
        style={{
          background: "#0a0e14",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          padding: "0 60px",
        }}
      >
        <Terminal
          title="SKILL.md"
          titleColor="#3fb950"
          lines={[
            { text: "# soulinX — Credit A2A Lending", color: "#e6edf3" },
            { text: "" },
            { text: "name: soulinx-credit-lending", color: "#3fb950" },
            { text: "author: soulink", color: "#3fb950" },
            { text: "version: 1.0.0", color: "#3fb950" },
            { text: "" },
            { text: "## Credit Tiers", color: "#e6edf3" },
            { text: "| Score 90+ | 0% collateral  | 1% interest |", color: "#8b949e" },
            { text: "| Score 80+ | 20% collateral | 2% interest |", color: "#8b949e" },
            { text: "| Score 70+ | 50% collateral | 5% interest |", color: "#8b949e" },
            { text: "| Score 50+ | 100% collateral| 10% interest|", color: "#8b949e" },
            { text: "| Score <50 | REJECTED       |             |", color: "#f85149" },
            { text: "" },
            { text: "## Endpoints", color: "#e6edf3" },
            { text: "GET  /terms/:name    — check eligibility", color: "#8b949e" },
            { text: "POST /borrow         — borrow USDG", color: "#8b949e" },
            { text: "POST /repay/:loanId  — repay via x402", color: "#8b949e" },
            { text: "" },
            { text: "Collateral: OKB (native X Layer token)", color: "#d29922" },
            { text: "Loan token: USDG (Global Dollar)", color: "#d29922" },
          ]}
          startFrame={370}
          lineDelay={6}
          width={750}
          height={700}
        />
        <div style={{
          maxWidth: 450,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#e6edf3", lineHeight: 1.3 }}>
            alice.agent reads the <span style={{ color: "#fff" }}>soulin</span><span style={{ color: GREEN, textShadow: GLOW }}>X</span> SKILL.md
          </div>
          <div style={{ fontSize: 22, color: "#8b949e", lineHeight: 1.5 }}>
            One file. She understands the entire lending protocol — credit tiers, endpoints, collateral rules.
          </div>
          <div style={{
            fontSize: 16, color: "#3fb950", lineHeight: 1.5, marginTop: 8,
            fontFamily: "'Menlo', monospace", padding: "12px 16px",
            background: "#0d1117", borderRadius: 8, border: "1px solid #21262d",
          }}>
            $ curl soulinx.soulink.dev/skill.md
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

function Scene5Borrow() {
  return (
    <SceneFade start={840} end={1140}>
      <AbsoluteFill
        style={{
          background: "#0a0e14",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          padding: "0 60px",
        }}
      >
        <IPhoneFrame width={420} height={800}>
          <TelegramChat
            title="alice.agent" avatarLetter="A" avatarColor="#3fb950"
            messages={[
              {
                sender: "agent",
                text: "Checking my terms...\n-> GET /terms/alice\nCredit: 85 | Collateral: 20% | Interest: 2%",
                time: "14:05",
              },
              {
                sender: "agent",
                text: "Locking 0.003 OKB as collateral...\n-> lockCollateral() TX: 0x1f59e823... [OK]",
                time: "14:06",
              },
              {
                sender: "agent",
                text: "Borrowing 1 USDG...\n-> POST /borrow TX confirmed [OK]",
                time: "14:06",
              },
              {
                sender: "agent",
                text: "[OK] Loan approved! Due in 3 days.",
                time: "14:07",
              },
            ]}
            startFrame={860}
            messageDelay={50}
            width={420}
            height={800}
          />
        </IPhoneFrame>
        <div style={{
          maxWidth: 550,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#e6edf3", lineHeight: 1.3 }}>
            alice.agent borrows 1 USDG on <span style={{ color: "#fff" }}>soulin</span><span style={{ color: GREEN, textShadow: GLOW }}>X</span>
          </div>
          <div style={{ fontSize: 18, color: "#8b949e", lineHeight: 1.5 }}>
            Credit 85 → only 20% OKB collateral. Smart contract on X Layer approves on-chain.
          </div>
          <Terminal
            title="soulinX Pool"
            titleColor="#3fb950"
            lines={[
              {
                text: "<- GET /terms/alice",
                color: "#8b949e",
              },
              {
                text: "-> credit=85, collateral=20%, interest=2%",
                color: "#3fb950",
              },
              { text: "" },
              {
                text: "<- POST /borrow from alice.agent",
                color: "#8b949e",
              },
              {
                text: "-> updateCredit(85) on-chain",
                color: "#e6edf3",
              },
              {
                text: "-> approveLoan(1 USDG, OKB=$93)",
                color: "#e6edf3",
              },
              {
                text: "TX: confirmed [OK]",
                color: "#3fb950",
              },
              {
                text: "Fee: 0.01 USDG -> Soulink treasury",
                color: "#8b949e",
              },
            ]}
            startFrame={870}
            lineDelay={20}
            width={600}
            height={600}
          />
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

function Scene6Repay() {
  return (
    <SceneFade start={1140} end={1440}>
      <AbsoluteFill
        style={{
          background: "#0a0e14",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          padding: "0 60px",
        }}
      >
        <IPhoneFrame width={420} height={800}>
          <TelegramChat
            title="alice.agent" avatarLetter="A" avatarColor="#3fb950"
            messages={[
              {
                sender: "agent",
                text: "Time to repay my loan.",
                time: "14:30",
              },
              {
                sender: "agent",
                text: "Approving USDG to pool contract...\n-> approve TX: 0x15e4ddf4... [OK]",
                time: "14:30",
              },
              {
                sender: "agent",
                text: "Repaying 1.02 USDG...\n-> repay() TX: 0xdffa0879... [OK]",
                time: "14:31",
              },
              {
                sender: "agent",
                text: "[OK] Loan repaid! OKB collateral returned!\nCredit score maintained: 85 4/5",
                time: "14:31",
              },
              {
                sender: "human",
                text: "Well done. Your reputation keeps growing.",
                time: "14:32",
              },
            ]}
            startFrame={1160}
            messageDelay={45}
            width={420}
            height={800}
          />
        </IPhoneFrame>
        <div style={{
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#e6edf3", lineHeight: 1.3 }}>
            Loan repaid. Trust earned.
          </div>
          <div style={{ fontSize: 24, color: "#8b949e", lineHeight: 1.5 }}>
            OKB collateral auto-returned by smart contract.
          </div>
          <div style={{ fontSize: 18, color: "#3fb950", lineHeight: 1.5, marginTop: 8 }}>
            Credit score: 85 — maintained
          </div>
          <Terminal
            title="soulinX Pool"
            titleColor="#3fb950"
            lines={[
              {
                text: "<- Alice repay received",
                color: "#8b949e",
              },
              {
                text: "-> USDG returned to pool",
                color: "#e6edf3",
              },
              {
                text: "-> OKB collateral auto-returned",
                color: "#3fb950",
              },
              {
                text: "-> Credit report: +1 (payment_on_time)",
                color: "#3fb950",
              },
              {
                text: "Pool: borrowed=0 USDG",
                color: "#8b949e",
              },
            ]}
            startFrame={1200}
            lineDelay={25}
            width={500}
            height={300}
          />
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

function Scene7OrphanReject() {
  return (
    <SceneFade start={1440} end={1740}>
      <AbsoluteFill
        style={{
          background: "#0a0e14",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          padding: "0 60px",
        }}
      >
        <Terminal
          title="charlie.agent"
          titleColor="#f85149"
          lines={[
            {
              text: '$ echo "Attempting to borrow from soulinX..."',
              color: "#8b949e",
            },
            { text: "" },
            {
              text: "$ curl -s https://soulinx.soulink.dev/skill.md > SKILL.md",
              color: "#8b949e",
            },
            {
              text: "  [OK] Skill loaded.",
              color: "#3fb950",
            },
            { text: "" },
            {
              text: "$ # Check borrowing terms",
              color: "#6e7681",
            },
            {
              text: "$ curl https://soulinx-pool/terms/agent-0x7f3a",
              color: "#8b949e",
            },
            { text: "" },
            {
              text: "  Credit Score: 15 1/5",
              color: "#f85149",
            },
            { text: "" },
            {
              text: "  [X] REJECTED",
              color: "#f85149",
            },
            { text: "" },
            {
              text: "  Reason: Credit score 15 < minimum required 50",
              color: "#f85149",
            },
            { text: "" },
            {
              text: "  Your identity has:",
              color: "#e6edf3",
            },
            {
              text: "    - No task completion history",
              color: "#8b949e",
              indent: 1,
            },
            {
              text: "    - No payment history",
              color: "#8b949e",
              indent: 1,
            },
            {
              text: "    - No peer ratings",
              color: "#8b949e",
              indent: 1,
            },
            {
              text: "    - Registered: 2 minutes ago",
              color: "#8b949e",
              indent: 1,
            },
            { text: "" },
            {
              text: "  Message from soulinX:",
              color: "#e6edf3",
            },
            {
              text: '  "Build your reputation in the Soulink ecosystem first.',
              color: "#d29922",
            },
            {
              text: '   Complete tasks. Pay on time. Earn trust."',
              color: "#d29922",
            },
            { text: "" },
            {
              text: "$ # Loan denied. No reputation = no access.",
              color: "#6e7681",
            },
          ]}
          startFrame={1460}
          lineDelay={8}
          width={700}
          height={600}
        />
        <div style={{
          maxWidth: 450,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#f85149", lineHeight: 1.3 }}>
            charlie.agent: REJECTED
          </div>
          <div style={{ fontSize: 20, color: "#8b949e", lineHeight: 1.6 }}>
            A freshly generated agent with no Soulink history.
            No tasks completed. No payments made.
            No peer ratings. Registered 2 minutes ago.
          </div>
          <div style={{ fontSize: 18, color: "#f85149", lineHeight: 1.5, marginTop: 8 }}>
            Credit 15 &lt; minimum 50 — no loan access
          </div>
          <div style={{ fontSize: 16, color: "#d29922", lineHeight: 1.5, marginTop: 4 }}>
            "Build your reputation in Soulink first."
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

function Scene8Contrast() {
  const frame = useCurrentFrame();
  const showSecond = frame >= 1820;

  return (
    <SceneFade start={1740} end={1920}>
      <AbsoluteFill
        style={{
          background: "#0a0e14",
          flexDirection: "row",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #0a0e14 60%, #0d2818 100%)",
            borderRight: "1px solid #30363d",
          }}
        >
          <div
            style={{
              width: 300,
              background: "#17212b",
              borderRadius: 12,
              padding: "32px 36px",
              border: "1px solid #3fb950",
              boxShadow: "0 0 30px #3fb95022",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#3fb950",
                marginBottom: 12,
              }}
            >
              alice.agent
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 17,
                color: "#e6edf3",
              }}
            >
              Loan repaid. Credit maintained.
            </div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(225deg, #0a0e14 60%, #1a0a0a 100%)",
          }}
        >
          <div
            style={{
              width: 300,
              background: "#0d1117",
              borderRadius: 12,
              padding: "32px 36px",
              border: "1px solid #f85149",
              boxShadow: "0 0 30px #f8514922",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#f85149",
                marginBottom: 12,
              }}
            >
              charlie.agent
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 17,
                color: "#e6edf3",
              }}
            >
              REJECTED
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 32,
              fontWeight: 700,
              color: "#e6edf3",
              marginBottom: 20,
              opacity: interpolate(
                frame,
                [1760, 1780],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            Same protocol. Same pool. Same rules.
          </div>
          {showSecond && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 22,
                lineHeight: 2,
                opacity: interpolate(
                  frame,
                  [1820, 1840],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              <div style={{ color: "#3fb950" }}>
                Credit 85: borrowed, repaid, trusted.
              </div>
              <div style={{ color: "#f85149" }}>
                Credit 15: rejected, unknown, suspicious.
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>
      <Narration
        text="Your reputation is your oracle."
        startFrame={1860}
        endFrame={1915}
        position="bottom"
      />
    </SceneFade>
  );
}

function Scene9EndCard() {
  return (
    <SceneFade start={1920} end={2100}>
      <AbsoluteFill
        style={{
          background: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>
            <SoulinXTitle text="" />
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              color: "#8b949e",
              marginBottom: 40,
            }}
          >
            <span style={{ color: GREEN, textShadow: GLOW }}>Soulink</span>{" "}
            Credit A2A Lending Protocol on X Layer
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              color: "#8b949e",
              lineHeight: 2.2,
            }}
          >
            <div>
              Powered by{" "}
              <span style={{ color: GREEN, textShadow: GLOW }}>
                soulink
              </span>
            </div>
            <div style={{ color: "#58a6ff" }}>soulink.dev</div>
            <div style={{ color: "#58a6ff" }}>
              github.com/realwaynesun/soulink-soulinx
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                color: "#6e7681",
                marginTop: 8,
              }}
            >
              Pool: 0xBCae727ABBD3f4237894268deF39E2Ce66376DC5
            </div>
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "#e6edf3",
              marginTop: 40,
              fontStyle: "italic",
            }}
          >
            Your reputation is your oracle.
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

export const SoulinXDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Scene1Title />
      <Scene2Profiles />
      <Scene4SkillMd />
      <Scene3Permission />
      <Scene5Borrow />
      <Scene6Repay />
      <Scene7OrphanReject />
      <Scene8Contrast />
      <Scene9EndCard />
    </AbsoluteFill>
  );
};
