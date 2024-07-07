document.addEventListener("DOMContentLoaded", function () {
  const widgetElement = document.querySelector(".widget.masonry_scroll");

  if (widgetElement) {
    const scrollSpeed = parseFloat(widgetElement.dataset.scrollSpeed) || 0.5;
    let scrollDuration;

    switch (scrollSpeed) {
      case 0.5:
        scrollDuration = 220;
        break;
      case 1:
        scrollDuration = 180;
        break;
      default:
        scrollDuration = 180;
    }

    widgetElement.style.animationDuration = `${scrollDuration}s`;
    widgetElement.style.animationTimingFunction = "linear";
    widgetElement.style.animationName = "scrollUp";
    widgetElement.style.animationIterationCount = "infinite";
  }
});
