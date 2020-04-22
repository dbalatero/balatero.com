---
layout: article
title: Sorting FZF results in Vim by proximity to current buffer
tags:
  - articles
  - til
  - vim
  - fzf
---

I work in a large monorepo, and I was pretty sick of typing my team's project
directory whenever I wanted to use FZF to search for and open another file.

Enter [proximity-sort](https://github.com/jonhoo/proximity-sort). This tool
will sort a list of files by the proximity to a given file.

It's pretty easy to use: you just pipe a list of files into it, and give it a
target file to search around. Something like:

```
$ rg --files "my search term" | proximity-sort lib/project/current/file.rb
```

and `proximity-sort` will reorder the search results based on distance to
`lib/project/current`.

# Installing

You'll need Rust if you don't have it:

```sh
brew install rustup
rustup-init -y
source $HOME/.cargo/env

# add Rust's cargo bin directory to your $PATH
echo '[ -f $HOME/.cargo/env ] && source $HOME/.cargo/env' > \
  ~/.bashrc  # or ~/.zshrc, etc
```

Once you have Rust on your system, you just need:

```sh
cargo install proximity-sort
```

# Configuring vim

kk
