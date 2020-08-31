---
layout: article
excerpt: >
  Learn how to visually show what QMK layer is active by adding a floating
  indicator to MacOS, using Hammerspoon.
date: 2020-08-30
title: Add QMK visual layer indicator using Hammerspoon
tags:
  - writings
  - qmk
  - hammerspoon
---

I recently got a keyboard that supports QMK and have been experimenting with using [layers](https://beta.docs.qmk.fm/using-qmk/software-features/feature_layers).

I thought it would be nice to add a visual indicator to MacOS, so I can always see which QMK layer is active.

<figure>
  <img src="/assets/images/qmk-layer-screenshot.png" alt="Screenshot of visual layer indicator" />
  <figcaption>The active layer ("raise") is shown in the MacOS menu bar.</figcaption>
</figure>

To achieve this, you'll need two things setup:

* The QMK `keymap.c` file for your keyboard, so we can add to it
* [Hammerspoon](http://www.hammerspoon.org)
  * A config file at `~/.hammerspoon/init.lua` (it can be blank to start!)

The basic approach is:

1. When a layer is enabled, send an extra silent key to the operating system
1. Add a hotkey listener in Hammerspoon to intercept that silent key, and update the layer indicator

## Step 1: Send a key when the layer switches

The first step is to send a key from the QMK firmware to the operating system
when a layer is switched. Luckily, `F13` through `F20` are unused keys on MacOS, and you
can hack them for this purpose.

I have two layers on my keyboard:

1. My main `qwerty` layer
2. A `raise` layer that has the arrow keys, mouse keys, and some volume controls

I decided (arbitrarily) to send `F17` when the `raise` layer is enabled, and `F18` when the `qwerty` layer is enabled.

These are defined in `keymap.c` as:

<div data-prism-file="qmk_firmware/keyboards/your_kb/keymaps/your_map/keymap.c">

```c
#define _QWERTY 0
#define _RAISE 1
```

</div>

Start by creating a custom function that will toggle between the `qwerty` and `raise` layers:

<div data-prism-file="qmk_firmware/keyboards/your_kb/keymaps/your_map/keymap.c">

```c
void toggle_raise_layer(void);

void toggle_raise_layer() {
  if (IS_LAYER_ON(_RAISE)) {
    // turn off the layer
    layer_off(_RAISE);

    // send f18
    SEND_STRING(SS_TAP(X_F18));
  } else {
    // turn layer on
    layer_on(_RAISE);

    // send f17
    SEND_STRING(SS_TAP(X_F17));
  }
}
```

</div>

Create a custom keycode so you can toggle the layer on and off:

<div data-prism-file="qmk_firmware/keyboards/your_kb/keymaps/your_map/keymap.c">

```c
enum custom_keycodes {
  TOGGLE_RAISE = SAFE_RANGE
};

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
  switch (keycode) {
    case TOGGLE_RAISE:
      if (record->event.pressed) toggle_raise_layer();

      return false;

    default:
      // pass all other keypresses through
      return true;
  }
}
```

</div>

Finally, wire this keycode up to a real key in your `keymaps`:

<div data-prism-file="qmk_firmware/keyboards/your_kb/keymaps/your_map/keymap.c">

```c
// Your keymap looks different than mine!
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
  [_QWERTY] = LAYOUT_6x6(
    _______, TOGGLE_RAISE
  ),

  [_RAISE] = LAYOUT_6x6(
    _______, _______, ______, TOGGLE_RAISE
  )
};
```

</div>

## Step 2: Test the F17 and F18 keys

You can quickly test the `F17` and `F18` keys are working by adding a quick hotkey bind to `~/.hammerspoon/init.lua`:

<div data-prism-file="~/.hammerspoon/init.lua">

```lua
hs.hotkey.bind({}, 'f17', function()
  hs.alert.show("Raise layer on")
end)


hs.hotkey.bind({}, 'f18', function()
  hs.alert.show("QWERTY layer on")
end)
```

</div>

Reload Hammerspoon, and tap whatever key you assigned to `TOGGLE_RAISE`. You should see the alerts from Hammerspoon.

## Step 3: Show an indicator with Hammerspoon

I put together a little Lua object that will draw the layer indicator in the top center of the screen.

Just copy and paste the code below and put it in `~/.hammerspoon/layer-indicator.lua`:

<div data-prism-file="~/.hammerspoon/layer-indicator.lua">

```lua
local LayerIndicator = {}

local defaultWidth = 75
local defaultHeight = 16
local elementIndexBox = 1
local elementIndexText = 2

function LayerIndicator:new(defaultLayer)
  local indicator = {
    layer = defaultLayer,
    appWatcher = nil,
    caffeineWatcher = nil
  }

  setmetatable(indicator, self)
  self.__index = self

  indicator.canvas = hs.canvas.new{
    w = defaultWidth,
    h = defaultHeight,
    x = 0,
    y = 0,
  }

  indicator.canvas:insertElement(
    {
      type = 'rectangle',
      action = 'fill',
      roundedRectRadii = { xRadius = 4, yRadius = 4 },
      fillColor = { red = 0, green = 0, blue = 0, alpha = 1.0 },
      frame = { x = "0%", y = "0%", h = "100%", w = "100%", },
    },
    elementIndexBox
  )

  indicator.canvas:insertElement(
    {
      type = 'text',
      action = 'fill',
      frame = {
        x = "10%", y = "0%", h = "100%", w = "95%"
      },
      text = ""
    },
    elementIndexText
  )

  indicator:render()
  indicator:show()
  indicator:startWatchers()

  return indicator
end

function LayerIndicator:startWatchers()
  local delayRender = function()
    hs.timer.doAfter(10 / 1000, function()
      self:render()
    end)
  end

  -- fix alt tabbing from fullscreen games/etc not re-rendering correctly
  self.appWatcher = hs.application.watcher.new(function(applicationName, eventType)
    if eventType == hs.application.watcher.activated then
      delayRender()
    end
  end)

  self.appWatcher:start()

  -- fix render on sleep/wake/etc
  local caffeineEvents = {}
  caffeineEvents[hs.caffeinate.watcher.systemDidWake] = true
  caffeineEvents[hs.caffeinate.watcher.screensDidUnlock] = true
  caffeineEvents[hs.caffeinate.watcher.screensDidWake] = true

  self.caffeineWatcher = hs.caffeinate.watcher.new(function(eventType)
    if caffeineEvents[eventType] then
      delayRender()
    end
  end)

  self.caffeineWatcher:start()
end

function LayerIndicator:render()
  local canvas = self.canvas

  -- set the text
  canvas:elementAttribute(
    elementIndexText,
    'text',
    hs.styledtext.new(
      self.layer.name,
      {
        font = { name = "Helvetica Bold", size = 11 },
        color = self.layer.foreground,
        kerning = 0.5
      }
    )
  )

  -- box color
  canvas:elementAttribute(elementIndexBox, 'fillColor', self.layer.background)

  -- position
  local frame = self:getFrame()
  local frameWidth = frame.w

  -- put the indicator in the middle of the screen
  local x = (frameWidth / 2) - (defaultWidth / 2)
  local y = 3 -- hardcode, you can change this

  canvas:topLeft({
    x = x,
    y = 3
  })
end

function LayerIndicator:show()
  self.canvas:show()

  -- show it above the Menu Bar
  self.canvas:level("overlay")
end

function LayerIndicator:getFrame()
  return hs.screen.mainScreen():frame()
end

function LayerIndicator:setLayer(layer)
  self.layer = layer
  self:render()
end
```

</div>

The last thing to do is wire up this LayerIndicator to show your layers. Modify your `~/.hammerspoon/init.lua` file:

<div data-prism-file="~/.hammerspoon/init.lua">

```lua
local function rgba(r, g, b, a)
  a = a or 1.0

  return {
    red = r / 255,
    green = g / 255,
    blue = b / 255,
    alpha = a
  }
end

-- Define your layers here, as well as the foreground/background of the
-- layer indicator.
--
-- see http://colorsafe.co for some color combos
local layers = {
  default = {
    name = "qwerty",
    background = rgba(187, 187, 187),
    foreground = rgba(46, 52, 59),
  },
  raise = {
    name = "raise",
    background = rgba(163, 209, 255),
    foreground = rgba(15, 72, 128),
  }
}

-- load ~/.hammerspoon/layer-indicator.lua
local LayerIndicator = require "layer-indicator"

-- create a layer indicator
local indicator = LayerIndicator:new(layers.default)

-- intercept QMK keys to change the indicated layer
hs.hotkey.bind({}, 'f17', function()
  indicator:setLayer(layers.raise)
end)

hs.hotkey.bind({}, 'f18', function()
  indicator:setLayer(layers.default)
end)
```

</div>

Reload your Hammerspoon config, and you should see your new layer indicator overlayed on top of the Mac system menu bar!
