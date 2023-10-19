import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import Oscilloscope from "./Oscilloscope.js"
// import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

// https://medium.com/@coderfromnineteen/three-js-post-processing-outline-effect-6dff6a2fe3c0
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
// import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
//Modules below are regarded to shader
// import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
// import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";

export default class SceneInit {
  constructor(canvasID, fov=36) {
    this.fov = fov;
    this.canvasID = canvasID;
  }

  initScene() {
    this.camera = new THREE.PerspectiveCamera(
      this.fov, window.innerWidth / window.innerHeight, 1, 1000
    );
    this.camera.position.z = 196;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    this.uniforms = {
      u_time: { type: "f", value: 1.0 },
    };

    // specify a canvas which is already created in the HTML file and tagged by an id
    const canvas = document.getElementById(this.canvasID);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // -- shader + outline effect
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // - render pass
    this.renderPass = new RenderPass( this.scene, this.camera );
    this.composer.addPass( this.renderPass );
    // - outline pass
    // this.outlinePass = new OutlinePass(
    //   new THREE.Vector2(window.innerWidth, window.innerHeight),
    //   this.scene,
    //   this.camera
    // )
    // outline not working, just leave it for now
    // this.composer.addPass(this.outlinePass);
    // // -- parameter config
    // this.outlinePass = { 
    //   edgeStrength: 1.0,
    //   edgeGlow: 1.0,
    //   edgeThickness: 1.0,
    //   pulsePeriod: 0,
    //   usePatternTexture: false,
    //   visibleEdgeColor: new THREE.Color( 0x000000 ),
    // } 
    // // pattern texture for an object mesh
    // // this.outlinePass.edgeColor.set("#000000"); // set basic edge color
    // // this.outlinePass.hiddenEdgeColor.set("#1abaff");  // set edge color when it hidden by other objects

    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // this.render.domElement
    // point camera towards center of fft map (see also: camera.lookat)
    this.controls.target = new THREE.Vector3(0, 0, 0);

    const stats = document.getElementById('stats');
    if (stats) {
      stats.parentNode.removeChild(stats)
    }
    this.stats = Stats();
    this.stats.dom.id = 'stats';
    // this.stats.dom.style.float = 'left';
    document.body.appendChild(this.stats.dom);

    const scope = document.getElementById('scope');
    if (scope) {
      scope.parentNode.removeChild(scope)
    }
    this.scope = new Oscilloscope();
    this.scope.dom.id = 'stats';
    document.body.appendChild(this.scope.dom);

    // ambient light which is for the whole scene
    let ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    ambientLight.castShadow = false;
    this.scene.add(ambientLight); 

    // spot light which is illuminating the chart directly
    let spotLight = new THREE.SpotLight(0xffffff, 0.55);
    spotLight.castShadow = false;
    spotLight.position.set(0, 80, 10);
    this.scene.add(spotLight);

    window.addEventListener("resize", () => this.onWindowResize(), false);
    canvas.addEventListener('click', () => this.onCanvasClick(), false);
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this));
    this.composer.render();
    this.scope.render();
    this.stats.update();
    this.controls.update();
  }

  render() {
    this.uniforms.u_time.value += this.clock.getDelta();
    this.composer.render();
    this.scope.render();
    // this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scope.renderer.setSize(window.innerWidth, this.scope.audio.height);
  }

  onCanvasClick() {
  }
}

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

export { vertexShader, fragmentShader };