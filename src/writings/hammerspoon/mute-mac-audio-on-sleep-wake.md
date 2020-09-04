---
layout: article
excerpt: >
  Automatically mute your audio device when your Mac laptop wakes up from sleep.
date: 2020-09-04
title: Mute your Mac audio device on sleep/wake
tags:
  - writings
  - hammerspoon
---

One time opened my laptop in a cafe full of people and techno instantly started blasting out of my speakers. I guess I had Spotify running when I shut the lid. My MacBook decided to lock up right at that moment, and not let me login, so I just sat there for what seemed like hours making a scene, scrambling to unlock and mute my computer.

I now have an irrational fear of this happening to me again, so I made a little snippet to mute my speakers when my computer wakes from sleep.

You'll need to install [Hammerspoon](https://www.hammerspoon.org), either by downloading the app, or running `brew cask install hammerspoon`.

Add this to your Hammerspoon config:

<div data-prism-file="~/.hammerspoon/init.lua">

```lua
sleepWatcher = hs.caffeinate.watcher.new(function(state)
  if state == hs.caffeinate.watcher.systemDidWake then
    local device = hs.audiodevice.defaultOutputDevice()

    if device then
      device:setMuted(true)
      hs.alert.show("Muted " .. device:name())
    end
  end
end)

sleepWatcher:start()
```

</div>
