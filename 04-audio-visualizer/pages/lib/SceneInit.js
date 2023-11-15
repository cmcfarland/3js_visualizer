import dynamic from "next/dynamic"
// https://www.codingdeft.com/posts/next-window-not-defined/

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import Oscilloscope from "./Oscilloscope.js"
import { vertexShaderScope, fragmentShaderScope } from "./Oscilloscope";

// https://medium.com/@coderfromnineteen/three-js-post-processing-outline-effect-6dff6a2fe3c0
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

// const dat = dynamic(() => import("dat.gui"), {
//   ssr: false, // Do not import in server side
// })

export default class SceneInit {
  constructor(canvasID='threeJsCanvas', fftSize=2048, fov=36) {
    this.canvasID = canvasID;
    this.fov = fov;
    this.fftSize = fftSize;

    this.dataArray = new Uint8Array(fftSize / 2);
    this.timeArray = new Float32Array(fftSize / 2);
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      this.fov, window.innerWidth / window.innerHeight, 1, 1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // this.render.domElement
  }
  
  setupScene() {
    const setupAudioContext = () => {
      // bug when switching betwen tracks in Chrome (needs refresh and/or browser restart): 
      // InvalidStateError: Failed to execute 'createMediaElementSource' on 'AudioContext': 
      // HTMLMediaElement already connected previously to a different MediaElementSourceNode.
      // https://stackoverflow.com/questions/50657659/different-behaviour-of-webaudio-api-on-google-chrome  
      this.audioContext = new window.AudioContext();
      this.audioElement = document.getElementById("media");
      // this.audioElement.onplay = {playMedia};
      this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
  
      // adjust playback volume AFTER analyser node to avoid affecting signal display
      this.gainNode = new GainNode(this.audioContext, { gain: 0.5 });
  
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      console.log("media channels: " + this.analyser.channelCount);
    };
  
    const setupGui = async () => {
      const dat = await import("dat.gui");

      // remove duplicate components caused by rapid-refresh 
      const old_gui = document.getElementById('gui');
      if (old_gui) {
        old_gui.parentNode.removeChild(old_gui)
      }
  
      this.gui = new dat.GUI();
      const guiParentNode = this.gui.domElement.parentNode;
      guiParentNode.id = 'gui'; 
      document.body.appendChild(guiParentNode);
  
      const freqGui = this.gui.addFolder("frequency");
      freqGui
        .add(this.planeCustomMaterial, "wireframe")
        .name("wireframe")
        .setValue(true)
        .listen();
      freqGui
        .add(this.uniforms_fft.u_amplitude, "value", 1.0, 25.0)
        .name("freq scale")
        .setValue(this.uniforms_fft.u_amplitude.value)
        .listen();
      // freqGui
      //   .add(this.analyser, "smoothingTimeConstant", 0, 1.0)
      //   .name("time smoothing")
      //   .setValue(0.8)
      //   .listen();
      const audioGui = this.gui.addFolder("audio");
      audioGui
        .add(this.uniforms_scope.u_scale_y, "value", 10.0, 200.0)
        .name("time scale: Y")
        .setValue(this.uniforms_scope.u_scale_y.value)
        .listen();
      audioGui
        .add(this.uniforms_scope.u_scale_x, "value", 1.0, 5.0)
        .name("time scale: X")
        .setValue(this.uniforms_scope.u_scale_x.value)
        .listen();
      audioGui
        .add(this.uniforms_scope.u_gain, "value", 0.0, 1.0)
        .name("gain")
        .setValue(0.1)
        .listen()
        .onChange((new_gain) => {
          this.gainNode.gain.setValueAtTime(new_gain, this.audioContext.currentTime)
        });
    };
  
    const setupGeometry = () => {
      
      const vertexShader = () => {
        return `
            varying float x;
            varying float y;
            varying float z;
            varying vec3 vUv;
    
            uniform float u_time;
            uniform float u_amplitude;
            uniform float[64] u_data_arr;
    
            void main() {
              vUv = position;
    
              x = abs(position.x);
              y = abs(position.y);
    
              float floor_x = round(x);
              float floor_y = round(y);
    
              z = sin(u_data_arr[int(floor_x)] / 50.0 + u_data_arr[int(floor_y)] / 50.0) * u_amplitude;
    
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, z, 1.0);
            }
          `;
      };
    
      const fragmentShader = () => {
        return `
          varying float x;
          varying float y;
          varying float z;
          varying vec3 vUv;
    
          uniform float u_time;
    
          void main() {
            gl_FragColor = vec4((32.0 - abs(x)) / 32.0, (32.0 - abs(y)) / 32.0, (abs(x + y) / 2.0) / 32.0, 1.0);
          }
        `;
      };

      this.uniforms_fft = {
        u_time: {
          type: "f",
          value: 1.0,
        },
        u_amplitude: {
          type: "f",
          value: 10.0,
        },
        u_data_arr: {
          type: "float["+ this.dataArray.length +"]",
          value: this.dataArray,
        },
      };
    
      this.uniforms_scope = {
        u_scale_y: {
          type: "f",
          value: 25.0,
        },
        u_scale_x: {
          type: "f",
          value: 2.0,
        },
        u_data_arr: {
          type: "float["+ this.timeArray.length +"]",
          value: this.timeArray,
        },
        u_gain: {
          type: "f",
          value: 0.1,
        },
      };
  
      this.scopeShaderMaterial = new THREE.ShaderMaterial({
        uniforms:       this.uniforms_scope,
        vertexShader:   vertexShaderScope( this.fftSize ),
        fragmentShader: fragmentShaderScope(),
        // blending:       THREE.AdditiveBlending,
        depthTest:      false,
        transparent:    false
      });
  
      // audio oscilloscope visualizer, centered on screen
      const positions = [];
      for (var i = -this.timeArray.length/2; i < this.timeArray.length/2; i++) {
        positions.push( new THREE.Vector3( i, 0, 0 ) );
      }    
      this.timeLineBuffer = new THREE.BufferGeometry().setFromPoints(positions);
      this.timeLine = new THREE.Line(this.timeLineBuffer, this.scopeShaderMaterial);
      this.scope.scene.add(this.timeLine);
      
      // FFT plane visualizer
      const planeHalfLength = this.timeArray.length / 8;
      this.planeGeometry = new THREE.PlaneGeometry(planeHalfLength, planeHalfLength, planeHalfLength, planeHalfLength);
      this.planeCustomMaterial = new THREE.ShaderMaterial({
        // passing FFT data to shaders
        uniforms: this.uniforms_fft,
        vertexShader: vertexShader(),
        fragmentShader: fragmentShader(),
        wireframe: true,
      });
  
      this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeCustomMaterial);
      this.planeMesh.rotation.x = -Math.PI / 2 + Math.PI / 4;
      this.planeMesh.position.y = 1;
      this.scene.add(this.planeMesh);
    };

    const mainDiv = document.getElementById('mainDiv');
    const canvas = document.getElementById(this.canvasID);
    if (canvas) {
      this.canvas = canvas;
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);  

    // position camera directly above origin
    this.camera.position.z = 150;
    // point camera towards origin (see also: camera.lookat)
    this.controls.target = new THREE.Vector3(0, 0, 0);

    const stats = document.getElementById('stats');
    if (stats) {
      stats.parentNode.removeChild(stats)
    }
    this.stats = Stats();
    this.stats.dom.id = 'stats';
    mainDiv.appendChild(this.stats.dom);

    const scope = document.getElementById('scope');
    if (scope) {
      scope.parentNode.removeChild(scope)
    }
    this.scope = new Oscilloscope();
    this.scope.dom.id = 'scope';
    mainDiv.appendChild(this.scope.dom);

    if (this.audioContext === undefined) {
      // setupAudioContext();
    } 

    if (this.gui === undefined) {
      setupGeometry();
      setupGui();
      // await setupGui();
    }  

    window.addEventListener("resize", () => this.onWindowResize(), false);
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
    // this.composer.render();
    this.scope.render();
    this.stats.update();
    this.controls.update();
  }

  render() {
    this.uniforms_fft.u_time.value += this.clock.getDelta();
    // this.renderer.render(this.scene, this.camera);
    this.composer.render();
    this.scope.render();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scope.renderer.setSize(window.innerWidth, this.scope.audio.height);
  }

  // send audio data to visual components
  playMedia = async () => {
    const render = (time) => {
      // freeze waveform when song is paused
      if (!this.audioElement.paused){
        this.analyser.getByteFrequencyData(this.dataArray);
        this.analyser.getFloatTimeDomainData(this.timeArray);

        this.uniforms_fft.u_time.value = time;
        this.uniforms_fft.u_data_arr.value = this.dataArray;
        this.uniforms_scope.u_data_arr.value = this.timeArray;
      }

      // call render function on every animation frame
      requestAnimationFrame(render);
    };

    render();
  };

}