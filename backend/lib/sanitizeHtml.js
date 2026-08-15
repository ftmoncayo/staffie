const sanitizeHtml = require('sanitize-html')

const options = {
  allowedTags: ['p', 'strong', 'em', 'u', 'hr', 'br'],
  allowedAttributes: {},
}

function sanitize(html) {
  if (typeof html !== 'string') return null
  const cleaned = sanitizeHtml(html, options).trim()
  return cleaned ? cleaned : null
}

module.exports = { sanitize }
