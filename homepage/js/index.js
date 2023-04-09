document.querySelectorAll(".italic_hover").forEach((element) => {
    text = element.textContent;
    element.innerHTML = ""
    for (var i = 0; i < text.length; i++) {
        element.innerHTML += "<div class=\"class3\">" + text[i] + "</div>"
    }
})