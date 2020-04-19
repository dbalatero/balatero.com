const pluginSass = require("eleventy-plugin-sass");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets/images");

  eleventyConfig.addPlugin(pluginSass);

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_layouts",
    }
  };
};
