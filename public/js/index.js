const files = document.querySelectorAll(".file")

const fileDescriptions = {
    "game-of-life.js": "A table that simulates Conway's Game of Life",
    "video-shuffler.js": "A video player that shuffles frames to avoid youtube's automated copyright system",
    "transcoder.c": "A C program that is capable of transcoding and filtering video files",
    "clips-manager.py": "A Python script that using a twitch community analisys creates youtube videos from clips",
    "DEFAULT": "Lets take a look at some of my projects",
};

files.forEach((file) => {
    file.addEventListener("mouseenter", (event) => setText(event.target))
    file.addEventListener("mouseleave", (event) => resetText(event.target));
})


function setText(file) {
    console.log(file)
    file.style.backgroundColor = "#060a1a"
    file.style.color = "white"
    console.log(file.innerHTML.trim())
    document.getElementById("project-description").innerHTML = fileDescriptions[file.innerHTML.trim()]
}
function resetText(file) {
    file.style.backgroundColor = ""
    file.style.color = "black"

    document.getElementById("project-description").innerHTML = fileDescriptions["DEFAULT"]
}

document.getElementById("project-description").innerHTML = fileDescriptions["DEFAULT"]
