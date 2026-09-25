const LAYOUT_PRESENTATION_FAILURE =
  /does not fit|do not fit|cannot fit|too narrow|too short for|has no room|no usable|no available page|no vertical space|px are available|pixel font|pixel text|text raster|metrics exceed/i;

// A supported language, font, or panel can fail a fixed English layout check.
// That is a presentation problem. It must not be treated as a broken voyage.
export function isLayoutPresentationFailure(error) {
  return error instanceof Error && LAYOUT_PRESENTATION_FAILURE.test(error.message);
}
