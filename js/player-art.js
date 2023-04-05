const player = document.getElementById("video-shuffeler-player")



const toggleButton = document.getElementById("stop-video")
toggleButton.addEventListener("click", () => {
    console.log(player.playing)


    if (player.playing) {
        if (!player.pause()) { return }
        toggleButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        toggleButton.status = "off"
        start = true;
    } else {

        if (!player.play()) { return }

        toggleButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
        toggleButton.status = "on"
        start = false;
    }
})

const volume = document.getElementById("volume-range")
volume.addEventListener("change", (e) => { player.handleVolumeChange(volume.value / 100) })

const xtriangle = document.getElementById("xtriangle")
const ytriangle = document.getElementById("ytriangle")

function handleScrollerChange() {
    const x = Math.ceil(xtriangle.value / 10);
    const y = Math.ceil(ytriangle.value / 10);

    console.log(x, y)
    player.handleScrollerChange(x, y)

}

xtriangle.addEventListener("change", handleScrollerChange)
ytriangle.addEventListener("change", handleScrollerChange)



const setSeed = document.getElementById("set-seed")
const setPath = document.getElementById("set-video-path")

const seed = document.getElementById("seed")
const path = document.getElementById("video-path")

setSeed.addEventListener("click", () => {
    player.handleSeedChange(seed.value)
})

setPath.addEventListener("click", () => {
    player.handlePathChange(path.value)
})





const video_shuffeler_art = document.getElementById("video-shuffeler-art")

const video_shuffeler_observer = new MutationObserver(function (mutations) {
    console.log(mutations)
    for (let mutation of mutations) {
        if (!mutation.attributeName === 'data-status')
            if (mutation.target.getAttribute('data-status') == 'active') { break }

        player.pause()
        toggleButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        toggleButton.status = "off"
        start = true;
        break
    };
});
video_shuffeler_observer.observe(video_shuffeler_art, { attributes: true })


const downloadButton = document.getElementById("film");

downloadButton.addEventListener("click", () => {
    if (player.recording) { player.stopRecording() }
    else { player.record() }

})