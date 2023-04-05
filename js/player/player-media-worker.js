// The "media worker" houses and drives the AudioRenderer and VideoRenderer
// classes to perform demuxing and decoder I/O on a background worker thread.
console.info(`Worker started`);

// Ideally we would use the static import { module } from ... syntax for this
// and the modules below. But presently mp4box.js does not use ES6 modules,
// so we import it as an old-style script and use the dynamic import() to load
// our modules below.
importScripts('/js/player/third_party/mp4boxjs/mp4box.all.min.js');
let audioImport = import('/js/player/lib/audio_renderer.js');
let videoImport = import('/js/player/lib/video_renderer.js');

let filename = null
let canvas = null
let moduleLoadedResolver = null;
let modulesReady = new Promise(resolver => (moduleLoadedResolver = resolver));
let playing = false
let audioRenderer = null;
let videoRenderer = null;
let lastMediaTimeSecs = 0;
let lastMediaTimeCapturePoint = 0;
let client_width = 0;
let client_height = 0;
let audioDemuxer = null;
let audioReady = null;
let videoDemuxer = null;
let videoReady = null;
let seed = 0;

async function importModules() {
  Promise.all([audioImport, videoImport]).then((modules) => {
    audioRenderer = new modules[0].AudioRenderer();
    videoRenderer = new modules[1].VideoRenderer();
    moduleLoadedResolver();
    moduleLoadedResolver = null;
    console.info('Worker modules imported');
  })
};

importModules()

function updateMediaTime(mediaTimeSecs, capturedAtHighResTimestamp) {

  lastMediaTimeSecs = mediaTimeSecs;
  // Translate into Worker's time origin
  lastMediaTimeCapturePoint = capturedAtHighResTimestamp - performance.timeOrigin;

}

// Estimate current media time using last given time + offset from now()
function getMediaTimeMicroSeconds() {

  let msecsSinceCapture = performance.now() - lastMediaTimeCapturePoint;
  return ((lastMediaTimeSecs * 1000) + msecsSinceCapture) * 1000;

}

async function initialize(data) {
  //inputs
  audioFile = data["audioFile"]
  videoFile = data["videoFile"]
  canvas = data["canvas"]
  //inputs

  let demuxerModule = await import('./mp4_pull_demuxer.js');

  audioDemuxer = new demuxerModule.MP4PullDemuxer(audioFile);
  audioReady = audioRenderer.initialize(audioDemuxer);
  videoDemuxer = new demuxerModule.MP4PullDemuxer(videoFile);
  videoReady = videoRenderer.initialize(videoDemuxer, canvas);



  await Promise.all([audioReady, videoReady]);
  console.log("initialize-done")
  postMessage({
    command: 'initialize-done',
    sampleRate: audioRenderer.sampleRate,
    channelCount: audioRenderer.channelCount,
    sharedArrayBuffer: audioRenderer.ringbuffer.buf
  });
}

async function play(data) {
  //inputs
  let mediaTimeSecs = data["mediaTimeSecs"]
  let mediaTimeCapturedAtHighResTimestamp = data["mediaTimeCapturedAtHighResTimestamp"]
  //inputs

  playing = true;

  updateMediaTime(mediaTimeSecs, mediaTimeCapturedAtHighResTimestamp);

  audioRenderer.play();

  self.requestAnimationFrame(function renderVideo() {

    if (!playing)
      return;

    const mediaTime = getMediaTimeMicroSeconds()

    videoRenderer.render(mediaTime);

    self.requestAnimationFrame(renderVideo);


  });
}
function setCanvas(data) {
  const { width_in_squares, height_in_squares } = data
  client_width = data["client_width"]
  client_height = data["client_height"]
  seed = data["seed"]

  const canvasCtx = webglInit(width_in_squares, height_in_squares, seed)
  videoRenderer.setCanvas(canvasCtx, width_in_squares * height_in_squares * 2 * 3)
}
async function pause(data) {
  playing = false;
  audioRenderer.pause();
}

async function _updateMediaTime(data) {
  updateMediaTime(data["mediaTimeSecs"], data["mediaTimeCapturedAtHighResTimestamp"]);
}


const events = {
  initialize: initialize,
  play: play,
  pause: pause,
  updateMediaTime: _updateMediaTime,
  setCanvas: setCanvas
}

self.addEventListener('message', async function (e) {
  await modulesReady;

  console.info(`Worker message: ${JSON.stringify(e.data)}`);

  events[e.data.command](e.data)

});



function verticesCreate(width_in_squares, height_in_squares) {
  const SIDE_LEN = 2;

  const SQUARE_WIDTH = SIDE_LEN / width_in_squares;
  const SQUARE_HEIGHT = SIDE_LEN / height_in_squares;

  let i = -1;

  let vertices_row = []
  for (let index = 0; index < width_in_squares; index++) {
    i += 1;
    //each square is made of 2 triangles
    let first_triangle_vertices = [
      [i * SQUARE_WIDTH - 1, SIDE_LEN - SQUARE_HEIGHT - 1],
      [i * SQUARE_WIDTH - 1, SIDE_LEN - 1],
      [(i + 1) * SQUARE_WIDTH - 1, SIDE_LEN - 1],
    ];
    let second_triangle_vertices = [
      [i * SQUARE_WIDTH - 1, SIDE_LEN - SQUARE_HEIGHT - 1],
      [(i + 1) * SQUARE_WIDTH - 1, SIDE_LEN - SQUARE_HEIGHT - 1],
      [(i + 1) * SQUARE_WIDTH - 1, SIDE_LEN - 1],
    ];
    vertices_row.push([first_triangle_vertices, second_triangle_vertices]);
  }

  let vertices = [];
  for (let y = 0; y < height_in_squares; y++) {
    let new_row = JSON.parse(JSON.stringify(vertices_row));
    new_row.forEach((element) => {
      //top
      element[0][0][1] -= SQUARE_HEIGHT * y;
      element[0][1][1] -= SQUARE_HEIGHT * y;
      element[0][2][1] -= SQUARE_HEIGHT * y;

      //bottom
      element[1][0][1] -= SQUARE_HEIGHT * y;
      element[1][1][1] -= SQUARE_HEIGHT * y;
      element[1][2][1] -= SQUARE_HEIGHT * y;
    });
    vertices.push(new_row);
  }
  return vertices;
}

const getNextSeed = (_seed) => {
  if (_seed == 0) {
    _seed = 1;
  }

  let hash = 0;
  let chr;

  let seed = _seed.toString();

  for (let index = 0; index < seed.length; index++) {
    chr = seed.charCodeAt(index);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  if (hash < 0) {
    hash *= -1;
  }
  console.log(hash)
  return hash;
};

function triangleShuffle(vertices, seed) {

  let verticesShuffled = JSON.parse(JSON.stringify(vertices));

  for (let rowIndex = 0; rowIndex < vertices[0].length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < vertices.length; columnIndex++) {

      //top
      seed = getNextSeed(seed)
      console.log(seed, seed % vertices[0].length)
      let destRow = seed % vertices[0].length;

      seed = getNextSeed(seed)
      let destColumn = seed % vertices.length;

      let triangleTmp = verticesShuffled[columnIndex][rowIndex][0];
      verticesShuffled[columnIndex][rowIndex][0] = verticesShuffled[destColumn][destRow][0];
      verticesShuffled[destColumn][destRow][0] = triangleTmp;


      //top
      seed = getNextSeed(seed)
      destRow = seed % vertices[0].length;

      seed = getNextSeed(seed)
      destColumn = seed % vertices.length;

      triangleTmp = verticesShuffled[columnIndex][rowIndex][1];
      verticesShuffled[columnIndex][rowIndex][1] = verticesShuffled[destColumn][destRow][1];
      verticesShuffled[destColumn][destRow][1] = triangleTmp;
    }
  }
  return verticesShuffled
}

function webglInit(width_in_squares, height_in_squares, seed) {
  const gl = canvas.getContext("webgl");
  /*
  displayWidth: this.videoTrack.track_width,
  displayHeight: this.videoTrack.track_height,
*/
  console.log(videoDemuxer.videoTrack)
  const videoWidth = videoDemuxer.videoTrack.track_width;
  const videoHeight = videoDemuxer.videoTrack.track_height;

  const multiplier = Math.min(client_width / videoWidth, client_height / videoHeight);

  const new_width = Math.floor(videoWidth * multiplier);
  const new_height = Math.floor(videoHeight * multiplier);
  canvas.width = new_width;
  canvas.height = new_height;

  console.log("new_width, new_height", client_width, client_height)

  console.log("new_width, new_height", new_width, new_height)
  gl.viewport(0, 0, new_width, new_height);
  gl.clearColor(1.0, 0.8, 0.1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const vertShaderSource = `
    attribute vec2 position;
    attribute vec2 position2;

    varying vec2 texCoords;

    void main() {
    texCoords = (position2 + 1.0) / 2.0;
    texCoords.y = 1.0 - texCoords.y;
    gl_Position = vec4(position, 0, 1.0);
    }
`;

  const fragShaderSource = `
    precision highp float;

    varying vec2 texCoords;

    uniform sampler2D textureSampler;

    void main() {
    gl_FragColor = texture2D(textureSampler, texCoords);
    }
`;

  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertShader, vertShaderSource);
  gl.shaderSource(fragShader, fragShaderSource);

  gl.compileShader(vertShader);
  gl.compileShader(fragShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);

  gl.linkProgram(program);

  gl.useProgram(program);

  let vertices = verticesCreate(width_in_squares, height_in_squares)

  const verticesAsArray = new Float32Array(vertices.flat(Infinity))

  let shuffledVertices = triangleShuffle(vertices, seed)
  console.log(shuffledVertices)
  const shuffledVerticesAsArray = new Float32Array(shuffledVertices.flat(Infinity))

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesAsArray, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, "position");

  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLocation);

  const vertexBuffer2 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer2);
  gl.bufferData(gl.ARRAY_BUFFER, shuffledVerticesAsArray, gl.STATIC_DRAW);

  const positionLocation2 = gl.getAttribLocation(program, "position2");
  gl.vertexAttribPointer(positionLocation2, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLocation2);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  //gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
  return gl
}
