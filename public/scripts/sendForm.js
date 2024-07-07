function showFeedbackForm() {
  document.getElementById("feedbackModal").style.display = "block";
  document.getElementById("review-dialog").style.display = "block";
}

function hideFeedbackForm() {
  document.getElementById("feedbackModal").style.display = "none";
  document.getElementById("review-dialog").style.display = "none";
}

document
  .getElementById("feedback-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();
  });

document
  .getElementById("feedbackModal")
  .addEventListener("click", function (e) {
    if (e.target === e.currentTarget) {
      hideFeedbackForm();
    }
  });

document.getElementById("cancel-btn").addEventListener("click", function (e) {
  hideFeedbackForm();
});

document.getElementById("nps-score").addEventListener("input", function () {
  const npsScoreValue = document.getElementById("nps-score").value;
  document.getElementById("nps-score-value").textContent = npsScoreValue;
});

document.getElementById("submit-btn").addEventListener("click", function (e) {
  console.log(e);
  e.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const content = document.getElementById("review").value;
  const rating = document.querySelector('input[name="rating"]:checked').value;
  const npsScore = document.getElementById("nps-score").value;

  const data = JSON.stringify({
    name,
    email,
    content,
    rating: parseFloat(rating),
    npsScore: parseInt(npsScore),
    productId,
  });

  fetch(
    `${process.env.SERVER_URL}/api/collection-feedback/createReviewForWidget`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data,
    }
  )
    .then((response) => {
      return response.text().then((text) => {
        if (!response.ok) {
          throw new Error(text || "Network response was not ok");
        }
        return JSON.parse(text);
      });
    })
    .then((data) => {
      hideFeedbackForm();
    })
    .catch((error) => {
      console.error(error);
    });
});

document.querySelectorAll(".star").forEach((star, index) => {
  star.addEventListener("mouseover", function () {
    highlightStars(index);
  });

  star.addEventListener("mouseout", function () {
    resetStars();
  });

  star.addEventListener("click", function () {
    setSelectedStar(index);
  });
});

function highlightStars(index) {
  document.querySelectorAll(".star label").forEach((label, idx) => {
    label.style.color = idx <= index ? "gold" : "#e0e0e0";
  });
}

function resetStars() {
  const checkedIndex = document.querySelector('input[name="rating"]:checked')
    ? parseInt(document.querySelector('input[name="rating"]:checked').value)
    : -1;
  document.querySelectorAll(".star label").forEach((label, idx) => {
    label.style.color = idx <= checkedIndex ? "gold" : "#e0e0e0";
  });
}

function setSelectedStar(index) {
  document.querySelectorAll('input[name="rating"]')[index].checked = true;
  highlightStars(index);
}
