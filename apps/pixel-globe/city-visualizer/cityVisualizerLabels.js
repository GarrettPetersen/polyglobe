import { shipLabelForSlug } from "../src/shipStats.js";

export function cityVisualizerShipOptions(ships) {
  if (!Array.isArray(ships) || ships.length === 0) {
    throw new Error("City visualizer ship menu requires a non-empty fleet");
  }
  return Object.freeze(ships.map((ship) => {
    const value = ship?.slug;
    const label = shipLabelForSlug(value);
    if (label === value) {
      throw new Error(`City visualizer cannot display a ship ID as its label: ${value}`);
    }
    return Object.freeze({ value, label });
  }));
}
