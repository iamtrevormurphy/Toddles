import React from 'react';
import { View } from 'react-native';
import HistoryChip from './HistoryChip';
import { CHIP_SIZE, HISTORY_WINDOW, chipSlotCenters, trailPixelWidth } from './trackLayout';

// The read-only action history: a quiet breadcrumb strip of what Lento
// has done, windowed over the last HISTORY_WINDOW entries of the
// unbounded program. No empty-slot placeholders — an empty trail is just
// empty space, because there is nothing for the child to fill in (every
// tap executes immediately; this is a record, not a plan).
// highlightIndex/pulseIndex are PROGRAM indexes, mapped into the window.
export default function HistoryTrail({
  track,
  highlightIndex,
  pulseIndex,
  ejectingId,
  removingId,
}) {
  const windowStart = Math.max(0, track.length - HISTORY_WINDOW);
  const centers = chipSlotCenters(HISTORY_WINDOW);

  return (
    <View
      style={{ width: trailPixelWidth(HISTORY_WINDOW), height: CHIP_SIZE + 6 }}
      pointerEvents="none"
    >
      {track.slice(windowStart).map((tile, i) => {
        const programIndex = windowStart + i;
        return (
          <HistoryChip
            key={tile.id}
            type={tile.type}
            x={centers[i]}
            isNewest={programIndex === track.length - 1}
            isActive={highlightIndex === programIndex}
            isPulsing={pulseIndex === programIndex}
            leaving={
              ejectingId === tile.id ? 'eject' : removingId === tile.id ? 'undo' : null
            }
          />
        );
      })}
    </View>
  );
}
