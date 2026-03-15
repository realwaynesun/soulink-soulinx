interface IPhoneFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  children,
  width = 420,
  height = 860,
}) => {
  return (
    <div
      style={{
        width: width + 24,
        height: height + 24,
        borderRadius: 52,
        border: "3px solid #3a3a3c",
        background: "#1c1c1e",
        padding: 10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        position: "relative",
      }}
    >
      {/* Notch / Dynamic Island */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 34,
          borderRadius: 20,
          background: "#000",
          zIndex: 10,
        }}
      />
      {/* Screen */}
      <div
        style={{
          width,
          height,
          borderRadius: 42,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {children}
      </div>
    </div>
  );
};
