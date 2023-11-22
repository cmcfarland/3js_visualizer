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
        {/* <video id="media" controls autoPlay crossorigin="anonymous" >
          // MediaElementAudioSource outputs zeroes due to CORS access restrictions for <url> [Chrome]
          // https://stackoverflow.com/questions/48362093/cors-request-blocked-in-locally-opened-html-file 

          // try running HTTPS server to get around CORS errors: 
          // https://create-react-app.dev/docs/using-https-in-development/
          // https://github.com/vercel/next.js/issues/8945#issuecomment-997267328
          */}
      </div>
      <canvas id='threeJsCanvas'></canvas>
    </div>
  );
}
