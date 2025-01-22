const { validationResult } = require("express-validator");

const productService = require("../services/productService");

exports.createProduct = async (req, res) => {
  const { name, imageUrl, header, content, questions, rating } = req.body;
  const userId = req.userData.userId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const newProduct = await productService.create({
      name,
      imageUrl,
      header,
      content,
      questions,
      rating,
      userId,
    });
    res
      .status(201)
      .json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  const userId = req.query.userId || req.userData.userId;
  try {
    const products = await productService.getAll(userId);
    res.status(200).json({ products });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.getProductById = async (req, res) => {

  const { productId } = req.params;
  try {
    const product = await productService.getById(productId);

    res.status(200).json({ product });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  const { pid } = req.params;
  const { name, imageUrl, header, content, questions } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const product = await productService.update({
      productId: pid,
      name,
      imageUrl,
      header,
      content,
      questions,
    });
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const { pid } = req.params;
  const id = req.userData.userId;

  try {
    const message = await productService.deleteOne(pid, id);
    res.status(200).json({ message: message });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};
