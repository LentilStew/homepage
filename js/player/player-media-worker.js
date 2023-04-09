// The "media worker" houses and drives the AudioRenderer and VideoRenderer
// classes to perform demuxing and decoder I/O on a background worker thread.
console.info(`Worker started`);

// Ideally we would use the static import { module } from ... syntax for this
// and the modules below. But presently mp4box.js does not use ES6 modules,
// so we import it as an old-style script and use the dynamic import() to load
// our modules below.

importScripts('/js/player/third_party/mp4boxjs/mp4box.all.min.js');
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
let gl = null;

async function importModules() {
  Promise.all([videoImport]).then((modules) => {
    videoRenderer = new modules[0].VideoRenderer();
    moduleLoadedResolver();
    moduleLoadedResolver = null;
    console.info('Worker modules imported');
  })
};

importModules()


async function initialize(data) {
  //inputs
  videoFile = data["videoFile"]
  canvas = data["canvas"]
  //inputs
  console.log("1")
  let demuxerModule = await import('./mp4_pull_demuxer.js');
  videoDemuxer = new demuxerModule.MP4PullDemuxer(videoFile);
  console.log("2")

  if (videoDemuxer == undefined) {
    console.log("invalid path")
  }

  videoReady = videoRenderer.initialize(videoDemuxer, canvas);
  console.log("3")

  await Promise.all([videoReady]);
  console.log("initialize-done")
  postMessage({
    command: 'initialize-done'
  });
  console.log("4")

}

let lastStopTime = 0;
let lastMediaTime = 0;

async function play(data) {

  let mediaStart = performance.now()

  playing = true;
  self.requestAnimationFrame(function renderVideo() {

    if (!playing)
      return;

    let mediaTimeSinceStop = (performance.now() - mediaStart + lastStopTime)

    videoRenderer.render(mediaTimeSinceStop * 1000);

    lastMediaTime = mediaTimeSinceStop

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
  videoRenderer.render(lastMediaTime * 1000);
}

async function pause(data) {
  playing = false;

  lastStopTime = lastMediaTime;
}


const events = {
  initialize: initialize,
  play: play,
  pause: pause,
  setCanvas: setCanvas,
  updateWebGlSize: updateWebGlSize
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
    vertices.push(...new_row);
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
  return hash;
};

function shuffleList(lst, seed) {
  let newList = [...lst];
  for (let index = 0; index < newList.length; index++) {
    seed = getNextSeed(seed)
    newIndex = (seed % (index - newList.length)) + index;

    // Swap the elements 
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]]
  }

  return newList;
}

function triangleShuffle(vertices, seed) {
  let verticesShuffled = JSON.parse(JSON.stringify(vertices));

  let numberOfSquares = Math.floor(vertices.length / 2)
  let swaps = []
  for (let i = numberOfSquares; i < vertices.length; i++) {
    swaps.push(i);
  }

  let topShuffle = shuffleList(swaps, seed)
  for (let i = numberOfSquares; i < vertices.length; i++) { seed = getNextSeed(seed) }
  let bottomShuffle = shuffleList(swaps, getNextSeed(seed))


  for (let triangleIndex = 0; triangleIndex < numberOfSquares; triangleIndex++) {
    //swap this 2 values
    let temp = verticesShuffled[triangleIndex][0];
    verticesShuffled[triangleIndex][0] = verticesShuffled[topShuffle[triangleIndex]][0];
    verticesShuffled[topShuffle[triangleIndex]][0] = temp;

    //swap this 2 values
    temp = verticesShuffled[triangleIndex][1];
    verticesShuffled[triangleIndex][1] = verticesShuffled[bottomShuffle[triangleIndex]][1];
    verticesShuffled[bottomShuffle[triangleIndex]][1] = temp;
  }
  return verticesShuffled
}

function updateWebGlSize(data) {
  if (!gl) { return }

  client_width = data["client_width"]
  client_height = data["client_height"]

  const videoWidth = videoDemuxer.videoTrack.track_width;
  const videoHeight = videoDemuxer.videoTrack.track_height;

  const multiplier = Math.min(client_width / videoWidth, client_height / videoHeight);

  const new_width = Math.floor(videoWidth * multiplier);
  const new_height = Math.floor(videoHeight * multiplier);
  canvas.width = new_width;
  canvas.height = new_height;

  gl.viewport(0, 0, new_width, new_height);
  videoRenderer.render(lastMediaTime * 1000);
}


function webglInit(width_in_squares, height_in_squares, seed) {
  gl = canvas.getContext("webgl");

  const videoWidth = videoDemuxer.videoTrack.track_width;
  const videoHeight = videoDemuxer.videoTrack.track_height;

  const multiplier = Math.min(client_width / videoWidth, client_height / videoHeight);

  const new_width = Math.floor(videoWidth * multiplier);
  const new_height = Math.floor(videoHeight * multiplier);
  canvas.width = new_width;
  canvas.height = new_height;

  gl.viewport(0, 0, new_width, new_height);

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

  return gl
}
