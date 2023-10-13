import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
// import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

// https://medium.com/@coderfromnineteen/three-js-post-processing-outline-effect-6dff6a2fe3c0
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
//Modules below are regarded to shader
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";

export default class SceneInit {
  constructor(canvasID, camera, scene, stats, controls, renderer, fov=36, 
    composer, renderPass, outlinePass, shaderPass) {
    this.fov = fov;
    this.scene = scene;
    this.stats = stats;
    this.camera = camera;
    this.controls = controls;
    this.renderer = renderer;
    this.canvasID = canvasID;
    this.composer = composer;
    this.renderPass  = renderPass;
    this.outlinePass = outlinePass;
    this.shaderPass  = shaderPass;
  }

  initScene() {
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.z = 196;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    this.uniforms = {
      u_time: { type: "f", value: 1.0 },
      colorB: { type: "vec3", value: new THREE.Color(0xfff000) },
      colorA: { type: "vec3", value: new THREE.Color(0xffffff) },
    };

    // specify a canvas which is already created in the HTML file and tagged by an id
    // aliasing enabled
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

    this.stats = Stats();
    // this.stats.dom.style.position = 'absolute';
    // this.stats.dom.style.float = 'left';
    document.body.appendChild(this.stats.dom);

    // ambient light which is for the whole scene
    let ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    ambientLight.castShadow = false;
    this.scene.add(ambientLight);

    // spot light which is illuminating the chart directly
    let spotLight = new THREE.SpotLight(0xffffff, 0.55);
    spotLight.castShadow = false;
    spotLight.position.set(0, 80, 10);
    this.scene.add(spotLight);

    // if window resizes
    window.addEventListener("resize", () => this.onWindowResize(), false);
    // if canvas is clicked
    canvas.addEventListener('click', () => this.onCanvasClick(), false);
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this));
    this.composer.render();
    this.stats.update();
    this.controls.update();
  }

  render() {
    this.uniforms.u_time.value += this.clock.getDelta();
    this.composer.render();
    // this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // this.effect.setSize( window.innerWidth, window.innerHeight );
  }

  onCanvasClick() {
  }
}
