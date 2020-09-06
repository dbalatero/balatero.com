const pluginSass = require("eleventy-plugin-sass");
const pluginSEO = require("eleventy-plugin-seo");
const pluginTOC = require('eleventy-plugin-toc');
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');

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

function anchorSlug(string) {
  return String(string)
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

module.exports = function(eleventyConfig) {
  // Markdown
  const mdOptions = {
    html: true,
    breaks: false,
    linkify: true,
    typographer: true
  };

  const mdAnchorOpts = {
    permalink: true,
    permalinkClass: 'anchor-link',
    permalinkSymbol: '#',
    slugify: anchorSlug,
    level: [1, 2, 3, 4]
  };

  eleventyConfig.setLibrary(
    'md',
    markdownIt(mdOptions)
      .use(markdownItAnchor, mdAnchorOpts)
  )

  eleventyConfig.addPlugin(pluginTOC, {
    tags: ['h2', 'h3', 'h4'],
  });

  // Images
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
