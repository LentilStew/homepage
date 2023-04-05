//settings
var off = "#060a1a"
var on = "white"
var width = 40;
var height = 20;
var end = false;






var speed = document.getElementById('speed-bar');
speed.addEventListener("change", (e) => { waitms = 1000 / speed.value })

var waitms = 1000 / speed.value;

//game
document.getElementById("randomize").addEventListener("click", () => {
    randomize()
    draw_game()
})


document.getElementById("clear").addEventListener("click", () => {
    clear()
    draw_game()
})

const game_of_life_art = document.getElementById("game_of_life").parentElement

const observer = new MutationObserver(function (mutations) {
    for (let mutation of mutations) {
        if (!mutation.attributeName === 'data-status')
            if (mutation.target.getAttribute('data-status') == 'active') { break }

        interval = speed.max
        break
    };
});
observer.observe(game_of_life_art, { attributes: true })



for (var i = 0; i < height; i++) {
    var row = document.createElement("tr");
    for (var j = 0; j < width; j++) {
        var cell = document.createElement("td");
        cell.style.backgroundColor = off;
        cell.className = "cell"

        cell.id = i + "_" + j;
        row.appendChild(cell);
    }
    document.getElementById("game_of_life").appendChild(row);
}

document.querySelectorAll(".cell").forEach(item => {
    item.addEventListener("click", event => {

        var id = item.id.split("_");
        var x = parseInt(id[0]);
        var y = parseInt(id[1]);
        if (game[x][y] == 0) {
            game[x][y] = 1;
        } else {
            game[x][y] = 0;
        }
        draw_game()

    })
})

var game = new Array(height);
for (var i = 0; i < height; i++) {
    game[i] = new Array(width);
    for (var j = 0; j < width; j++) {
        game[i][j] = 0;
    }
}
var game_copy = new Array(height);
for (var i = 0; i < height; i++) {
    game_copy[i] = new Array(width);
    for (var j = 0; j < width; j++) {
        game_copy[i][j] = 0;
    }
}

var draw_game = function () {
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            if (game[i][j] == 1) {
                document.getElementById(i + "_" + j).style.backgroundColor = on;
            } else {
                document.getElementById(i + "_" + j).style.backgroundColor = off;
            }
        }
    }
}

var game_of_life = function (neighbors, on) {
    if (on) {
        if (neighbors < 2) {
            return 0;
        } else if (neighbors == 2 || neighbors == 3) {
            return 1;
        }
        else {
            return 0;
        }
    }
    else {
        if (neighbors == 3) {
            return 1;
        }
        else {
            return 0;
        }
    }
}

fps = 0;
//every second restart fps
setInterval(() => {
    //document.getElementById("fps").innerHTML = fps;
    fps = 0;
}, 1000);

var run = function () {

    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            var neighbors = 0;
            if (i > 0 && j > 0 && game[i - 1][j - 1] == 1) {
                neighbors++;
            }
            if (i > 0 && game[i - 1][j] == 1) {
                neighbors++;
            }
            if (i > 0 && j < width - 1 && game[i - 1][j + 1] == 1) {
                neighbors++;
            }
            if (j > 0 && game[i][j - 1] == 1) {
                neighbors++;
            }
            if (j < width - 1 && game[i][j + 1] == 1) {
                neighbors++;
            }
            if (i < height - 1 && j > 0 && game[i + 1][j - 1] == 1) {
                neighbors++;
            }
            if (i < height - 1 && game[i + 1][j] == 1) {
                neighbors++;
            }
            if (i < height - 1 && j < width - 1 && game[i + 1][j + 1] == 1) {
                neighbors++;
            }

            game_copy[i][j] = game_of_life(neighbors, game[i][j]);

        }
    }
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            game[i][j] = game_copy[i][j];
            if (game[i][j] == 1) {
                document.getElementById(i + "_" + j).style.backgroundColor = on;
            } else {
                document.getElementById(i + "_" + j).style.backgroundColor = off;
            }
        }
    }

}

let lastFrameTS = 0;

function main_loop() {
    const elapsed = performance.now() - lastFrameTS;
    
    if (elapsed > waitms) {
        lastFrameTS = performance.now();
        run();
    }

    if (end) { return }

    requestAnimationFrame(main_loop);
}



toggle_button = () => {
    if (document.getElementById("stop").status == "on") {
        document.getElementById("stop").innerHTML = '<i class="fa-solid fa-play"></i>';
        document.getElementById("stop").status = "off"
        end = true;
    } else {
        document.getElementById("stop").innerHTML = '<i class="fa-solid fa-pause"></i>';
        document.getElementById("stop").status = "on"
        end = false;

        startTime = performance.now();
        main_loop();
    }
}

toggle_button()
document.getElementById("stop").addEventListener("click", toggle_button);

function randomize() {
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            game[i][j] = Math.round(Math.random());
        }
    }
}

function clear() {
    for (var i = 0; i < height; i++) {
        for (var j = 0; j < width; j++) {
            game[i][j] = 0;
        }
    }
}
//draw a glider gun

game[5][1] = 1;
game[5][2] = 1;
game[6][1] = 1;
game[6][2] = 1;
game[5][11] = 1;
game[6][11] = 1;
game[7][11] = 1;
game[4][12] = 1;
game[8][12] = 1;
game[3][13] = 1;
game[9][13] = 1;
game[3][14] = 1;
game[9][14] = 1;
game[6][15] = 1;
game[4][16] = 1;
game[8][16] = 1;
game[5][17] = 1;
game[6][17] = 1;
game[7][17] = 1;
game[6][18] = 1;
game[3][21] = 1;
game[4][21] = 1;
game[5][21] = 1;
game[3][22] = 1;
game[4][22] = 1;
game[5][22] = 1;
game[2][23] = 1;
game[6][23] = 1;
game[1][25] = 1;
game[2][25] = 1;
game[6][25] = 1;
game[7][25] = 1;
game[3][35] = 1;
game[3][36] = 1;
game[4][35] = 1;
game[4][36] = 1;

//randomize()
draw_game()

main_loop()