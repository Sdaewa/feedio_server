const mongoose = require("mongoose");

const Product = require("../models/Product");
const User = require("../models/user");
const { Review } = require("../models/review");

const create = async ({ name, header, content, questions, userId }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const newProduct = new Product({
    name,
    header,
    content,
    questions,
    user: userId,
  });
  await newProduct.save();

  user.products.push(newProduct);
  await user.save();

  return newProduct;
};

const getAll = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const products = await Product.find({ user: userId });

  if (!products) {
    throw new Error("No products found for this user");
  }

  return products;
};

const getById = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }
  return product;
};

const update = async ({
  productId,
  name,
  imageUrl,
  header,
  content,
  questions,
}) => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { name, imageUrl, header, content, questions },
    { new: true }
  );

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

const deleteOne = async (productId, userId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  await Review.deleteMany({ _id: { $in: product.reviews } });
  await Product.deleteOne({ _id: productId });
  await User.findByIdAndUpdate(
    userId,
    { $pull: { products: new mongoose.Types.ObjectId(productId) } },
    { new: true }
  );

  return "Product and associated reviews deleted successfully";
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  deleteOne,
};
