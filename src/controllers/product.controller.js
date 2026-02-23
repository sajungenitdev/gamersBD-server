// Product Controller
const getProducts = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Get all products',
    data: []
  });
};

const getProductById = (req, res) => {
  res.status(200).json({
    success: true,
    message: `Get product with ID: ${req.params.id}`,
    data: null
  });
};

const createProduct = (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: req.body
  });
};

const updateProduct = (req, res) => {
  res.status(200).json({
    success: true,
    message: `Product ${req.params.id} updated successfully`,
    data: req.body
  });
};

const deleteProduct = (req, res) => {
  res.status(200).json({
    success: true,
    message: `Product ${req.params.id} deleted successfully`
  });
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};