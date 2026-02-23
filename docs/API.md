# GamersBD API Documentation

## Health
GET /api/health

## Auth
POST /api/auth/register
POST /api/auth/login

## Products
GET /api/products
POST /api/products (JWT required)

### Product Body
{
  "title": "PS5 Controller",
  "price": 6500,
  "category": "Gaming",
  "image": "base64 string"
}
