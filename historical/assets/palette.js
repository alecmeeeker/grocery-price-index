/* Bushwick Daily grocery viz palette — generated from
   analysis/03-creative-direction.md §2. One tokens source, three consumers
   (viz.css, this file, matplotlib bd_viz). Machine-validated on #f7f3e9. */
export const STORE_COLORS = {
  key_food: "#2c6e1f",
  shop_fair: "#1f5a9e",
  mr_fruit: "#c9611e",
  city_fresh: "#00958a",
  hana: "#b3402e",
  food_story: "#8a4a9e",
  food_bazaar: "#3d8fd4",
  met_fresh: "#8a6d1a",
  billys: "#5352c2",
  whole_foods: "#c25a84",
  superfresh: "#1188b8",
  brooklyns_natural: "#96551c",
  mr_lemon: "#a3308f",
  associated: "#8a8172",
  trader_joes: "#5c5344",
};
export const GROUP_COLORS = [
  // stack order, bottom -> top (never re-sorted)
  ["Grains", "#8a6d1a"],
  ["Dairy", "#3d8fd4"],
  ["Protein", "#b3402e"],
  ["Pantry", "#8a4a9e"],
  ["Produce", "#2c6e1f"],
  ["Treats", "#c25a84"],
];
export const DATA_INK = "#7a5300";
export const NEUTRAL = "#5c5344";
export const TRIO_2021 = ["shop_fair", "hana", "city_fresh"];
export const TRIO_2026 = ["mr_lemon", "hana", "city_fresh"];
// never hue-paired in any multi-series form; fold one to NEUTRAL + direct label
export const CONSTRAINED_PAIRS = [
  ["whole_foods", "hana"], ["whole_foods", "food_story"],
  ["whole_foods", "mr_fruit"], ["whole_foods", "mr_lemon"],
  ["mr_lemon", "shop_fair"], ["mr_lemon", "food_story"],
  ["superfresh", "city_fresh"], ["superfresh", "food_bazaar"],
  ["superfresh", "shop_fair"], ["brooklyns_natural", "mr_fruit"],
  ["brooklyns_natural", "met_fresh"], ["brooklyns_natural", "hana"],
  ["brooklyns_natural", "key_food"],
];
