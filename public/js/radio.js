let song = document.getElementById("song");
let ctrlIcon = document.querySelector("#ctrlIcon");

// Function to toggle play and pause
function playPause() {
    if (ctrlIcon.classList.contains("fa-pause")) {
        song.pause();
        ctrlIcon.classList.remove("fa-pause");
        ctrlIcon.classList.add("fa-play");
    } else {
        const uniqueUrl = `https://play.radioking.io/new-beginning-radio-1?nocache=${Date.now()}`;
        song.src = uniqueUrl; // Add cache-busting parameter
        song.play();
        ctrlIcon.classList.add("fa-pause");
        ctrlIcon.classList.remove("fa-play");
    }
}

// Function to fetch and update live song data - Michael code

function liveUpDate() {
    setInterval(function () {
        fetch("https://api.radioking.io/widget/radio/new-beginning-radio-1/track/current")
            .then((res) => res.json())
            .then((data) => {
                if (ctrlIcon.classList.contains("fa-pause")) {
                    document.querySelector("#title").innerHTML = data.title;
                    document.querySelector("#artist").innerHTML = data.artist;
                    document.querySelector(".song-img").setAttribute("src", data.cover);
                } else {
                    document
                        .querySelector(".song-img")
                        .setAttribute("src", "/assets/images/nbmlogo.webp");
                    document.querySelector("#title").innerHTML = "نام سرود";
                    document.querySelector("#artist").innerHTML = "نام خواننده یا گروه";
                }
            });
    }),
        500;
}

document.addEventListener("DOMContentLoaded", function () {
    liveUpDate();
});
