const player = document.getElementById("video-shuffeler-player")



const toggleButton = document.getElementById("stop-video")
toggleButton.addEventListener("click", () => {

    if (player.playing) {
        if (!player.Pause()) { return }
        toggleButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        toggleButton.status = "off"
        start = true;
    } else {

        if (!player.Play()) { return }

        toggleButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
        toggleButton.status = "on"
        start = false;
    }
})

const xtriangle = document.getElementById("xtriangle")
const ytriangle = document.getElementById("ytriangle")

function handleScrollerChange() {
    const x = Math.ceil(xtriangle.value / 10);
    const y = Math.ceil(ytriangle.value / 10);

    player.ChangeTriangles(x, y)

}

xtriangle.addEventListener("change", handleScrollerChange)
ytriangle.addEventListener("change", handleScrollerChange)



const setSeed = document.getElementById("seed-button")
const setPath = document.getElementById("dropdown-button-video-selector")
const reloadVideoButton = document.getElementById("reload-video")


const seed = document.getElementById("seed")
const path = document.getElementById("selected-video-title")

setSeed.addEventListener("click", () => {
    player.ChangeSeed(seed.value)
})

let curr_video_index = 0
inputs = [
    { name: "csgo clip before", path: "/videos/in.mp4" },
    { name: "csgo clip seed:s1mple", path: "/videos/csgo.mp4" },
]
setPath.addEventListener("click", () => {
    curr_video_index += 1
    curr_video = inputs[curr_video_index % inputs.length]
    path.textContent = curr_video.name
    player.ChangePath(curr_video.path)
})

reloadVideoButton.addEventListener("click", () => {
    curr_video = inputs[curr_video_index % inputs.length]
    path.textContent = curr_video.name
    player.ChangePath(curr_video.path)

})

const video_shuffeler_art = document.getElementById("video-shuffeler-art")

const video_shuffeler_observer = new MutationObserver(function (mutations) {
    for (let mutation of mutations) {
        if (!mutation.attributeName === 'data-status')
            if (mutation.target.getAttribute('data-status') == 'active') { break }

        player.Pause()
        toggleButton.innerHTML = '<i class="fa-solid fa-play"></i>';
        toggleButton.status = "off"
        start = true;
        break
    };
});

video_shuffeler_observer.observe(video_shuffeler_art, { attributes: true })


const downloadButton = document.getElementById("film");

downloadButton.addEventListener("click", () => {
    if (player.recording) { player.StopRecording() }
    else { player.StartRecording() }

})

