let articles = []

window.addEventListener('load', function () {
  setTimeout(function () {
    document.getElementById('loading-screen').style.display = 'none';
  }, 1000); // 3000 milliseconds = 3 seconds
});

let set_articles_status = () => {
  for (let article_index = 0; article_index < articles.length; article_index++) {


    if (article_index < current_article) {
      articles[article_index].setAttribute('data-status', 'left');
    }
    else if (article_index > current_article) {
      articles[article_index].setAttribute('data-status', 'right');
    }
    else {
      articles[article_index].setAttribute('data-status', 'active');
    }

    

  }

}

articles = document.querySelectorAll('#main article');
articles[0].querySelector('.left-arrow').style.display = "none";
articles[articles.length - 1].querySelector('.right-arrow').style.display = "none";

const project_name = window.location.hash.substring(1);

let current_article = Array.from(articles).findIndex(article => article.getAttribute('data-project-name') === project_name);
if (current_article === -1) { current_article = 0 }
console.log(current_article)

set_articles_status()

console.log(articles[0])
console.log(articles[1])



document.querySelectorAll('.arrow').forEach(arrow => {
  arrow.addEventListener("click", () => {

    if (arrow.classList.contains('left-arrow')) {
      console.log("right")
      articles[current_article].dataset.status = 'right'
      current_article -= 1
    }
    else {
      console.log("left")

      articles[current_article].dataset.status = 'left'
      current_article += 1
    }

    articles[current_article].dataset.status = 'active'
  })
})

