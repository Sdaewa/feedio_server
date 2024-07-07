const widgetService = require("../services/widgetService");

exports.generateWidget = async (req, res, next) => {
  const productId = req.mainParams.pid;
  const type = req.body.type;
  const hideDate = req.body.date;
  const scrollSpeed = req.body.speed;
  const autoScroll = req.body.autoScroll;
  const background = req.body.background;
  const text = req.body.text;
  const embedLocation = req.body.location;

  try {
    const widgetData = await widgetService.generateWidgetConfig(
      productId,
      scrollSpeed,
      hideDate,
      type,
      autoScroll,
      background,
      text,
      embedLocation
    );

    res.status(200).json({
      message: "Widget configuration saved successfully.",
      widgetData,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error saving widget configuration.", error });
  }
};

exports.getWidgets = async (req, res) => {
  const productId = req.mainParams.pid;
  try {
    const widgets = await widgetService.getWidgets(productId);
    res.json(widgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWidget = async (req, res, next) => {
  const userId = req.mainParams.id;
  const productId = req.mainParams.pid;
  try {
    const widget = await widgetService.getWidgetConfig(userId, productId);

    if (!widget) {
      return res.status(404).json({
        message:
          "No widget configuration found for the specified user and product.",
      });
    }

    res.status(200).json({ widget });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error fetching widget configuration.", error });
  }
};

exports.serveWidget = async (req, res, next) => {
  const widgetId = req.params.wid;
  const productId = req.mainParams.pid;

  try {
    const widgetConfig = await widgetService.getWidgetConfig(
      widgetId,
      productId
    );

    if (!widgetConfig) {
      return res.status(404).json({
        message:
          "No widget configuration found for the specified widget and product.",
      });
    }

    const widgetRepresentation =
      await widgetService.generateWidgetRepresentation(
        productId,
        widgetConfig.scrollSpeed,
        widgetConfig.hideDate,
        widgetConfig.type,
        widgetConfig.autoScroll,
        widgetConfig.backgroundColor,
        widgetConfig.textColor
      );

    res.status(200).send(widgetRepresentation);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error serving the widget." });
  }
};

exports.deleteWidget = async (req, res) => {
  const widgetId = req.params.wid;
  try {
    await widgetService.deleteWidget(widgetId);
    res.status(200).json({ message: "Widget deleted successfully" });
  } catch (error) {
    console.error("Error deleting widget:", error);
    res.status(500).json({ message: "Error deleting widget", error });
  }
};
