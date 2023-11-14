import { useEffect, useState } from "react";
import * as THREE from "three";
import SceneInit from "./lib/SceneInit";
import { vertexShader, fragmentShader } from "./lib/SceneInit";
import { vertexShaderScope, fragmentShaderScope } from "./lib/Oscilloscope";

export default function Home() {
  let test, audioContext, audioElement, dataArray, analyser, source;
  let uniforms, uniforms_scope, timeArray, fftSize = 2048;

  dataArray = new Uint8Array(fftSize / 2);
  timeArray = new Float32Array(fftSize / 2);

  let gui, gainNode, gainPass;

  const initGui = async () => {
    // remove duplicate controls caused by rapid-rebuild 
    const old_gui = document.getElementById('gui');
    if (old_gui) {
      old_gui.parentNode.removeChild(old_gui)
    }

    const dat = await import("dat.gui");
    gui = new dat.GUI();
    const guiParent = gui.domElement.parentNode;
    guiParent.id = 'gui'; 
    document.body.appendChild(guiParent);
  };

  const setupAudioContext = () => {
    audioContext = new window.AudioContext();
    audioElement = document.getElementById("media");
    source = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();

    // dummy node to connect to analyser and bypass CORS errors on livestreams
    gainPass = new GainNode(audioContext, { gain: 1.0 });
    // adjust playback volume AFTER analyser node to avoid affecting signal display
    gainNode = new GainNode(audioContext, { gain: 0.5 });

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // source.connect(gainPass);
    // gainPass.connect(analyser);
    // analyser.connect(gainNode);
    // gainNode.connect(audioContext.destination);

    analyser.fftSize = fftSize;
    // console.log("media channels: " + source.channelCount); // CORS errors
    console.log("media channels: " + analyser.channelCount);
    // analyser.window = ... JUCE DSP module? 
    // audioElement.volume = 0.1;
  };

  const setupGeometry = () => {
    uniforms = {
      u_time: {
        type: "f",
        value: 1.0,
      },
      u_amplitude: {
        type: "f",
        value: 10.0,
      },
      u_data_arr: {
        type: "float["+ dataArray.length +"]",
        value: dataArray,
      },
    };
  
    uniforms_scope = {
      u_scale_y: {
        type: "f",
        value: 25.0,
      },
      u_scale_x: {
        type: "f",
        value: 2.0,
      },
      u_data_arr: {
        type: "float["+ timeArray.length +"]",
        value: timeArray,
      },
      u_gain: {
        type: "f",
        value: 0.1,
      },
    };

    var shaderMaterial = new THREE.ShaderMaterial({
      uniforms:       uniforms_scope,
      vertexShader:   vertexShaderScope( analyser.frequencyBinCount ),
      fragmentShader: fragmentShaderScope(),
      // blending:       THREE.AdditiveBlending,
      depthTest:      false,
      transparent:    false
    });

    // audio oscilloscope visualizer
    const positions = [];
    for (var i = -timeArray.length/2; i < timeArray.length/2; i++) {
      positions.push( new THREE.Vector3( i, 0, 0 ) );
    }    
    const buffergeometry = new THREE.BufferGeometry().setFromPoints(positions);
        
    const timeLine = new THREE.Line(buffergeometry, shaderMaterial);
    test.scope.scene.add(timeLine);
    
    // FFT plane visualizer
    const planeHalfLength = timeArray.length / 8;
    const planeGeometry = new THREE.PlaneGeometry(planeHalfLength, planeHalfLength, planeHalfLength, planeHalfLength);
    const planeCustomMaterial = new THREE.ShaderMaterial({
      // passing FFT data to shaders
      uniforms: uniforms,
      vertexShader: vertexShader(),
      fragmentShader: fragmentShader(),
      wireframe: true,
    });

    const planeMesh = new THREE.Mesh(planeGeometry, planeCustomMaterial);
    planeMesh.rotation.x = -Math.PI / 2 + Math.PI / 4;
    planeMesh.position.y = 1;
    test.scene.add(planeMesh);

    const freqGui = gui.addFolder("frequency");
    freqGui
      .add(planeCustomMaterial, "wireframe")
      .name("wireframe")
      .setValue(true)
      .listen();
    freqGui
      .add(uniforms.u_amplitude, "value", 1.0, 25.0)
      .name("freq scale")
      .setValue(uniforms.u_amplitude.value)
      .listen();
    freqGui
      .add(analyser, "smoothingTimeConstant", 0, 1.0)
      .name("time smoothing")
      .setValue(0.8)
      .listen();
    const audioGui = gui.addFolder("audio");
    audioGui
      .add(uniforms_scope.u_scale_y, "value", 10.0, 200.0)
      .name("time scale: Y")
      .setValue(uniforms_scope.u_scale_y.value)
      .listen();
    audioGui
      .add(uniforms_scope.u_scale_x, "value", 1.0, 5.0)
      .name("time scale: X")
      .setValue(uniforms_scope.u_scale_x.value)
      .listen();
    audioGui
      .add(uniforms_scope.u_gain, "value", 0.0, 1.0)
      .name("gain")
      .setValue(0.1)
      .listen()
      .onChange((new_gain) => {
        gainNode.gain.setValueAtTime(new_gain, audioContext.currentTime)
      });
  }

  const play = async () => {
    if (audioContext === undefined) {
      setupAudioContext();
    }
    if (gui === undefined) {
      await initGui();
      setupGeometry();
    }
    const render = (time) => {
      // note: update audio data
      // enable freezing of waveform when song is paused
      if (!audioElement.paused){
        analyser.getByteFrequencyData(dataArray);
        analyser.getFloatTimeDomainData(timeArray);
        // note: update uniforms
        uniforms.u_time.value = time;
        uniforms.u_data_arr.value = dataArray;
        uniforms_scope.u_data_arr.value = timeArray;
      }

      // note: call render function on every animation frame
      requestAnimationFrame(render);
    };

    render();
  };
  
  useEffect(() => {
    test = new SceneInit("myThreeJsCanvas");
    test.initScene();
    test.animate();
  }, []);

  // bug when switching betwen tracks in Chrome (needs refresh and/or browser restart): 
  // InvalidStateError: Failed to execute 'createMediaElementSource' on 'AudioContext': 
  // HTMLMediaElement already connected previously to a different MediaElementSourceNode.
  // https://stackoverflow.com/questions/50657659/different-behaviour-of-webaudio-api-on-google-chrome  
  return (

    <div className="flex flex-col items-center justify-center">
      <div className="absolute bottom-2 right-2">
        {/* 
           let url = 'https://labs.phaser.io/assets/audio/Dafunk - Hardcore Power (We Believe In Goa - Remix).ogg'
           let url = 'https://nstmradio.mixlr.com/events/2787207'
           let url = 'https://www.youtube.com/live/MwtVkPKx3RA;';
        */}
        <video id="media" controls autoPlay
          // live RttP audiostream working!! live visuals, not so much:
          // onPlay={play}
        >
          {/* 
              MediaElementAudioSource outputs zeroes due to CORS access restrictions for <url> [Chrome]
              The HTMLMediaElement passed to createMediaElementSource has a cross-origin resource, the node will output silence. [Firefox]
              https://stackoverflow.com/questions/48362093/cors-request-blocked-in-locally-opened-html-file
          */}
          <source src="http://s9.viastreaming.net:9000/;stream.mp3" 
                  type="audio/mpeg"/> 
        </video>
        {/* <audio
          id="media"
          //src="./fur_elise.mp3"
          //src="./00_ice_sheets.mp3"

          // stream web audio
          // https://labs.phaser.io/index.html?dir=audio/Web%20Audio/&q= 
          // https://labs.phaser.io/view.html?src=src\audio\Web%20Audio\play%20audio%20file.js

          // https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/audio
			    // src="https://labs.phaser.io/assets/audio/Dafunk - Hardcore Power (We Believe In Goa - Remix).ogg"
          // src="https://labs.phaser.io/assets/audio/Andrea_Milana_-_Harlequin_-_The_Clockworks_-_Electribe_MX_REMIX.ogg"
          // type="audio/ogg"
          // src="http://stream.wunh.org:8000/;"
          // src = "http://stream.wunh.org:8000/listen.pls"
          src="http://s9.viastreaming.net:9000/;stream.mp3"
          type="audio/mpeg"
          // type="audio/mp3"
          // crossOrigin="anonymous"
          // className="w-80"
          controls
          autoPlay
          onPlay={play}
        /> */}
      </div>
      <canvas id="myThreeJsCanvas"></canvas>
    </div>
  );
}
