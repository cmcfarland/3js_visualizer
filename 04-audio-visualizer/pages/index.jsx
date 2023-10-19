import { useEffect, useState } from "react";
import * as THREE from "three";
import SceneInit from "./lib/SceneInit";
import { vertexShader, fragmentShader } from "./lib/Shaders";
import { vertexShaderScope, fragmentShaderScope } from "./lib/Oscilloscope";

export default function Home() {
  let test, audioContext, audioElement, dataArray, analyser, source;
  let uniforms, uniforms_scope, timeArray, fftSize = 2048;

  dataArray = new Uint8Array(fftSize / 2);
  timeArray = new Float32Array(fftSize / 2);

  let gui;
  const initGui = async () => {
    const dat = await import("dat.gui");
    gui = new dat.GUI();
  };

  const setupAudioContext = () => {
    audioContext = new window.AudioContext();
    audioElement = document.getElementById("myAudio");
    source = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = fftSize;
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
      // color: { 
      //   value: new THREE.Vector3(0, 0, 0) 
      // }
    };

    var shaderMaterial = new THREE.ShaderMaterial({
      uniforms:       uniforms_scope,
      vertexShader:   vertexShaderScope( analyser.frequencyBinCount ),
      fragmentShader: fragmentShaderScope(),
      // blending:       THREE.AdditiveBlending,
      depthTest:      false,
      transparent:    false
    });

    const positions = [];
    for (var i = -timeArray.length/2; i < timeArray.length/2; i++) {
      positions.push( new THREE.Vector3( i, 0, 0 ) );
    }    
    const buffergeometry = new THREE.BufferGeometry().setFromPoints(positions);
        
    const timeLine = new THREE.Line(buffergeometry, shaderMaterial);
    test.scope.scene.add(timeLine);
    
    // FFT plane visualizer
    const planeGeometry = new THREE.PlaneGeometry(64, 64, 64, 64);
    const planeCustomMaterial = new THREE.ShaderMaterial({
      // passing FFT data to shaders
      uniforms: uniforms,
      vertexShader: vertexShader(),
      fragmentShader: fragmentShader(),
      wireframe: true,
    });

    const planeMesh = new THREE.Mesh(planeGeometry, planeCustomMaterial);
    planeMesh.rotation.x = -Math.PI / 2 + Math.PI / 4;
    planeMesh.scale.x = 2;
    planeMesh.scale.y = 2;
    planeMesh.scale.z = 2;
    planeMesh.position.y = 0;
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
  }

  const load = async () => {
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

  // bug when switching betwen tracks in Chrome (needs browser restart): 
  // InvalidStateError: Failed to execute 'createMediaElementSource' on 'AudioContext': 
  // HTMLMediaElement already connected previously to a different MediaElementSourceNode.
  // https://stackoverflow.com/questions/50657659/different-behaviour-of-webaudio-api-on-google-chrome  
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="absolute bottom-2 right-2">
        <audio
          id="myAudio"
          //src="./fur_elise.mp3"
          //src="./00_ice_sheets.mp3"
			    src="https://labs.phaser.io/assets/audio/Dafunk - Hardcore Power (We Believe In Goa - Remix).ogg"
          type="audio/ogg"
          crossOrigin="anonymous"
          className="w-80"
          controls
          autoPlay
          onPlay={play}
          onLoad={load}
        />
      </div>
      <canvas id="myThreeJsCanvas"></canvas>
    </div>
  );
}
