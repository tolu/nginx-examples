
const express = require('express')

const es6Renderer = require('express-es6-template-engine')
const morganLogger = require('morgan')('dev')
const getDnsServers = require('dns').getServers
const expressVersion = require('./node_modules/express/package.json').version
const path = require('path')

// create app and get port from env
const app = express()
const PORT = process.env.PORT || 3000;

// setup logging to monitor access logs
app.use(morganLogger);

// use es6 template engine
app.engine('html', es6Renderer);
app.set('views', 'views');
app.set('view engine', 'html');

// use static files
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: 3600*1000 // 1h
}))

// respond to everything with some info
app.get('*', (req, res) => res.render('index', {
  locals: {
    requestInfo: JSON.stringify({
      version: `Node (${process.version}) / Express (${expressVersion})`,
      ['x-forwarded-for']: req.headers['x-forwarded-for'],
      remoteAddress : req.connection.remoteAddress,
      uri: req.url,
      headers: req.headers,
      dns: getDnsServers()
    }, null, 4),
    cssPath: 'style.css',
    jsPath: 'main.js'
  }
}))

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))