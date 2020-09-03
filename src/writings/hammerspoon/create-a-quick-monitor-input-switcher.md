---
layout: article
excerpt: >
  Create a system hotkey on your Mac to quickly switch between your monitor's
  input sources using Hammerspoon and the open-source ddcctl program.
date: 2020-09-01
title: Create a quick monitor input switcher with Hammerspoon
tags:
  - writings
  - hammerspoon
---

I have a Dell 3419UW monitor, with my work Macbook plugged into the USB-C input, and my personal desktop Mac plugged into DisplayPort 1. Until now, I've been manually switching between computers dozens of times a day by menu diving on the actual monitor.

I'm glad that's all over. I'll show you how to set up a single hot key with Hammerspoon to seamlessly switch between computers.

## Install ddcctl on both computers

ddcctl is a simple command line program that lets you talk to your monitor using the [Display Data Channel](https://en.wikipedia.org/wiki/Display_Data_Channel) protocol. Among other things, it lets you switch inputs!

First, clone ddcctl. I've chosen to clone it at `~/.ddcctl`:

```bash
$ git clone https://github.com/kfix/ddcctl.git ~/.ddcctl
```

Use `system_profiler` to figure out what graphics card you are using. Note whether you're using an `amd`, `nvidia`, or `intel` card.

```bash
$ system_profiler SPDisplaysDataType

Graphics/Displays:

    Intel UHD Graphics 630:

      Chipset Model: Intel UHD Graphics 630
      Type: GPU
      Bus: Built-In
      VRAM (Dynamic, Max): 1536 MB
      Vendor: Intel
      Device ID: 0x3e92
      Revision ID: 0x0002
      Metal: Supported, feature set macOS GPUFamily2 v1

    Radeon RX 590:

      Chipset Model: Radeon RX 590
      Type: GPU
      Bus: PCIe
      PCIe Lane Width: x8
      VRAM (Total): 8 GB
      Vendor: AMD (0x1002)
      Device ID: 0x67df
      Revision ID: 0x00e1
      Metal: Supported, feature set macOS GPUFamily2 v1
      Displays:
        DELL U3419W:
          Resolution: 3440 x 1440 (UWQHD - Ultra-Wide Quad HD)
          UI Looks like: 3440 x 1440 @ 60 Hz
          Framebuffer Depth: 30-Bit Color (ARGB2101010)
          Display Serial Number: 75066T2
          Main Display: Yes
          Mirror: Off
          Online: Yes
          Rotation: Supported
          Automatically Adjust Brightness: No
          Connection Type: DisplayPort
```

As you can see from the output above, I have both Intel and AMD (Radeon) cards, but I have my computer set to always use the Radeon no matter what.

Finally, compile `ddcctl`:

```bash
$ cd ~/.ddcctl

# If you have an intel card
$ make intel

# If you have an AMD (Radeon) card
$ make amd

# If you have an Nvidia card
$ make nvidia
```

You should now have a compiled binary. Check it real quick; you should see output like this:

```bash
$ ~/.ddcctl/ddcctl

D: NSScreen #724072469 (3440x1440 0°) 109.00 DPI
I: found 1 external display
2020-09-03 00:10:24.436 ddcctl[33078:42148351] Usage:
ddcctl  -d <1-..>  [display#]
        -w 100000  [delay usecs between settings]

----- Basic settings -----
        -b <1-..>  [brightness]
        -c <1-..>  [contrast]
        -rbc       [reset brightness and contrast]

----- Settings that don't always work -----
        -m <1|2>   [mute speaker OFF/ON]
        -v <1-254> [speaker volume]
        -i <1-18>  [select input source]
        -p <1|2-5> [power on | standby/off]
        -o         [read-only orientation]

----- Settings (testing) -----
        -rg <1-..>  [red gain]
        -gg <1-..>  [green gain]
        -bg <1-..>  [blue gain]
        -rrgb       [reset color]

----- Setting grammar -----
        -X ?       (query value of setting X)
        -X NN      (put setting X to NN)
        -X <NN>-   (decrease setting X by NN)
        -X <NN>+   (increase setting X by NN)
```

Repeat this process on your second computer.

## Figure out which input each computer is on

There is a [table of input sources](https://github.com/kfix/ddcctl#input-sources) on ddcctl's README. However, I found it to be incomplete–for example, my monitor's USB-C input source is not in the table.

Turns out you can just ask the monitor which input source is active using `ddcctl`, which will save some guess and check. Just use the `ddcctl -d 1 -i "?"` command on each of your computers.

When I ran it on my desktop, I got a `current` value of `15` (DisplayPort 1):

```bash
$ ~/.ddcctl/ddcctl -d 1 -i ?

D: NSScreen #724072469 (3440x1440 0°) 109.00 DPI
I: found 1 external display
I: polling display 1's EDID
I: got edid.serial: 75066T2
I: got edid.name: DELL U3419W
D: action: i: ?
D: querying VCP control: #96 =?
I: VCP control #96 (0x60) = current: 15, max: 18
```

When I ran it on my laptop, I got a `current` value of `27` (USB-C):

```bash
$ ~/.ddcctl/ddcctl -d 1 -i ?

D: NSScreen #724072469 (3440x1440 0°) 109.00 DPI
I: found 1 external display
I: polling display 1's EDID
I: got edid.serial: 75066T2
I: got edid.name: DELL U3419W
D: action: i: ?
D: querying VCP control: #96 =?
I: VCP control #96 (0x60) = current: 15, max: 18
```

## Create a Hammerspoon hotkey to switch the display

Now that you have the right input values for the monitor, it's fast to throw together a hotkey. My approach was to check the current computer's hostname to figure out which computer I want to switch to.

<div data-prism-file="~/.hammerspoon/init.lua">

```lua
-- i have a hyper key for global binds like this one, but you can use
-- whatever modifiers you like
local hyper = {'cmd', 'shift', 'alt', 'ctrl'}

hs.hotkey.bind(hyper, 'm', function()
  -- path to your `ddcctl` binary
  local binary = os.getenv("HOME") .. "/.ddcctl/ddcctl"

  -- figure out your hostname by running `hostname` from your shell
  local desktopHostname = "sorny"
  local desktopInput = 15
  local laptopInput = 27

  local inputNumber = nil

  if hs.host.localizedName() == desktopHostname then
    -- we're on the desktop, we want to switch to the laptop
    inputNumber = laptopInput
  else
    inputNumber = desktopInput
  end

  hs.execute(binary .. " -d 1 -i " .. inputNumber)
end)
```

</div>

Once you've added this snippet, reload your Hammerspoon config and give it a try!
