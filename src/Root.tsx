import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import {
  SLIME_FACTORY_FRAMES,
  SEGMENTS,
  SlimeFactoryChapter,
  TitleCardOnly,
} from "./figure-it-out/SlimeFactory";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ title: "Hello from Remotion" }}
      />
      <Composition
        id="FigureItOut-Ch3-SlimeFactory"
        component={SlimeFactoryChapter}
        durationInFrames={SLIME_FACTORY_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FigureItOut-Ch3-TitleCard"
        component={TitleCardOnly}
        durationInFrames={SEGMENTS[0].dur}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
