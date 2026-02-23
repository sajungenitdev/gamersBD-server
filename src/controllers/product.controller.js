const Product = require('../models/Product')

exports.create = async(req,res)=>{
  res.json(await Product.create({...req.body,createdBy:req.user.id}))
}

exports.all = async(req,res)=>{
  res.json(await Product.find())
}
