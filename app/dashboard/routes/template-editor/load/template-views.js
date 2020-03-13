var Template = require("template");
var helper = require("helper");
var arrayify = helper.arrayify;

module.exports = function(req, res, next) {
  Template.getAllViews(req.template.id, function(err, views, template) {
    if (err || !views || !template) return next(new Error("No template"));

    views = arrayify(views);

    views.forEach(function(view) {
      if (req.params.viewSlug && view.name === req.params.viewSlug)
        view.selected = "selected";
    });

    views = sort(views);
    res.locals.views = views;

    next();
  });
};

function sort(arr) {
  return arr.sort(function(a, b) {
    if (a.name < b.name) return -1;

    if (a.name > b.name) return 1;

    return 0;
  });
}
