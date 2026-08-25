local units = {
  "MiniSamurai",
  "MiniRonin",
  "MiniNinja",
  "MiniYariAshigaru",
  "MiniTeppoAshigaru",
  "MiniYumiSamurai",
  "MiniHorseSamurai",
}

local sourceDir = assert(app.params["sourceDir"], "Missing sourceDir script parameter")
local outputDir = assert(app.params["outputDir"], "Missing outputDir script parameter")

local function findLayer(layers, name)
  for _, layer in ipairs(layers) do
    if layer.name == name then
      return layer
    end
    if layer.isGroup then
      local nested = findLayer(layer.layers, name)
      if nested then
        return nested
      end
    end
  end
  return nil
end

local function renderStrip(sprite)
  local strip = Image(ImageSpec {
    width = sprite.width * #sprite.frames,
    height = sprite.height,
    colorMode = sprite.colorMode,
    transparentColor = sprite.transparentColor,
    colorSpace = sprite.colorSpace,
  })
  for frameNumber = 1, #sprite.frames do
    strip:drawSprite(sprite, frameNumber, Point((frameNumber - 1) * sprite.width, 0))
  end
  return strip
end

local metadata = {}
for _, unit in ipairs(units) do
  local sourcePath = sourceDir .. "/" .. unit .. ".aseprite"
  local sprite = assert(app.open(sourcePath), "Could not open " .. sourcePath)
  assert(sprite.width == 32 and sprite.height == 32, unit .. " must use a 32x32 canvas")

  local outlineLayer = assert(findLayer(sprite.layers, "outline"), unit .. " has no outline layer")
  local originalOutlineVisibility = outlineLayer.isVisible
  outlineLayer.isVisible = true
  local outlineStrip = renderStrip(sprite)
  outlineStrip:saveAs {
    filename = outputDir .. "/" .. unit .. "-outline.png",
    palette = sprite.palettes[1],
  }

  outlineLayer.isVisible = false
  local withoutOutlineStrip = renderStrip(sprite)
  withoutOutlineStrip:saveAs {
    filename = outputDir .. "/" .. unit .. "-without-outline.png",
    palette = sprite.palettes[1],
  }
  outlineLayer.isVisible = originalOutlineVisibility

  local frames = {}
  for _, frame in ipairs(sprite.frames) do
    frames[#frames + 1] = {
      duration = math.floor(frame.duration * 1000 + 0.5),
      frame = { x = (frame.frameNumber - 1) * 32, y = 0, w = 32, h = 32 },
      sourceSize = { w = 32, h = 32 },
      trimmed = false,
      rotated = false,
    }
  end

  local tags = {}
  for _, tag in ipairs(sprite.tags) do
    tags[#tags + 1] = {
      name = tag.name,
      from = tag.fromFrame.frameNumber - 1,
      to = tag.toFrame.frameNumber - 1,
    }
  end
  metadata[unit] = {
    frames = frames,
    meta = { frameTags = tags },
  }
  sprite:close()
end

local metadataPath = outputDir .. "/metadata.json"
local file = assert(io.open(metadataPath, "w"), "Could not write " .. metadataPath)
file:write(json.encode(metadata))
file:write("\n")
file:close()
