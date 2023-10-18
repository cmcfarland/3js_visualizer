export default class AudioScope {
  constructor(canvasID, bufferLength=1024) {
    this.canvasID = canvasID;
    this.bufferLength = bufferLength;
  }

  initScope() {
    // from stats.module
    var PR = Math.round( window.devicePixelRatio || 1 );
    var WIDTH = 80 * PR, HEIGHT = 48 * PR;
  
    this.canvas = document.getElementById(this.canvasID);
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.style.cssText = 'width:200px;height:48px';

    this.audioData = new Uint8Array(this.bufferLength);
    this.context = this.canvas.getContext("2d");

    // if window resizes
    window.addEventListener("resize", () => this.onWindowResize(), false);
    // if canvas is clicked
    this.canvas.addEventListener('click', () => this.onCanvasClick(), false);
  }

  // draw an oscilloscope of the current audio source
  animate() {
    window.requestAnimationFrame(this.animate.bind(this));

    this.context.fillStyle = "rgb(0, 0, 0)";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.lineWidth = 2;
    this.context.strokeStyle = "rgb(200, 0, 0)";

    this.context.beginPath();

    const sliceWidth = (this.canvas.width * 1.0) / this.bufferLength;
    let x = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const v = this.audioData[i] / 128.0;
      const y = (v * this.canvas.height) / 2;

      if (i === 0) {
        this.context.moveTo(x, y);
      } else {
        this.context.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.context.lineTo(this.canvas.width, this.canvas.height / 2);
    this.context.stroke();
  }

  onWindowResize() {
    // ??
  }

  onCanvasClick() {
    // toggle visibility
  }
}