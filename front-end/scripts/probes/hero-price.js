// The hero price and the column it sits in. `getClientRects().length` is the wrap count: 1 is one
// line, which is the whole question the ladder is answering.
function () {
  var value = document.querySelector('[data-price-value]')
    || document.querySelector('main p, main div')
  var column = value && value.closest('div')
  return {
    fontSize: value && getComputedStyle(value).fontSize,
    lines: value ? value.getClientRects().length : null,
    valueScrollWidth: value ? value.scrollWidth : null,
    columnClientWidth: column ? column.clientWidth : null,
    text: value ? value.textContent.trim() : null
  }
}
