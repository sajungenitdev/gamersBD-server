const r = require('express').Router()
const c = require('../controllers/auth.controller')
r.post('/register',c.register)
r.post('/login',c.login)
module.exports = r
