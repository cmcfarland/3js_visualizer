// based on stats.module.js and 
// https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData

var Oscilloscope = function () {

		var mode = 0;
		var container = document.createElement('div');

		container.style.cssText = 'position:fixed;top:0;left:0;cursor:pointer;opacity:1.0;z-index:10000';
		// container.className = 'absolute top center';
		container.addEventListener('click', function (event) {

			event.preventDefault();
			showPanel(++mode % container.children.length);

		}, false);

		function addPanel(panel) {

			container.appendChild(panel.dom);
			return panel;

		}

		function showPanel(id) {

			for (var i = 0; i < container.children.length; i++) {

				container.children[i].style.display = i === id ? 'block' : 'none';

			}

			mode = id;

		}

		//
		var beginTime = (performance || Date).now(), 
		prevTime = beginTime;
		frames = 0;

		timePanel = addPanel(new Oscilloscope.Panel('time', '#0ff', '#002'));
		
		// var fpsPanel = addPanel( new Oscilloscope.Panel( 'FPS', '#0ff', '#002' ) );
		// var msPanel = addPanel( new Oscilloscope.Panel( 'MS', '#0f0', '#020' ) );
		// if ( self.performance && self.performance.memory ) {
		// 	var memPanel = addPanel( new Oscilloscope.Panel( 'MB', '#f08', '#201' ) );
		// }
		showPanel(0);

		return {
			REVISION: 1,

			dom: container,
			analyser: analyser,

			addPanel: addPanel,
			showPanel: showPanel,

			begin: function () {

				beginTime = (performance || Date).now();

			},

			end: function () {

				frames++;

				var time = (performance || Date).now();

				analyser.getByteTimeDomainData(dataArray);

				if ( timePanel ) {
					timePanel.update(dataArray);
				}
				// msPanel.update( time - beginTime, 200 );
				if (time >= prevTime + 1000) {

					// fpsPanel.update( ( frames * 1000 ) / ( time - prevTime ), 100 );
					prevTime = time;
					frames = 0;

					// if ( memPanel ) {
					// 	var memory = performance.memory;
					// 	memPanel.update( memory.usedJSHeapSize / 1048576, memory.jsHeapSizeLimit / 1048576 );
					// }
				}

				return time;

			},

			update: function () {

				beginTime = end();
				
			},

			// Backwards Compatibility
			domElement: container,
			setMode: showPanel
		};

	}
	// Stats.Panel = function ( name, fg, bg ) {
	Oscilloscope.Panel = function ( title, fg, bg, analyser ) {

		var round = Math.round, SCALE = 0.9;
		var PR = round(window.devicePixelRatio || 1);
		var WIDTH = round(window.width || 1), HEIGHT = 48 * PR, AXIS = HEIGHT / 2;

		var canvas = document.createElement('scope');
		var BUFFER_LENGTH = analyser.fftsize;

		canvas.width = WIDTH;
		canvas.height = HEIGHT;
		// canvas.style.cssText = 'width:80px;height:48px';
		var context = canvas.getContext('2d');

		context.fillStyle = bg;
		context.fillRect(0, 0, WIDTH, HEIGHT);

		context.fillStyle = fg;
		const sliceWidth = (WIDTH * 1.0) / BUFFER_LENGTH;
		let x = 0;

		return {
			dom: canvas,

			update: function (dataArray) {

				context.fillStyle = bg;
				context.globalAlpha = 1;
				context.fillRect(0, 0, WIDTH, HEIGHT);

				context.fillStyle = fg;
				// context.fillText( round( value ) + ' ' + title + ' (' + round( min ) + '-' + round( max ) + ')', PR, PR );
				// context.drawImage( canvas, GRAPH_X + PR, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT, GRAPH_X, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT );
				context.beginContour();
				for (let i = 0; i < BUFFER_LENGTH; i++) {
					const v = dataArray[i] / 128.0;
					const y = (v * HEIGHT) / 2;

					if (i === 0) {
						context.moveTo(x, y);
					} else {
						context.lineTo(x, y);
					}

					x += sliceWidth;

				}

				context.lineTo(WIDTH, AXIS);
				context.stroke();

			}
		};
	}

export default Oscilloscope;
