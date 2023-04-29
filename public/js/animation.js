let animate = [...document.querySelectorAll(".animate-left"), ...document.querySelectorAll(".animate-right")];


function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
    (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <=
    (window.innerWidth || document.documentElement.clientWidth)
  );
}
function animateOnLoad() {
  animate.forEach((el) => {
    if (isElementInViewport(el)) {
      el.classList.add("active");
    }
  });
}

function animateOnScroll() {
  animate.forEach((el) => {
    if (isElementInViewport(el)) {
      el.classList.add("active");
    }
  });
}

window.addEventListener("scroll", animateOnScroll);
window.addEventListener("load", animateOnLoad);