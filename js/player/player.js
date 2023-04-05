
import { WebAudioController } from "/js/player/lib/web_audio_controller.js";

class videoShuffeler extends HTMLElement {
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

    // Create the anchor tag outside the ondataavailable event handler
    this.a = document.createElement('a');
    this.a.style.display = 'none';
    this._shadowRoot.appendChild(this.a)


    this.mediaWorker = null;
    this.audioController = null;
    this.initDone = null;
    this.mediaTimeUpdateInterval = null;
    this.audioController = null;
    this.width_in_squares = 1;
    this.height_in_squares = 1;

    this.handleScrollerChange = this.handleScrollerChange.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);
    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);

    this.seed = 0;
    this.sampleRate = null;
    this.channelCount = null;
    this.sharedArrayBuffer = null;
    this.playing = false
    this.playReady = false
    this.recording = false
    this.audioContextClosed = true
    this.init();
  }

  async waitForWorkerCommand(command) {
    let initResolver = null;
    let initDone = new Promise((resolver) => (initResolver = resolver));
    let res = null;

    this.mediaWorker.addEventListener("message", (e) => {
      console.assert(e.data.command == command);
      res = e.data;
      initResolver();
      initResolver = null;
    });

    await initDone;

    return res;
  }

  async init() {
    this.canvas = document.createElement("canvas");
    this._shadowRoot.appendChild(this.canvas);
    this.style.overflow = "hidden"

    this.playReady = false
    const src = this.getAttribute("src");
    const offscreenCanvas = this.canvas.transferControlToOffscreen();
    this.mediaWorker = new Worker(window.location.origin + "/js/player/player-media-worker.js");//TODO
    this.mediaWorker.postMessage(
      {
        command: "initialize",
        audioFile: src,
        videoFile: src,
        canvas: offscreenCanvas,
      },
      [offscreenCanvas]
    );

    let audioData = await this.waitForWorkerCommand("initialize-done");

    this.sampleRate = audioData.sampleRate;
    this.channelCount = audioData.channelCount;
    this.sharedArrayBuffer = audioData.sharedArrayBuffer;

    this.audioController = new WebAudioController();
    this.audioContextClosed = false;
    this.audioController.initialize(
      this.sampleRate,
      this.channelCount,
      this.sharedArrayBuffer
    );
    //create a canvas

    this.mediaWorker.postMessage({
      command: "setCanvas",
      seed: this.seed,
      width_in_squares: this.width_in_squares,
      height_in_squares: this.height_in_squares,
      client_width: this.clientWidth,
      client_height: this.clientHeight
    });


    this.playReady = true
    /*TODO
  const observer = new ResizeObserver(() => {
    handleScrollerChange(this.width_in_squares, this.height_in_squares)
  });

  observer.observe(this);
*/
  }

  play() {
    if (this.playReady == false || this.playing) { return false }

    console.log("playback start");

    // Audio can only start in reaction to a user-gesture.
    this.audioController
      .play()
      .then(() => console.log("playback started"));

    this.mediaWorker.postMessage({
      command: "play",
      mediaTimeSecs: this.audioController.getMediaTimeInSeconds(),
      mediaTimeCapturedAtHighResTimestamp:
        performance.now() + performance.timeOrigin,
    });

    this.sendMediaTimeUpdates(true);

    this.playing = true;
    return true
  }

  pause() {
    if (this.playReady == false || !this.playing) { return false }

    console.log("playback pause");
    // Resolves when audio has effectively stopped, this can take some time if
    // using bluetooth, for example.
    this.audioController.pause().then(() => {
      console.log("playback paused");
      // Wait to pause worker until context suspended to ensure we continue
      // filling audio buffer while audio is playing.
      this.mediaWorker.postMessage({ command: "pause" });
    });

    this.sendMediaTimeUpdates(false);

    this.playing = false;
    return true
  }

  handleScrollerChange(x, y) {
    console.log(this.playReady)
    if (this.playReady == false) { return false }

    console.log(this.clientWidth, this.clientHeight)

    this.width_in_squares = x;
    this.height_in_squares = y;
    this.mediaWorker.postMessage({
      command: "setCanvas",
      seed: this.seed,
      width_in_squares: x,
      height_in_squares: y,
      client_width: this.clientWidth,
      client_height: this.clientHeight
    });
    return true
  }

  handleVolumeChange(volume) {
    if (this.playReady == false) { return false }

    this.audioController.setVolume(volume);
    return true
  }

  handleSeedChange(seed) {
    if (this.playReady == false) { return false }
    this.seed = seed

    this.mediaWorker.postMessage({
      command: "setCanvas",
      seed: this.seed,
      width_in_squares: this.width_in_squares,
      height_in_squares: this.height_in_squares,
      client_width: this.clientWidth,
      client_height: this.clientHeight
    });
    return true
  }

  handlePathChange(newPath) {
    this.mediaWorker.terminate()
    console.log(this.audioController)
    if (this.audioContextClosed != true) { this.audioController.audioContext.close() }
    this.audioContextClosed = true;

    console.log(this.audioController)


    this._shadowRoot.removeChild(this.canvas)
    this.setAttribute("src", newPath)
    this.init()
  }

  record() {
    if (this.playReady == false || this.recording == true) { return false }



    this.recording = true
    this.chunks = []

    var canvas_stream = this.canvas.captureStream(30); // fps
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

  stopRecording() {
    if (this.recording == false) { return false }

    this.recording = false
    this.media_recorder.stop();

    const full_blob = new Blob(this.chunks, { type: 'video/webm' });
    this.url = window.URL.createObjectURL(full_blob);
    this.a.href = this.url;
    this.a.download = 'canvas.webm';
    this.a.click();

    window.URL.revokeObjectURL(this.url);
  }

  sendMediaTimeUpdates(enabled) {
    if (enabled) {
      // Helper function to periodically send the current media time to the media
      // worker. Ideally we would instead compute the media time on the worker thread,
      // but this requires WebAudio interfaces to be exposed on the WorkerGlobalScope.
      // See https://github.com/WebAudio/web-audio-api/issues/2423
      // Local testing shows this interval (1 second) is frequent enough that the
      // estimated media time between updates drifts by less than 20 msec. Lower
      // values didn't produce meaningfully lower drift and have the downside of
      // waking up the main thread more often. Higher values could make av sync
      // glitches more noticeable when changing the output device.
      const UPDATE_INTERVAL = 1000;
      this.mediaTimeUpdateInterval = setInterval(() => {
        this.mediaWorker.postMessage({
          command: "updateMediaTime",
          mediaTimeSecs: this.audioController.getMediaTimeInSeconds(),
          mediaTimeCapturedAtHighResTimestamp:
            performance.now() + performance.timeOrigin,
        });
      }, UPDATE_INTERVAL);
    } else {
      clearInterval(this.mediaTimeUpdateInterval);
      this.mediaTimeUpdateInterval = null;
    }
  }
}

customElements.define("video-shuffeler", videoShuffeler);
