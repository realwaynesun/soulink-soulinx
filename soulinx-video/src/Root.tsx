import "./index.css";
import { Composition } from "remotion";
import { SoulinXDemo } from "./SoulinXDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SoulinXDemo"
        component={SoulinXDemo}
        durationInFrames={2100}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
