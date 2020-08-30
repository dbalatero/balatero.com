---
layout: article
date: 2020-08-30
title: Sorting FZF results in Vim by proximity to current buffer
tags:
  - writings
  - vim
  - fzf
---

I work in a large monorepo, and I was pretty sick of typing my team's project
directory whenever I wanted to use FZF to search for and open another file.

Enter [proximity-sort](https://github.com/jonhoo/proximity-sort). This tool
will sort a list of files by the proximity to a given file.

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

It's not bad to use: you just pipe a list of files into it, and give it a
target file to bias search results around. Something like:

```
$ rg --files | proximity-sort lib/project/current/file.rb
```

and `proximity-sort` will reorder the search results based on distance to
`lib/project/current`. Give it a try manually in your shell first so you can
understand how the output changes as a result.

# Configuring vim

You can add a function to give FZF the file list. When you're in the root
directory, it will just use `rg --files`. When you're in a buffer containing a
file in a sub-directory, it will use that sub-directory to proximity sort.

```vim
function! g:FzfFilesSource()
  let l:base = fnamemodify(expand('%'), ':h:.:S')
  let l:proximity_sort_path = $HOME . '/.cargo/bin/proximity-sort'

  if base == '.'
    return 'rg --files'
  else
    return printf('rg --files | %s %s', l:proximity_sort_path, expand('%'))
  endif
endfunction
```

The final thing you have to do is update your FZF shortcut to use the function.
Mine looks like this:

```vim
" ctrl p brings up the file finder
noremap <C-p> :call fzf#vim#files('', { 'source': g:FzfFilesSource(),
      \ 'options': '--tiebreak=index'})<CR>
```

Reload your Vim config and try it out!
