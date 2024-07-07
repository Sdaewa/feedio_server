// Public Function to Calculate NPS
const calculateNetPromoterScore = async (inputScores) => {
  try {
    validateInputScores(inputScores);
    const data = calculatePercentages(inputScores);
    return data;
  } catch (error) {
    throw new Error(error);
  }
};

// Validate All Input Scores
const validateInputScores = (inputScores) => {
  inputScores.forEach((score) => validateInputScore(score));
};

// Validate a Single Input Score
const validateInputScore = (score) => {
  if (typeof score !== "number") {
    throw new Error("Score must be a number");
  }
  if (score < 0 || score > 10) {
    throw new Error("Score is out of NPS range");
  }
};

// Classify Input Scores and Calculate Percentages
const calculatePercentages = (inputScores) => {
  const data = {
    detractors: 0,
    passives: 0,
    promoters: 0,
    detractorsPercentage: null,
    passivesPercentage: null,
    promotersPercentage: null,
    summary: null,
    score: "loading",
  };

  inputScores.forEach((score) => {
    if (score <= 6) {
      data.detractors += 1;
    } else if (score === 7 || score === 8) {
      data.passives += 1;
    } else if (score >= 9) {
      data.promoters += 1;
    }
  });

  const lengthTotal = inputScores.length;
  data.detractorsPercentage = data.detractors / lengthTotal;
  data.passivesPercentage = data.passives / lengthTotal;
  data.promotersPercentage = data.promoters / lengthTotal;

  return calculateNPS(data);
};

// Calculate the NPS Score
const calculateNPS = (data) => {
  const rawNPS = data.promotersPercentage - data.detractorsPercentage;
  data.score = Math.round(rawNPS * 100);
  data.summary = determineSummary(data.score);
  return data;
};

// Determine Summary Based on NPS Score
const determineSummary = (score) => {
  if (score === -100) {
    return "broken";
  } else if (score >= -99 && score <= -1) {
    return "bad";
  } else if (score === 0) {
    return "neutral";
  } else if (score >= 1 && score <= 50) {
    return "good";
  } else if (score >= 51 && score <= 70) {
    return "excellent";
  } else if (score >= 71 && score <= 99) {
    return "world class";
  } else if (score === 100) {
    return "perfect";
  }
};

module.exports = { calculateNetPromoterScore };
