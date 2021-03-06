module.exports = function (closeSectionTag = true, customContent = '') {
  return `
    ${closeSectionTag ? '</section>' : ''}
    <footer id='trivia'>
      <p>Made with ♥ by <a href='https://small-tech.org'>Small Technology Foundation</a></p>

      <p><strong>Like this? <a href='https://small-tech.org/fund-us'>Fund us!</a></strong></p>

      <p><a href='/privacy'>Our privacy policy</a> is that we exist to protect your privacy.</a></p>

      <p class='trivia'>Not that there’s anything wrong with it but this site doesn’t use any client-side JavaScript. What about the form validation? It’s just <a href='https://github.com/small-tech/web0/blob/main/.dynamic/index-template.html#L9-L74'>semantic HTML</a> and <a href='https://github.com/small-tech/web0/blob/main/styles.css#L87-L131'>CSS transitions</a>. What about the animated progress update when you sign the manifesto? It’s <a href='https://github.com/small-tech/web0/blob/main/.dynamic/.post/sign.js#L181-L201'>controlled from the server</a> by <a href='https://github.com/small-tech/web0/blob/main/.dynamic/.post/sign.js#L6-L46'>streaming HTML and CSS to the client.</a></p>

      <p><a href='https://github.com/small-tech/web0'>View Source</a></p>
    </footer>
    ${customContent}
    </body>
  </html>
  `
}
