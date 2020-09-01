const pluginSass = require("eleventy-plugin-sass");
const pluginSEO = require("eleventy-plugin-seo");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

function withTag(array, tag) {
  return array.filter(item => item.data.tags.includes(tag))
};

function httpUrl(path) {
  return `https://balatero.com${path}`;
};

function valueIfEmpty(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return value;
};

function dateDisplay(date, format) {
  if (format === "toISOString") {
    return date.toISOString();
  }

  return date;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets/images");

  eleventyConfig.addFilter('dateDisplay', dateDisplay);
  eleventyConfig.addFilter('httpUrl', httpUrl);
  eleventyConfig.addFilter('valueIfEmpty', valueIfEmpty);
  eleventyConfig.addFilter('withTag', withTag);

  eleventyConfig.addPlugin(pluginSass);

  eleventyConfig.addPlugin(syntaxHighlight, {
    alwaysWrapLineHighlights: false,
  });

  eleventyConfig.addPlugin(pluginSEO, {
    title: "David Balatero",
    author: "David Balatero",
    url: "https://balatero.com",
    twitter: "dbalatero",
    options: {
      titleDivider: "|",
    },
  });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_layouts",
    }
  };
};
