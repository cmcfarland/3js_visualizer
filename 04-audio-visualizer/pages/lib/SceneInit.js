import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

export default class SceneInit {
  constructor(canvasID, camera, scene, stats, controls, renderer, fov = 36, effect) {
    this.fov = fov;
    this.scene = scene;
    this.stats = stats;
    this.camera = camera;
    this.controls = controls;
    this.renderer = renderer;
    this.canvasID = canvasID;
    this.effect = effect;
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
    // add matlab-style black outlines
    // https://discourse.threejs.org/t/how-do-i-use-outlineeffect-with-mmdloader/8976/2
    this.effect = new OutlineEffect( this.renderer, {
      defaultThickness: 0.01,
      defaultColor: [ 0, 0, 0 ],
      defaultAlpha: 0.0,
      defaultKeepAlive: true // keeps outline material in cache even if material is removed from scene
    } );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // point camera towards center of fft map
    this.controls.target = new THREE.Vector3(0, 0, 0);
    // makes DAT menu load multiple times during error recovery
    //
    // Could not open SceneInit.js in the editor.
    // The editor process exited with an error: Terminal editors can only be used on macOS.
    // To set up the editor integration, add something like REACT_EDITOR=atom to the .env.local file in your project folder and restart the development server.

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
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this));
    this.render();
    this.stats.update();
    this.controls.update();
  }

  render() {
    this.uniforms.u_time.value += this.clock.getDelta();
    this.effect.render( this.scene, this.camera );
    // this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.effect.setSize( window.innerWidth, window.innerHeight );
  }
}
