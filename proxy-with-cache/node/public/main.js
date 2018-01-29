console.info('hey there! /js')

const pTag = document.querySelector('p');

const extraInfo = ' (this part added by js ...)'.split('').reverse()

const handler = setInterval(() => {
  if(extraInfo.length) {
    pTag.textContent = pTag.textContent + extraInfo.pop()
  } else {
    clearInterval(handler)
  }
}, 150);
