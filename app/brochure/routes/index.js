var Express = require("express");
var brochure = new Express.Router();
var finder = require("finder");
var tex = require("./tools/tex");
var config = require("config");

var TITLES = {
  publishing: "How to use Blot",
  "public-files": "Public files",
  terms: "Terms of use",
  privacy: "Privacy policy",
  domain: "Use your domain",
};

// Minifies HTML
brochure.use(require("./tools/minify-html"));

// Inlines all CSS properties
brochure.use(require("./tools/inline-css"));

// Renders the folders and text editors
brochure.use(finder.middleware);

// Renders TeX
brochure.use(tex);

// Fixes basic typographic errors
// See typeset.js for more information
brochure.use(require("./tools/typeset"));

// Generate a table of contents for each page
brochure.use(require("./tools/on-this-page"));

// Retrieves the timestamp of the last commit
brochure.use(require("./tools/last-updated"));

brochure.use(function(req, res, next) {
  res.locals.base = "";
  res.locals.selected = {};
  var url = req.originalUrl;

  // Trim trailing slash from the URL before working out which
  // slugs to set as selected. This ensures that the following url
  // https://blot.im/how/ will set {{publishingIndex}} as selected
  if (url.length > 1 && url.slice(-1) === "/") url = url.slice(0, -1);

  var slugs = url.split("/");

  slugs.forEach(function(slug) {
    res.locals.selected[slug] = "selected";
  });

  res.locals.selected[slugs[slugs.length - 1] + "Index"] = "selected";

  // Handle index page of site.
  if (req.originalUrl === "/") res.locals.selected.index = "selected";

  let slug = slugs.pop() || "Blot";
  let title = TITLES[slug] || capitalize(slug);
  res.locals.title = title;

  next();
});

brochure.use("/account", function(req, res, next) {
  res.locals.layout = "/partials/layout-focussed.html";
  // we don't want search engines indexing these pages
  // since they're /logged-out, /disabled and
  res.set("X-Robots-Tag", "noindex");
  next();
});

brochure.get(["/terms", "/privacy"], function(req, res, next) {
  res.locals.layout = "/partials/layout-focussed.html";
  next();
});

brochure.use('/fonts', require('./fonts'));

brochure.get("/sitemap.xml", require("./sitemap"));

brochure.use("/developers", require("./developers"));

brochure.use("/notes", require("./notes"));

brochure.use("/templates", require("./templates"));

brochure.use("/news", require("./news"));

brochure.use("/sign-up", require("./sign-up"));

brochure.use("/log-in", require("./log-in"));

brochure.get("/", require("./featured"), function(req, res) {
  res.render("index", {
    title: "Blot – a blogging platform with no interface",
    layout: "partials/index-layout",
  });
});

brochure.use("/how/guides/domain", function(req, res, next) {
  res.locals.ip = config.ip;
  next();
});

brochure.use(function(req, res) {
  res.render(trimLeadingAndTrailingSlash(req.path));
});

brochure.use(function(err, req, res, next) {
  if (err && err.message && err.message.indexOf("Failed to lookup view") === 0)
    return next();

  next(err);
});

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

function trimLeadingAndTrailingSlash(str) {
  if (!str) return str;
  if (str[0] === "/") str = str.slice(1);
  if (str[str.length - 1] === "/") str = str.slice(0, -1);
  return str;
}

module.exports = brochure;
