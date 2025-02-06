const widgetService = require("../services/widgetService");

exports.generateWidget = async (req, res, next) => {
  const { 
    productId,
    userId,
    type,
    hideDate,
    backgroundColor,
    textColor,
    location
  } = req.body;

  if (!productId || !userId || !type) {
    return res.status(400).json({ 
      message: "Missing required fields: productId, userId, and type are required" 
    });
  }

  try {
    const widgetData = await widgetService.generateWidgetConfig(
      productId,
      0.5, // default scroll speed
      hideDate,
      type,
      backgroundColor,
      textColor,
      location
    );

    res.status(200).json({
      message: "Widget configuration saved successfully.",
      widgetData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving widget configuration.", error: error.message });
  }
};

exports.getWidgets = async (req, res) => {
  const { productId } = req.query;
  
  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

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

  try {
    const widgetConfig = await widgetService.getWidgetConfig(widgetId);

    if (!widgetConfig) {
      return res.status(404).json({
        message: "No widget configuration found for the specified widget.",
      });
    }

    const widgetRepresentation = await widgetService.generateWidgetRepresentation(
      widgetConfig.product,
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
