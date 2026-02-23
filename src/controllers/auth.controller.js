const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

exports.register = async(req,res)=>{
  const {name,email,password} = req.body
  const hash = await bcrypt.hash(password,10)
  res.json(await User.create({name,email,password:hash}))
}

exports.login = async(req,res)=>{
  const {email,password} = req.body
  const user = await User.findOne({email})
  if(!user) return res.status(404).json({message:'User not found'})
  if(!await bcrypt.compare(password,user.password))
    return res.status(401).json({message:'Invalid password'})

  const token = jwt.sign({id:user._id,role:user.role},
    process.env.JWT_SECRET,{expiresIn:'7d'})
  res.json({token,user})
}
