// based on stats.module.js, https://steven.codes/oscilloscope/, and 
// https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData

import * as THREE from "three";

export default class Oscilloscope {
	constructor( buffer=1024 ) {
		this.buffer = buffer;		
		this.dom = document.createElement('div');
		this.dom.style.backgroundColor = '#000'
		// extend from Stats
	  this.dom.style.cssText = 'position:fixed;top:0;left:80;opacity:0.7';
	
		this.audio = this.addPanel(new Panel('time', '#f00', '#002'));
		
		this.scene = new THREE.Scene();
    // let ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    // ambientLight.castShadow = false;
    // this.scene.add(ambientLight); 

		this.width = this.audio.canvas.width / 2;
		this.height = this.audio.canvas.height / 2;
		this.camera = new THREE.OrthographicCamera( -buffer, buffer, this.height, -this.height, 0 );
		this.scene.add(this.camera);
		
		this.camera.position.x = 0;
		this.camera.position.y = 0;
		this.camera.position.z = 10;
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));
		// this.CAM_FACE_2D = this.camera.quaternion.clone();

		this.renderer = new THREE.WebGLRenderer({ 
			canvas: this.audio.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, this.audio.height);

		// this.dom.addEventListener('click', function (event) {
		// 	event.preventDefault();
		// 	this.showHidePanel(); // (++mode % dom.children.length);
		// }, false);

		// if window resizes
    window.addEventListener("resize", () => this.onWindowResize(), false);

	}

	addPanel = function (panel) {
		this.dom.appendChild(panel.canvas);
		return panel;
	}

	showHidePanel = function(panel) {
		// alternate between showing and hiding canvas
		panel.canvas.style.display = 'block' ? 'none' : 'block';
	}

	render = function() {
		this.renderer.render( this.scene, this.camera );
	}

	onWindowResize() {
    this.camera.aspect = window.innerWidth / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, this.height);
  }
};

class Panel {
	constructor( name, fg='#f00', bg='#000' ) {
		[this.name, this.fg, this.bg] = [name, fg, bg];

		this.PR = Math.round(window.devicePixelRatio || 1);
		this.width = window.innerWidth; // Math.round(window.width || 1);
		this.height = 48 * this.PR; 
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.canvas.style.cssText = 'width:'+ (this.width) +'px;height:48px';
		this.canvas.style.display = 'block'
	}
};

const vertexShaderScope = ( buffer=1024 ) => {
	return `
		uniform float u_scale_y;
		uniform float u_scale_x;
		uniform float[`+ buffer +`] u_data_arr;

		void main() {

			// scale X from center of view
			float f_buffer = float(`+ buffer +`)/2.0;
			float floor_x = floor(position.x + f_buffer);
			float new_x = position.x * u_scale_x; // * (position.x - f_buffer);
			float new_y = u_data_arr[int(floor_x)] * u_scale_y;

			gl_Position = projectionMatrix * modelViewMatrix * vec4(new_x, new_y, position.z, 1.0);

		}
	`;
};

const fragmentShaderScope = () => {
	// varying vec3 vColor; // red
  return `
	void main() {

		gl_FragColor = vec4( 0.8, 0.0, 0.0, 1.0 );

	}
	`;
};

export { vertexShaderScope, fragmentShaderScope };