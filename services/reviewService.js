const mongoose = require("mongoose");
const path = require("path");
const { LanguageServiceClient } = require("@google-cloud/language");
const natural = require("natural");
const User = require("../models/user");
const { Review } = require("../models/review");
const Product = require("../models/Product");
const { calculateNetPromoterScore } = require("../utils/nps");
const stopWords = require("../utils/stopWords");
const { sendEmail, sendAdminNotificationEmail } = require("../utils/email");

const tokenizer = new natural.WordTokenizer();

const client = new LanguageServiceClient({
  keyFilename: path.join(__dirname, "../google-services.json"),
});

async function analyzeReviewContent(feedback) {
  if (feedback.split(/\s+/).length < 3) {
    return {
      overallSentiment: { score: 0, magnitude: 0 },
      sentenceSentiments: [],
      entitySentiments: [],
      categories: [],
    };
  }

  const document = { content: feedback, type: "PLAIN_TEXT" };

  const [sentimentResult] = await client.analyzeSentiment({ document });
  const [entityResult] = await client.analyzeEntitySentiment({ document });
  const [classificationResult] = await client.classifyText({ document });

  return {
    overallSentiment: {
      score: sentimentResult.documentSentiment.score,
      magnitude: sentimentResult.documentSentiment.magnitude,
    },
    sentenceSentiments: sentimentResult.sentences.map((sentence) => ({
      text: sentence.text.content,
      sentiment: sentence.sentiment.score,
      magnitude: sentence.sentiment.magnitude,
    })),
    entitySentiments: entityResult.entities.map((entity) => ({
      name: entity.name,
      type: entity.type,
      salience: entity.salience,
      sentiment: entity.sentiment.score,
      magnitude: entity.sentiment.magnitude,
    })),
    categories: classificationResult.categories.map((category) => ({
      name: category.name,
      confidence: category.confidence,
    })),
  };
}

const recalculateAndUpdateNps = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const npsScores = reviews.map((review) => review.npsScore);

  const npsData = await calculateNetPromoterScore(npsScores);

  await Product.findByIdAndUpdate(productId, {
    npsData: {
      npsScore: npsData.score,
      promotersCount: npsData.promoters,
      passivesCount: npsData.passives,
      detractorsCount: npsData.detractors,
      detractorsPercentage: npsData.detractorsPercentage,
      passivesPercentage: npsData.passivesPercentage,
      promotersPercentage: npsData.promotersPercentage,
      summary: npsData.summary,
    },
  });
};

const recalculateAndUpdateRatingDistribution = async (productId) => {
  const reviews = await Review.find({ product: productId });

  let ratingDistribution = {
    oneStar: 0,
    twoStar: 0,
    threeStar: 0,
    fourStar: 0,
    fiveStar: 0,
  };

  const ratingMap = {
    1: "oneStar",
    2: "twoStar",
    3: "threeStar",
    4: "fourStar",
    5: "fiveStar",
  };

  reviews.forEach((review) => {
    const ratingKey = ratingMap[review.rating];
    if (ratingKey) {
      ratingDistribution[ratingKey]++;
    }
  });

  await Product.findByIdAndUpdate(productId, {
    ratingDistribution: ratingDistribution,
  });
};

const create = async ({
  name,
  email,
  feedback,
  rating,
  productId,
  npsScore,
}) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const user = await User.findById(product.user);
  if (!user) {
    throw new Error("User not found");
  }

  const analysisResult = await analyzeReviewContent(feedback);
  const tokens = tokenizer.tokenize(feedback);

  let parsedEntitySentiments = analysisResult.entitySentiments;
  if (typeof parsedEntitySentiments === "string") {
    try {
      parsedEntitySentiments = JSON.parse(parsedEntitySentiments);
    } catch (error) {
      console.error("Error parsing entitySentiments:", error);
      parsedEntitySentiments = [];
    }
  }

  const newReview = new Review({
    name,
    feedback,
    email,
    rating,
    npsScore: npsScore,
    product: productId,
    overallSentiment: analysisResult.overallSentiment,
    sentenceSentiments: analysisResult.sentenceSentiments,
    entitySentiments: parsedEntitySentiments,
    categories: analysisResult.categories,
    tokens: tokens,
  });

  await newReview.save();

  product.reviews.push(newReview._id);
  await recalculateAndUpdateNps(productId);
  await recalculateAndUpdateRatingDistribution(productId);
  await product.save();

  if (user.notifyReview) {
    sendAdminNotificationEmail({
      name: name,
      email: email,
      feedback: feedback,
      rating: rating,
      productName: product.name,
      npsScore: npsScore,
      userEmail: user.email,
    });
  }

  return newReview;
};

const widgetReview = async ({
  name,
  email,
  feedback,
  rating,
  productId,
  npsScore,
}) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const user = await User.findById(product.user);
  if (!user) {
    throw new Error("User not found");
  }

  const analysisResult = await analyzeReviewContent(feedback);
  const tokens = tokenizer.tokenize(feedback);

  const newReview = new Review({
    name,
    feedback,
    email,
    rating,
    npsScore: npsScore,
    product: productId,
    overallSentiment: analysisResult.overallSentiment,
    sentenceSentiments: analysisResult.sentenceSentiments,
    entitySentiments: analysisResult.entitySentiments,
    categories: analysisResult.categories,
    tokens: tokens,
  });

  await newReview.save();

  product.reviews.push(newReview._id);
  await recalculateAndUpdateNps(productId);
  await recalculateAndUpdateRatingDistribution(productId);
  await product.save();

  sendEmail({
    to: user.email,
    subject: "New Review Added from Widget",
    html: `<h1>New Review for ${product.name} from Widget</h1>
           <p>${name} has added a review for ${product.name} using the widget.</p>
           <p>Rating: ${rating}</p>
           <p>Review: ${feedback}</p>`,
  });

  return newReview;
};

const getAll = async (productId, status = null) => {
  const product = await Product.findById(productId).populate("reviews");
  if (!product) {
    throw new Error("Product not found");
  }

  if (status !== null) {
    return product.reviews.filter((review) => review.status === status);
  }

  return product.reviews;
};

const deleteOne = async (reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new Error("Review not found");
  }

  const product = await Product.findById(review.product);
  if (!product) {
    throw new Error("Product not found");
  }

  const index = product.reviews.indexOf(reviewId);
  if (index > -1) {
    product.reviews.splice(index, 1);
  }

  await product.save();

  await recalculateAndUpdateNps(product._id);
  await recalculateAndUpdateRatingDistribution(product._id);
  await Review.deleteOne({ _id: reviewId });

  return "Review deleted successfully";
};

const updateFavoriteStatus = async (reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new Error("Review not found");
  }

  review.status = review.status === "fav" ? "unfav" : "fav";
  await review.save();

  return {
    message: `Review status updated to ${review.status}`,
    review,
  };
};

const generateWordFrequencies = async (productId) => {
  let wordCounts = {};
  const minWordLength = 3;
  const maxWordLength = 20;

  const reviews = await Review.find({ product: productId });

  for (const review of reviews) {
    if (Array.isArray(review.tokens) && review.tokens.length > 0) {
      for (const token of review.tokens) {
        const lowerToken = token.toLowerCase().trim();
        if (
          !stopWords.includes(lowerToken) &&
          lowerToken.length >= minWordLength &&
          lowerToken.length <= maxWordLength &&
          !/^\d+$/.test(lowerToken)
        ) {
          wordCounts[lowerToken] = (wordCounts[lowerToken] || 0) + 1;
        }
      }
    }
  }

  const wordFrequencies = Object.entries(wordCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50); // Top 50 words

  return wordFrequencies;
};

const getWordCloudData = async (productId) => {
  try {
    return await generateWordFrequencies(productId);
  } catch (err) {
    throw new Error("Error generating word cloud data: " + err.message);
  }
};

const getMatchStage = (productId, start, end) => ({
  $match: {
    product: new mongoose.Types.ObjectId(productId),
    createdAt: {
      $gte: start,
      $lte: end,
    },
  },
});

const getAddFieldsStage = (offsetHours) => ({
  $addFields: {
    localCreatedAt: {
      $subtract: ["$createdAt", offsetHours * 60 * 60 * 1000],
    },
  },
});

const getGroupStage = (groupBy) => ({
  $group: {
    _id: {
      year: { $year: "$localCreatedAt" },
      month: { $month: "$localCreatedAt" },
      day: { $dayOfMonth: "$localCreatedAt" },
      [groupBy]: { [`$${groupBy}`]: "$localCreatedAt" },
    },
    averageRating: { $avg: "$rating" },
    highestRating: { $max: "$rating" },
    lowestRating: { $min: "$rating" },
    count: { $sum: 1 },
  },
});

const getSortStage = () => ({
  $sort: {
    "_id.year": 1,
    "_id.month": 1,
    "_id.day": 1,
  },
});

const getTrendsForPeriod = async (productId, start, end, groupBy) => {
  try {
    const timezoneOffset = new Date().getTimezoneOffset();
    const offsetHours = timezoneOffset / 60;

    const matchStage = getMatchStage(productId, start, end);
    const addFieldsStage = getAddFieldsStage(offsetHours);
    const groupStage = getGroupStage(groupBy);
    const sortStage = getSortStage();

    const trends = await Review.aggregate([
      matchStage,
      addFieldsStage,
      groupStage,
      sortStage,
    ]);

    return trends;
  } catch (err) {
    console.error("Error during aggregation: ", err.message);
    throw new Error("Unable to fetch ratings trend");
  }
};

const getRatingsTrend = async (productId, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  end.setHours(23, 59, 59, 999);

  const groupBy = "dayOfMonth";
  const trends = await getTrendsForPeriod(productId, start, end, groupBy);

  return fillGaps(trends, start, end);
};

const fillGaps = (trends, start, end) => {
  const filledTrends = [];
  let current = new Date(start);

  while (current <= end) {
    const trendForDay = trends.find((t) => t._id.day === current.getDate());
    if (trendForDay) {
      filledTrends.push(trendForDay);
    } else {
      filledTrends.push(createDefaultTrend(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return filledTrends;
};

const createDefaultTrend = (date) => {
  return {
    _id: {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    },
    averageRating: 0,
    highestRating: 0,
    lowestRating: 0,
    count: 0,
  };
};

module.exports = {
  create,
  widgetReview,
  getAll,
  deleteOne,
  getWordCloudData,
  getRatingsTrend,
  updateFavoriteStatus,
};
