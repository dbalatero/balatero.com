const pluginSass = require("eleventy-plugin-sass");
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

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_layouts",
    }
  };
};
