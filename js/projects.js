arrows = document.getElementsByClassName('arrow')
articles = document.getElementById('main').children

const check_last_arrow = (arrow) =>{
  let curr_index = parseInt(arrow.parentElement.parentElement.dataset.index);

  let next_index = arrow.id == "right-arrow" ? curr_index - 1 : curr_index + 1;
  if (next_index < 0 || next_index >= articles.length) {
    arrow.style.display = "none";
  }
}

for(arrow of arrows){
  check_last_arrow(arrow)
}

for (let arrow of arrows) {
  arrow.addEventListener('click', function () {


    let index = parseInt(arrow.parentElement.parentElement.dataset.index)

    if (arrow.id == "right-arrow" && !(index - 1 < 0) ) {
      let next_index = index - 1

      articles[index].dataset.status = 'left'
      articles[next_index].dataset.status = 'active'
    }
    else if (arrow.id == "left-arrow" && !(index + 1 == articles.length)) {

      let next_index = index + 1
      
      articles[index].dataset.status = 'right'
      articles[next_index].dataset.status = 'active'
    }
  })
}

