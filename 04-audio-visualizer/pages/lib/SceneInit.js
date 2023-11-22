import dynamic from "next/dynamic"
// https://www.codingdeft.com/posts/next-window-not-defined/

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import Oscilloscope from "./Oscilloscope.js"
import { vertexShaderScope, fragmentShaderScope } from "./Oscilloscope";

var mediaLinks = {
  0: { src:'../00_ice_sheets.mp3', 
       type:'audio/mpeg' },
  1: { src:"https://labs.phaser.io/assets/audio/Dafunk - Hardcore Power (We Believe In Goa - Remix).ogg", 
       type:'audio/ogg' },
  2: { src:'https://www.youtube.com/live/MwtVkPKx3RA;', 
       type:'audio/mpeg' },
  3: { src:'http://s9.viastreaming.net:9000/;stream.mp3', 
       type:'audio/mpeg' },
  4: { src:'https://nstmradio.mixlr.com/events/2787207', 
       type:'audio/mpeg' }
};

{/*// https://medium.com/@coderfromnineteen/three-js-post-processing-outline-effect-6dff6a2fe3c0
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

// const dat = dynamic(() => import("dat.gui"), {
//   ssr: false, // Do not import in server side
// })
*/}
// set multiple object attributes at once
const setMultiAttributes = (object, attributes) => {
  try { 
    // https://stackoverflow.com/questions/22191576/javascript-createelement-and-setattribute
    console.log(Object.entries(attributes));
    Object.entries(attributes).forEach(([key, val]) => object.setAttribute(key, val));
  } catch (error) { console.error(error); }
}

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
    this.renderer.domElement.id = "renderer";

    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // this.render.domElement

    console.log(mediaLinks);

    document.head.title = 'Livestream music visualizer';
    this.mainDiv = document.getElementById('mainDiv');
    this.mediaDiv = document.getElementById('mediaDiv');
    this.eventLog = document.querySelector(".event-log-contents");
    if (this.media === undefined) {
      this.media = new MediaInit();
      // remove old media elements and add current one
      while (this.mediaDiv.firstChild) {
        this.mediaDiv.removeChild(this.mediaDiv.firstChild);
      }
      this.mediaDiv.appendChild(this.media.video);
    }
}
  
  setupScene() {

    const setupGui = async () => {
      // try { // setup GUI parent element
        const dat = await import("dat.gui");
        try { // remove duplicate controls caused by rapid-refresh 
          const old_gui = document.getElementById('gui');
          if (old_gui) {
            while (old_gui.firstChild) {
              old_gui.removeChild(old_gui.firstChild);
            }
          }
        } catch (error) { console.error(error); }
        
        try { // setup GUI child element
          this.gui = new dat.GUI();
          this.gui.domElement.id = 'scene_gui';
          const guiParentNode = this.gui.domElement.parentNode;
          guiParentNode.id = 'gui'; 
          this.mainDiv.appendChild(guiParentNode);
        } catch (error) { console.error(error); }

        // setup frequency controls
        try { 
          this.freqGui = this.gui.addFolder("frequency");
          this.freqGui
            .add(this.planeCustomMaterial, "wireframe")
            .name("wireframe")
            .setValue(true)
            .listen();
          this.freqGui
            .add(this.uniforms_fft.u_amplitude, "value", 1.0, 25.0)
            .name("freq scale")
            .setValue(this.uniforms_fft.u_amplitude.value)
            .listen();
          // freqGui
          //   .add(this.media.analyser, "smoothingTimeConstant", 0, 1.0)
          //   .name("time smoothing")
          //   .setValue(0.8)
          //   .listen();
        } catch (error) { console.error(error); }
        
        // setup audio controls
        try { 
          this.audioGui = this.gui.addFolder("audio");
          this.audioGui
            .add(this.uniforms_scope.u_scale_y, "value", 10.0, 200.0)
            .name("time scale: Y")
            .setValue(this.uniforms_scope.u_scale_y.value)
            .listen();
          this.audioGui
            .add(this.uniforms_scope.u_scale_x, "value", 1.0, 5.0)
            .name("time scale: X")
            .setValue(this.uniforms_scope.u_scale_x.value)
            .listen();
          this.audioGui
            .add(this.uniforms_scope.u_gain, "value", 0.0, 1.0)
            .name("volume")
            .setValue(0.1)
            .listen()
            .onChange((new_gain) => {
              this.media.gainVolume.gain.setValueAtTime(
                new_gain, this.media.context.currentTime)
            });
        } catch (error) { console.error(error); }
        // } catch (error) { console.error(error); }
      // } catch (error) { console.error(error); }
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

    // browser waits for gesture from user before initializing audio context
    const updateMedia = () => {
      // this.media.video.update();
      if (this.media.context === undefined) {
        this.media.setupAudioContext();
        // can't add fft properties to GUI until context is created
        this.freqGui
          .add(this.media.analyser, "smoothingTimeConstant", 0, 1.0)
          .name("time smoothing")
          .setValue(0.8)
          .listen();
      }
      const render = () => {
        if (!this.media.video.paused) {
          this.media.analyser.getByteFrequencyData(this.dataArray);
          this.media.analyser.getFloatTimeDomainData(this.timeArray);
      
          // this.uniforms_fft.u_time.value = time;
          this.uniforms_fft.u_data_arr.value = this.dataArray;
          this.uniforms_scope.u_data_arr.value = this.timeArray;
        }  
        // note: call render function on every animation frame
        requestAnimationFrame(render);
      };

      render();
    };

    
    const setupDomElements = () => {

      const handleEvent = (event) => {
        if (event.type === 'play') { 
          updateMedia();
        } 
        if (event.type === 'pause' || event.type === 'play' ) { 
          console.log(`${event.type} => ${this.media.video.currentTime} / ${this.media.video.duration} sec`);
        } else {
          console.log(`${event.type}`);
        }
      };

      try { // setup visual elements
        this.canvas = document.getElementById(this.canvasID);
        if (this.canvas) { 
          this.renderer.setSize(window.innerWidth, window.innerHeight);
          // remove any old renderers leftover from fast refresh
          const old_renderer = document.getElementById('renderer');
          if (old_renderer) {
            old_renderer.parentNode.removeChild(old_renderer);
          }
          document.body.appendChild(this.renderer.domElement);  

          // position camera directly above origin
          this.camera.position.z = 150;
          // point camera towards origin (see also: camera.lookat)
          this.controls.target = new THREE.Vector3(0, 0, 0);
        }
      } catch (error) { console.error(error); }

      try { // setup stats module
        const stats = document.getElementById('stats');
        if (stats) {
          stats.parentNode.removeChild(stats)
        }
        this.stats = Stats();
        this.stats.dom.id = 'stats';
        this.mainDiv.appendChild(this.stats.dom);
      } catch (error) { console.error(error); }

      try { // setup oscilloscope module
        const scope = document.getElementById('scope');
        if (scope) {
          scope.parentNode.removeChild(scope)
        }
        this.scope = new Oscilloscope();
        this.scope.dom.id = 'scope';
        this.mainDiv.appendChild(this.scope.dom);
      } catch (error) { console.error(error); }

      // try { // setup geometry and DAT GUI
        if (this.gui === undefined) {
          setupGeometry();
          setupGui(); 
        }  
      // } catch (error) { console.error(error); }

      // add event listeners
      window.addEventListener("resize", () => this.onWindowResize(), { passive: true } );

      const mediaEvents = ['loadstart', 'canplay', 'canplaythrough', 'play', 'pause'];
      mediaEvents.forEach((event) => this.media.video.addEventListener(event, handleEvent));
    };

    setupDomElements();
  }

  animate() {
    // call render function on every animation frame
    // requestAnimationFrame(render);  
    window.requestAnimationFrame(this.animate.bind(this));

    this.renderer.render(this.scene, this.camera); // this.composer.render();
    this.scope.render();
    this.stats.update();
    this.controls.update();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scope.renderer.setSize(window.innerWidth, this.scope.audio.height);
  }

}

// helper class for all the WebAudio API stuff
class MediaInit { 
  constructor(mediaID='media', fftSize=2048, mediaLink=mediaLinks[0]) {
    this.mediaID = mediaID;
    this.fftSize = fftSize;
    this.mediaLink = mediaLink;
    console.log('available tracks:')
    // Object.entries(mediaLinks).forEach(([src, type]) => console.log(`${type} : ${src}`));
    for (const [obj, track] of Object.entries(mediaLinks)) { 
      for (const [attr, value] of Object.entries(track)) {
        console.log(`${obj} : ${attr} : ${value}`)
      }
    }
    try { // create new media context every time the input track changes
      // https://stackoverflow.com/questions/50657659/different-behaviour-of-webaudio-api-on-google-chrome  
      this.mediaSource = document.createElement('source');
      setMultiAttributes(this.mediaSource, {
        'src':this.mediaLink['src'], 
        'type':this.mediaLink['type'],
      });
      console.log("media source: " + this.mediaLink['src']);

      this.video = document.createElement('video');
      setMultiAttributes(this.video, {
        'id':'media', 'controls':'', 'autoPlay':'', 'loop':true,  
      });
      this.video.appendChild(this.mediaSource);
    } catch (error) { console.error(error); }
  }

  setupAudioContext() {
    try { // create new audio context and bind media element  to it
      this.context = new window.AudioContext();
      // can play audio/video from livestreams, but not access via script due to CORS policy: 
      // need proxy server to override: https://medium.com/nodejsmadeeasy/a-simple-cors-proxy-for-javascript-applications-9b36a8d39c51
      // "/proxy/rttp_stream.mp3" => "http://s9.viastreaming.net:9000/;stream.mp3"
      this.elementSource = this.context.createMediaElementSource(this.video);
    
      // need separate gain node to adjust playback volume while preserving signal fidelity
      this.gainVolume = new GainNode(this.context, { gain: 0.5 });
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.elementSource.connect(this.analyser);
      this.analyser.connect(this.context.destination);

      console.log("media channels: " + this.analyser.channelCount);
    } catch (error) { console.error(error); }
  }
}