---
layout: article
excerpt: >
  Learn different techniques for retrieving the text values and current
  selection/cursor of input fields, along with their pros and cons.
date: 2020-09-06
title: Retrieving input field values and cursor position/selection with Hammerspoon
tags:
  - writings
  - hammerspoon
---

In my spare time, I work on a library called
[VimMode.spoon](https://github.com/dbalatero/VimMode.spoon), which adds a Vim
mode to every input in the Mac operating system.

A big part of this library's success is being able to read the current value and cursor position of the currently focused input field from Hammerspoon. I've tried a number of different ways to achieve this, and I want to document those experiments here, along with the pros and cons.

I'll look at:

* Using the MacOS Accessibility API, and caveats/hacks
* Trying to work around when the Accessibility API fails to get a cursor position

If anyone has any other clever ideas or techniques, I would really love to hear about them–please email me at _<d at this domain dot com>_ and we can chat!

## The Accessibility API: almost perfect

Mac's Accessibility API is really awesome, and in the best case, exposes more data than you could ever need about the currently focused input field. You can get cursor position, selection range, the value of the field, and even character index ranges for each wrapped line in a multi-line input, which helps when doing things like [linewise](http://vimdoc.sourceforge.net/htmldoc/motion.html) Vim motions!

@asmagill has written an awesome library for interacting with the Accessibility API from Hammerspoon called [hs._asm.axuielement](https://github.com/asmagill/hs._asm.axuielement), which I've made extensive use of.

To use it, follow the [install instructions](https://github.com/asmagill/hs._asm.axuielement#installation) and require it in your scripts:

```lua
local ax = require("hs._asm.axuielement")
```

You can easily grab the currently focused input field:

```lua
local systemElement = ax.systemWideElement()
local currentElement = systemElement:attributeValue("AXFocusedUIElement")
```

You can ask it for the current value, length, and selection range:

```lua
local systemElement = ax.systemWideElement()
local currentElement = systemElement:attributeValue("AXFocusedUIElement")

local value = currentElement:attributeValue("AXValue")
local textLength = currentElement:attributeValue("AXNumberOfCharacters")

-- returns an object like
-- {
--   len = 0,
--   loc = 16
-- }
--
-- where `len` is the length of the current selection (0 if no text is selected)
-- and `loc` is where the cursor currently is in the text, between `[0, textLength]`
local selection = currentElement:attributeValue("AXSelectedTextRange")
```

You can even figure out where the input is being drawn on the screen, in case you want to overlay something on top of the field:

```lua
-- Returns an object like:
--
-- {
--   x = 670.0,
--   y = 1157.0
-- }
--
-- with coordinates of the field on the screen.
local position = currentElement:attributeValue("AXPosition")
```

You can update these values as well:

```lua
local systemElement = ax.systemWideElement()
local currentElement = systemElement:attributeValue("AXFocusedUIElement")

-- set the text
currentElement:setValue("new text value")

-- set the cursor selection at position 0, with a selection length of 3
currentElement:setSelectedTextRange({ location = 0, length = 3 })
```

I have a hotkey that I bind to `super + d` that dumps a bunch of AX debug info to the Hammerspoon console. Inspecting the elements directly has been a great source of learning for me. You can grab the function [here](https://github.com/dbalatero/dotfiles/blob/7517879b0c6002e0b8fe87d0e3bde4f6247228ad/hammerspoon/experimental.lua#L130-L181). It's kind of messy but it works.

### How fast is this method?

Using the Accessibility API is _super_ fast for reading/writing values to input fields.

Let's measure a few things. I'll define a quick helper method for measuring the time a function takes that we can use for the rest of the article:

```lua
local function withMeasurement(name, fn)
  local logger = hs.logger.new('timer', 'debug')

  local startTime = hs.timer.absoluteTime()

  fn()

  local endTime = hs.timer.absoluteTime()

  local diffNs = endTime - startTime
  local diffMs = diffNs / 1000000

  logger.i(name .. " took: " .. diffMs .. "ms")
end
```

Let's measure some common operations. I created this measurement function, focused an input, and hit `super + u` to measure. The logs show up in the Hammerspoon console.

```lua
hs.hotkey.bind(super, 'u', function()
  local systemElement = ax.systemWideElement()
  local currentElement = systemElement:attributeValue("AXFocusedUIElement")

  withMeasurement('retrieving value', function()
    currentElement:attributeValue('AXValue')
  end)

  withMeasurement('retrieving position', function()
    currentElement:attributeValue('AXSelectedTextRange')
  end)

  withMeasurement('setting value', function()
    currentElement:setValue('blah')
  end)

  withMeasurement('setting position', function()
    currentElement:setSelectedTextRange({ location = 0, length = 3 })
  end)
end)
```

The results:

```text
2020-09-06 11:58:24: 11:58:24      timer: retrieving value took: 0.070293ms
2020-09-06 11:58:24:               timer: retrieving position took: 0.064117ms
2020-09-06 11:58:24:               timer: setting value took: 0.724187ms
2020-09-06 11:58:24:               timer: setting position took: 0.384036ms
```

With these sub-millisecond timings, users will never notice any input lag when reading or writing these values. This is great!

### Downsides of the Accessibility API

I wish the Accessibility API worked perfectly across all applications. Alas, there are a lot of bad edge cases to deal with:

1. Google Chrome works, but you need to set `AXEnhancedUserInterface` to `true` to enable the Accessibility tree.
2. Electron apps don't expose any accessibility attributes unless `AXManualAccessibility` is set to `true`.
3. Electron apps return a cursor selection of `{ location = 0, length = 0 }` no matter what. This is because Apple has deemed this a private API, and providing this API to external accessibility applications [will fail your submission](https://github.com/electron/electron/issues/22908) to the Mac App Store. "Great."

You can hot-patch these things and fix issue 1 and 2 manually from Lua:

```lua
local currentApp = hs.application.frontmostApplication()
local axApp = ax.applicationElement(currentApp)

-- Google Chrome needs this flag to turn on accessibility in the browser
axApp:setAttributeValue('AXEnhancedUserInterface', true)

-- Electron apps require this attribute to be set or else you cannot
-- read the accessibility tree
axApp:setAttributeValue('AXManualAccessibility', true)
```

However, no cursor selection from Electron apps (and the proliferation of Electron apps in general) means that managing cursor position consistently from Hammerspoon is a no-go. This is why my Vim plugin has an [Advanced Mode](https://github.com/dbalatero/VimMode.spoon#advanced-mode) for apps that play well with accessibility and a [Fallback Mode](https://github.com/dbalatero/VimMode.spoon#fallback-mode) for those that don't (Electron).

I haven't figured out how to use these APIs with rich input fields, such as `<div contentEditable>` in browsers, or native OS fields that include more than just text. Getting Lua to deal with UTF-8 text has been an issue as well.

## Can we get around the Electron selection problem?

I tried a few ways to try to hack around not getting good values back from `AXSelectedTextRange` in Electron apps.

My first naive thought was:

* Try to send `cmd + shift + left arrow` and `cmd + c` to copy all the text to the left of the cursor
* The cursor position will now be at `len(leftText)`

There's a number of problems with this approach though:

* What if the user already has a text selection?
* What if the user is all the way to the left of the input?
  * The copy will never fire, because there will be no selection and the Edit > Copy menu item is grayed out.

How fast is copying in the best case scenario where we have a selection already?

```lua
hs.hotkey.bind(super, 'u', function()
  local startTimeNs = hs.timer.absoluteTime()
  local initialCount = hs.pasteboard.changeCount()
  local pasteboardTimer
  local timeoutTimer

  -- the clipboard has updated with a new value once the count changes
  local clipboardHasUpdated = function()
    return initialCount ~= hs.pasteboard.changeCount()
  end

  -- wait for the pasteboard to increment its count, indicating that
  -- the async copy to clipboard is done
  local waitInterval = 10 / 1000 -- 10ms

  -- select to the left
  hs.eventtap.keyStroke({"cmd", "shift"}, "left", 0)

  -- fire copy after 10ms
  hs.timer.doAfter(10 / 1000, function()
    hs.eventtap.keyStroke({"cmd"}, "c", 0)
  end)

  pasteboardTimer = hs.timer.waitUntil(
    clipboardHasUpdated,
    function()
      local endTimeNs = hs.timer.absoluteTime()
      local diffMs = (endTimeNs - startTimeNs) / 1000000

      logger.i("Got contents in millseconds: ", diffMs)
    end,
    waitInterval
  )
end)
```

This takes around `20ms` on my computer to wait for the clipboard to update with the copied value.

Another idea I had was to delete all the text to the right of the cursor, check the new length of the input, and restore the text by hitting `cmd + z` and clearing the selection with `left arrow`.

I'll leave the code here, but I was really unable to make it stable across multiple fields. For example, it worked fairly fast  in the input field in the Hammerspoon console (10ms to get the selection, 4ms restore time), but was much slower in Slack (Electron) and started doing weird things with the cursor. Worst case, the cursor is all the way to the right of the field and cannot select anything to the right, so it times out at 50ms trying to wait for a field update.

```lua

function getCurrentPositionAsync(callbackFn)
  local logger = hs.logger.new('timer', 'debug')
  local startTimeNs = hs.timer.absoluteTime()

  local reportCallback = function(position)
    local endTimeNs = hs.timer.absoluteTime()
    local diffMs = (endTimeNs - startTimeNs) / 1000000

    logger.i("Got position in millseconds: " .. position, diffMs)

    callbackFn(position)
  end

  local systemElement = ax.systemWideElement()
  local currentElement = systemElement:attributeValue("AXFocusedUIElement")
  local initialValue = currentElement:attributeValue('AXValue')

  -- If empty, we know we can return early with 0
  if initialValue == "" then return reportCallback(0) end

  local currentValue = initialValue

  local valueChanged = function()
    currentValue = currentElement:attributeValue('AXValue')
    return currentValue ~= initialValue
  end

  -- check every 0.2ms for a value change
  local waitInterval = 0.2 / 1000

  local changeTimer = hs.timer.waitUntil(
    valueChanged,
    function()
      local position = string.len(currentValue)
      reportCallback(position)

      withMeasurement("restore value", function()
        -- restore the value
        hs.eventtap.keyStroke({"cmd"}, "z", 0)
        hs.eventtap.keyStroke({}, "left", 0)
      end)
    end,
    waitInterval
  )

  -- how long are we willing to wait for the value before
  -- timing out and aborting?
  local maxWaitTimeSecs = 50 / 1000 -- 50ms

  hs.timer.doAfter(maxWaitTimeSecs, function()
    if changeTimer:running() then
      changeTimer:stop()
      callbackFn(string.len(initialValue))
    end
  end)

  -- kick it off
  hs.eventtap.keyStroke({'cmd', 'shift'}, "down", 0)

  -- fire delete after 2ms
  hs.timer.doAfter(5 / 1000, function()
    hs.eventtap.keyStroke({}, "forwarddelete", 0)
  end)
end

hs.hotkey.bind(super, 'u', function()
  getCurrentPositionAsync(function(position)
    local logger = hs.logger.new('position', 'debug')
    logger.i("Got position " .. inspect(position))
  end)
end)
```

Both these methods are unfortunate, as they add brittle timers into the mix (is a 50ms timeout good enough for _all_ computers?) and they force the selection retrieval API to be called in an asynchronous way with a callback function. Ick.

Also, this only solves half the problem–we still need a way to set the cursor position after operating on the field.

## Conclusions

I hope this gave you a deeper look at retrieving field values and cursor positions with Hammerspoon. My takeaways from my research are:

* If you use the Accessibility API, plan for it to not work perfectly in all cases
* Copying text to the clipboard is slow
* Fiddling with fields by selecting/deleting/restoring is a bit faster, but error-prone

If you have less strict latency requirements, using a naive "select all and copy" to get the current field contents is perfectly ok! Stricter latency requirements, such as my Vim library, need to be resilient to all these corner cases.
