import { useEffect, useState } from "react";

import SceneInit from "./lib/SceneInit";

// hold off on =implementing next.js until component structure is working
// import dynamic from "next/dynamic"
// // https://www.codingdeft.com/posts/next-window-not-defined/
// const SceneInit = dynamic(() => import("./lib/SceneInit"), {
//   ssr: false, // Do not import in server side
// })

export default function Home() {
  
  useEffect(() => {
    // https://stackoverflow.com/questions/76752944/nextjs-window-not-defined-error-when-extending-with-react-three-fiber
    // https://www.codingdeft.com/posts/next-window-not-defined/
    // const importLibsServerSide = () => import(`./lib`)
    const myScene = new SceneInit();
    
    myScene.setupScene();
    myScene.animate();
  }, []);

  return (
    <div id="mainDiv" className="flex flex-col items-center justify-center">
      <div id="mediaDiv" className="absolute bottom-2 right-2">
        <video id="media" controls autoPlay 
          // live RttP audiostream working!! live visuals, not so much
          
          // MediaElementAudioSource outputs zeroes due to CORS access restrictions for <url> [Chrome]
          // The HTMLMediaElement passed to createMediaElementSource has a cross-origin resource, the node will output silence. [Firefox]
          // https://stackoverflow.com/questions/48362093/cors-request-blocked-in-locally-opened-html-file 

          // try running HTTPS server to get around CORS errors: 
          // https://create-react-app.dev/docs/using-https-in-development/
          // https://github.com/vercel/next.js/issues/8945#issuecomment-997267328
        >
          {/* 
            src='https://labs.phaser.io/assets/audio/Dafunk - Hardcore Power (We Believe In Goa - Remix).ogg' type="audio/ogg"
            src='https://nstmradio.mixlr.com/events/2787207' type="audio/mpeg"
            src='https://www.youtube.com/live/MwtVkPKx3RA;' type="audio/mpeg"
          */}
          <source src="http://s9.viastreaming.net:9000/;stream.mp3" 
                  type="audio/mpeg"/> 
        </video>
      </div>
      <canvas id="threeJsCanvas"></canvas>
    </div>
  );
}
