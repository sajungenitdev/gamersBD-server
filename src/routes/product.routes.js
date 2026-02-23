const r = require('express').Router()
const auth = require('../middleware/auth.middleware')
const c = require('../controllers/product.controller')
r.get('/',c.all)
r.post('/',auth,c.create)
module.exports = r
