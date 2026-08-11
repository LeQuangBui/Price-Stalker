// The alert card's own overflow, plus the two things a width sweep cannot see: whether the controls
// row wrapped the toggle under the field, and whether the action row is one line or two.
//
// Handle: the cards are the only <section> elements the page renders after the conversion, so
// `section` survives the class-name deletion that `.alert-card` does not.
function () {
  var card = document.querySelector('section')
  if (!card) return { error: 'no card — is the fixture loaded and the reader signed in?' }
  var row = card.firstElementChild
  var input = card.querySelector('input[type=number]')
  var controls = input.closest('div').parentElement
  var toggle = card.querySelector('input[type=checkbox]').closest('label')
  var buttons = [].slice.call(card.querySelectorAll('button'))
  var top = function (el) { return Math.round(el.getBoundingClientRect().top) }
  return {
    cardScrollWidth: card.scrollWidth,
    cardClientWidth: card.clientWidth,
    overflow: card.scrollWidth - card.clientWidth,
    rowIsRow: getComputedStyle(row).flexDirection === 'row',
    inputWidth: Math.round(input.getBoundingClientRect().width * 100) / 100,
    toggleWrapped: top(toggle) > top(input),
    actionsOnOneLine: buttons.length < 2 || top(buttons[buttons.length - 1]) === top(buttons[0])
  }
}
