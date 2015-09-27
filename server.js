'use strict'

const koa    = require('koa')
    , router = require('koa-route')
    , app    = koa()

let home = function * () {
  this.body = 'JS Belgrade Tracker'
}

app.use(router.get('/', home))

app.listen(process.env.PORT || 3000)
console.log('listening on port 3000')
