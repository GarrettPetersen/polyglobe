/**
 * Hand-traced river segments missing from Natural Earth polylines at a given geodesic subdivision.
 * Each inner array is an ordered path of adjacent tile IDs (from hex debug “chain” CSV).
 * Consecutive IDs must share an edge; chains may start/end on water (lake/ocean) to meet existing rivers.
 */
export const MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS: Record<
  number,
  readonly (readonly number[])[]
> = {
  7: [
    [
      74294, 74295, 74300, 49366, 74299, 74312, 74313, 74311, 74310, 74357,
      74358, 74363, 74362, 74352, 74353, 74351,
    ], // Saint Lawrence: Lake Ontario → Gulf of St. Lawrence
    [
      48868, 48867, 3079, 48955, 48956,
    ], // Lake Huron → Lake Erie (St. Clair / Detroit gap)
    [
      136406, 136408, 136411, 34220, 136593,
    ], // Amazon → Atlantic mouth gap
    [129681, 32558, 129685], // Congo river connector
    [92924, 23310, 92926], // Mekong connector
    [61707, 61708, 61706, 61625, 987], // Yangtze connector
    [151665, 151676], // Murray river connector
    [46520, 46519, 46531], // Columbia river connector
    [
      25502, 101645, 101916, 101905, 101923, 101922, 101909, 101910,
    ], // Nile delta widener
    [3710, 58698, 58714, 58713], // Ob river connector
  ],
};
