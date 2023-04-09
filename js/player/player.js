
class videoShuffeler extends HTMLElement {
  
  #width_in_squares = 1;
  #height_in_squares = 1;
  #seed = 0;

  #mediaWorker = null;

  constructor() {

    super();

    this._shadowRoot = this.attachShadow({ mode: "open" });
    this._shadowRoot.innerHTML = `
    <style>
      canvas {
        display: block;
        margin: auto;
      }
    </style>

  `;

  this.a = document.createElement('a');
  this.a.style.display = 'none';
  this._shadowRoot.appendChild(this.a)



    this.mediaTimeUpdateInterval = null;
    
    this.ChangeTriangles = this.ChangeTriangles.bind(this);
    this.Play = this.Play.bind(this);
    this.Pause = this.Pause.bind(this);
    
    this.playing = false
    this.playReady = false
    this.recording = false


    this.#Init();


  }

  #ReloadRenderer() {
    this.#mediaWorker.postMessage({
      command: "setCanvas",
      seed: this.#seed,
      width_in_squares: this.#width_in_squares,
      height_in_squares: this.#height_in_squares,
      client_width: this.clientWidth,
      client_height: this.clientHeight
    });
  }

  #UpdateWebGlSize()
  {
    this.#mediaWorker.postMessage({command: "updateWebGlSize",
    client_width:this.clientWidth,
    client_height:this.clientHeight,
  
  });

  }

  async #WaitForWorkerCommand(command) {
    let initResolver = null;
    let initDone = new Promise((resolver) => (initResolver = resolver));
    let res = null;

    this.#mediaWorker.addEventListener("message", (e) => {
      console.assert(e.data.command == command);
      res = e.data;
      initResolver();
      initResolver = null;
    });

    await initDone;
    this.#ReloadRenderer()
    return res;
  }

  async #Init() {
    this.canvas = document.createElement("canvas");
    this._shadowRoot.appendChild(this.canvas);
    this.style.overflow = "hidden"

    this.playReady = false
    const src = this.getAttribute("src");
    const offscreenCanvas = this.canvas.transferControlToOffscreen();
    this.#mediaWorker = new Worker(window.location.origin + "/js/player/player-media-worker.js");//TODO
    this.#mediaWorker.postMessage(
      {
        command: "initialize",
        videoFile: src,
        canvas: offscreenCanvas,
      },
      [offscreenCanvas]
    );

    await this.#WaitForWorkerCommand("initialize-done");


    //create a canvas
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this) {
          // call your function here
          this.#UpdateWebGlSize()
        }
      }
    });
    resizeObserver.observe(this);
    this.#ReloadRenderer()

    this.playReady = true
  }

  Play() {
    if (this.playReady == false || this.playing) { return false }

    this.#mediaWorker.postMessage({
      command: "play"
    });


    this.playing = true;
    return true
  }

  Pause() {
    if (this.playReady == false || !this.playing) { return false }
    this.#mediaWorker.postMessage({ command: "pause" });
    this.playing = false;
    return true
  }

  ChangeTriangles(x, y) {
    if (this.playReady == false) { return false }


    this.#width_in_squares = x;
    this.#height_in_squares = y;
    this.#mediaWorker.postMessage({
      command: "setCanvas",
      seed: this.#seed,
      width_in_squares: x,
      height_in_squares: y,
      client_width: this.clientWidth,
      client_height: this.clientHeight
    });
    return true
  }

  ChangeSeed(seed) {
    if (this.playReady == false) { return false }
    this.#seed = seed

    this.#mediaWorker.postMessage({
      command: "setCanvas",
      seed: this.#seed,
      width_in_squares: this.#width_in_squares,
      height_in_squares: this.#height_in_squares,
      client_width: this.clientWidth,
      client_height: this.clientHeight
    });
    return true
  }

  ChangePath(newPath) {
    this.#mediaWorker.terminate()
    this._shadowRoot.removeChild(this.canvas)
    this.setAttribute("src", newPath)
    this.#Init()
  }

  StartRecording() {
    if (this.playReady == false || this.recording == true) { return false }

    this.recording = true
    this.chunks = []

    var canvas_stream = this.canvas.captureStream(30); // fps
    this.canvas.style.outline = '1rem solid red';

    // Create media recorder from canvas stream
    this.media_recorder = new MediaRecorder(canvas_stream, { mimeType: "video/webm; codecs=vp9" });
    // Record data in chunks array when data is available
    this.media_recorder.ondataavailable = (evt) => {
      if (!this.recording) return; // Only create download link if recording is still in progress
      const blob = new Blob([evt.data], { type: 'video/webm' });
      this.chunks.push(blob);
    };

    // Start recording using a 1s timeslice [ie data is made available every 1s)
    this.media_recorder.start(1000);
  }

  StopRecording() {
    if (this.recording == false) { return false }

    this.recording = false
    this.media_recorder.stop();
    this.canvas.style.outline = ""
    const full_blob = new Blob(this.chunks, { type: 'video/webm' });
    this.url = window.URL.createObjectURL(full_blob);
    this.a.href = this.url;
    this.a.download = 'canvas.webm';
    this.a.click();

    window.URL.revokeObjectURL(this.url);
  }

}

customElements.define("video-shuffeler", videoShuffeler);
