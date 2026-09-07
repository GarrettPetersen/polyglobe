/** Subtract reviewed structural yards from a deployed-batten removal set. */
export function dockRigHardwareToRemove({ hardwareIndexes, retainedIndexes, sailIndexes }) {
  const removed = new Set(hardwareIndexes);
  for (const index of retainedIndexes) {
    if (!removed.has(index) || sailIndexes.has(index)) {
      throw new Error(`Retained dock-rig triangle ${index} must belong to hardware, not sailcloth`);
    }
    removed.delete(index);
  }
  return removed;
}
