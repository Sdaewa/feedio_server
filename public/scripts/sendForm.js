document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("feedback-form");
  const stars = document.querySelectorAll(".star");
  const npsOptions = document.querySelectorAll(
    '.nps-option input[type="radio"]'
  );
  const feedbackTextarea = document.getElementById("feedback");
  const charCount = document.querySelector(".char-count");
  const submitBtn = document.querySelector(".submit-btn");

  stars.forEach((star) => {
    star.addEventListener("click", function () {
      const value = this.getAttribute("data-value");
      stars.forEach((s) => s.classList.remove("active"));
      for (let i = 0; i < value; i++) {
        stars[i].classList.add("active");
      }
    });
  });

  npsOptions.forEach((option) => {
    option.addEventListener("change", function () {
      npsOptions.forEach((opt) =>
        opt.nextElementSibling.classList.remove("active")
      );
      this.nextElementSibling.classList.add("active");
    });
  });

  feedbackTextarea.addEventListener("input", function () {
    const length = this.value.length;
    charCount.textContent = `${length}/100 characters`;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const feedback = feedbackTextarea.value;
    const rating = document.querySelectorAll(".star.active").length;
    const npsScore = document.querySelector(
      'input[name="npsScore"]:checked'
    )?.value;
    const productId = document.querySelector('input[name="productId"]').value;

    if (feedback.length < 100) {
      alert("Feedback must be at least 100 characters long.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Feedback";
      return;
    }

    const data = {
      name,
      email,
      feedback,
      rating,
      npsScore: parseInt(npsScore),
      productId,
    };

    fetch("/api/collection-feedback/create-review-for-widget", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => Promise.reject(text));
        }
        return response.json();
      })
      .then((data) => {
        alert("Thank you for your feedback!");
        form.reset();
        stars.forEach((s) => s.classList.remove("active"));
        npsOptions.forEach((opt) =>
          opt.nextElementSibling.classList.remove("active")
        );
        charCount.textContent = "0/100 characters";
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("There was an error submitting your feedback. Please try again.");
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Feedback";
      });
  });
});
