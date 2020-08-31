const pluginSass = require("eleventy-plugin-sass");
const pluginSEO = require("eleventy-plugin-seo");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

function withTag(array, tag) {
  return array.filter(item => item.data.tags.includes(tag))
};

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets/images");

  eleventyConfig.addPlugin(pluginSass);
  eleventyConfig.addFilter('withTag', withTag);

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
