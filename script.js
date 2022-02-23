var anim;
var MIN_RADIUS = 32;
var JITTER_RANGE = window.innerHeight <= window.innerWidth ? window.innerHeight / 2 - MIN_RADIUS : window.innerWidth / 2 - MIN_RADIUS;
JITTER_RANGE = JITTER_RANGE * 1.2;
var NUM_NODES = 256; // only 1/2 of these are actually drawn

// derived
var CENTER = MIN_RADIUS + JITTER_RANGE;
var SIZE = CENTER * 2;
var points = [];
var wdraw = [];
var mouse = {
    x: 0.5,
    y: 0.5
};

var canvas = document.getElementById("shader");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

var vertexShader = gl.createShader(gl.VERTEX_SHADER);
var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

gl.shaderSource(vertexShader, document.getElementById("vertex").innerHTML);
gl.shaderSource(fragmentShader, document.getElementById("fragment").innerHTML);

gl.compileShader(vertexShader);
gl.compileShader(fragmentShader);

var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

program.time = gl.getUniformLocation(program, "time");
program.resolution = gl.getUniformLocation(program, "resolution");
program.mouse = gl.getUniformLocation(program, "mouse");
program.position = gl.getAttribLocation(program, "vertPosition");

function xyFromPolar(r, theta) {
    var x = Math.round(r / 1) * 1 * Math.cos(theta);
    var y = Math.round(r / 1) * 1 * Math.sin(theta);
    points.push({
            x: ((x * 2) / window.innerWidth),
            y: ((y * 2) / window.innerHeight)
        });
}

function stamp(db, i) {
    var r = MIN_RADIUS + (db * JITTER_RANGE) / 255;
    var theta = (i - 2) / (NUM_NODES - 2.0) * Math.PI + Math.PI / 4.0;
    xyFromPolar(r, theta);
}

function stamp2(db, i) {
    var r = MIN_RADIUS + (db * JITTER_RANGE) / 255;
    var theta = Math.PI - i / NUM_NODES * Math.PI - Math.PI / 4.0;
    xyFromPolar(r, theta);
}

function update(analyser) {
    var freqArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqArray);
    points = [];
    wdraw = [];
    // the bottom 1/8 and top 3/8 of this song are pretty boring...
    for (var i = NUM_NODES / 8; i <= NUM_NODES * 5 / 8; i+=2) {
        stamp(freqArray[i], i << 0);
        stamp(freqArray[i], i << 1);
        stamp(freqArray[i], i << 2);
    }
    for (var i = NUM_NODES / 8; i <= NUM_NODES * 5 / 8; i+=2) {
        stamp2(freqArray[i], i << 0);
        stamp2(freqArray[i], i << 1);
        stamp2(freqArray[i], i << 2);
    }
    points.forEach(function(element, index, array) {
        if (array[index + 1]) {
            wdraw.push(element.x, element.y, array[index + 1].x, array[index + 1].y, 0, 0);
        } else {
            wdraw.push(element.x, element.y, array[0].x, array[0].y, 0, 0);
        }
    });
    render();
    anim = window.requestAnimationFrame(update.bind(this, analyser));
}

function loadSound(url, cb) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        cb(request.response);
    };
    request.send();
}

loadSound('https://cdn.glitch.com/33316a32-724f-4318-9d21-00250ecbdafb%2Fmonsters.mp3?1524420405532', function(res) {
    var audioContext = new window.AudioContext() || window.webkitAudioContext();
    audioContext.decodeAudioData(res, function(buffer) {
        var analyser = audioContext.createAnalyser();
        var sourceNode = audioContext.createBufferSource();
        analyser.smoothingTimeConstant = 0.6;
        analyser.fftSize = NUM_NODES * 2;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        sourceNode.buffer = buffer;
        analyser.connect(audioContext.destination);
        sourceNode.connect(analyser);
        sourceNode.start(0);
        update(analyser);

        render();

        var playing = true;

        var control = document.querySelector('p');
        control.className = 'fa fa-pause';
        control.textContent = '';

        window.onclick = function() {
            sourceNode[(playing ? 'dis' : '') + 'connect'](analyser);
            control.className = 'fa fa-' + (playing ? 'play' : 'pause');
            playing ? window.cancelAnimationFrame(anim) : update(analyser);
            playing = !playing;
        };
    });
});
var time = 0;

function render() {
    gl.clearColor(56 / 255, 35 / 255, 37 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wdraw), gl.STATIC_DRAW);
    gl.useProgram(program);

    gl.uniform1f(program.time, time / 50);
    gl.uniform2f(program.resolution, window.innerWidth, window.innerHeight);
    gl.uniform2f(program.mouse, mouse.x, 1 - mouse.y);
    gl.enableVertexAttribArray(program.position);
    gl.vertexAttribPointer(program.position, 2, gl.FLOAT, gl.FALSE, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, wdraw.length / 2);
    time++;
}

window.onmousemove = function(e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
};
window.onresize = function() {
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    JITTER_RANGE = window.innerHeight <= window.innerWidth ? window.innerHeight / 2 - MIN_RADIUS : window.innerWidth / 2 - MIN_RADIUS;
    CENTER = MIN_RADIUS + JITTER_RANGE;
    SIZE = CENTER * 2;
};