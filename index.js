const http    = require('http')
const express = require('express')
const request = require('request')

var pkg       = require('./package.json')
var config    = require('./config.json')
var endpoints = require('./endpoints.json')

var app    = express()
var server = http.createServer(app)
var io     = require('socket.io').listen(server)

app.use(express.static('public'))

app.get('/',                 serve('/public/index.html'))
app.get('/jquery/jquery.js', serve('/node_modules/jquery/dist/jquery.js'))

io.sockets.on('connection', onSocketConnection)

server.listen(config.port || 9000, () => {
  console.log(`Listening on port ${config.port || 9000}`)
})

setInterval(sendData, 3000)

function serve(filename) {
  return function (req, res) {
    res.sendFile(__dirname + filename)
  }
}

function onSocketConnection(socket) {
  socket.on('disconnect', onSocketDisconnection)

  console.log('client connected')

  socket.emit('chat', {
    time:  new Date(),
    type:  'text',
    value: 'Hello, you got connected to ' + pkg.version
  })
}

function onSocketDisconnection() {
  console.log('client disconnected')
}

function sendData(socket) {
  checkEndpoints(endpoints)
    .then((result) => {
      io.sockets.emit('chat', {
        time:  new Date(),
        type:  'status',
        value: result
      })
    })
}

function checkEndpoints(endpoints) {
  return Promise.all(Object.keys(endpoints).map(checkSection(endpoints)))
    .then((result) => {
      return result.reduce((memo, pair) => {
        memo[pair.section] = pair.result

        return memo
      }, {})
    })
}

function checkSection(endpoints) {
  return (section) => {
    return Promise.all(endpoints[section].map(checkEndpoint))
      .then((result) => {
        return {
          section: section,
          result:  result
        }
      })
  }
}

function checkEndpoint(endpoint) {
  return new Promise(httpGet(endpoint))
    .catch(() => {
      return 400
    }).then((status) => {
      let result = JSON.parse(JSON.stringify(endpoint))

      result.statusCode = status

      return result
    })
}

function httpGet(endpoint) {
  return (resolve, reject) => {
    if (!endpoint || !endpoint.url) {
      return reject('Invalid endpoint or url!')
    } else {
      request
        .head(endpoint.url)
        .on('response', res => resolve(res.statusCode))
        .on('error', reject)
    }
  }
}
