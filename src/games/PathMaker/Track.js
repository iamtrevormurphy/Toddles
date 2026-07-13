import React from 'react';
import DraggableTile from './DraggableTile';
import TrackSlot from './TrackSlot';
import { assignSlots, layoutPositions } from './trackLayout';

// Renders slotCount positions: an empty dashed TrackSlot or a filled,
// draggable DraggableTile, whichever the track (plus any in-flight
// preview gap) implies for that index.
export default function Track({
  slotCenters,
  rowY,
  track,
  previewIndex,
  draggingId,
  disabled,
  highlightIndex,
  pulseIndex,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemoved,
}) {
  const assignment = assignSlots(track, { previewIndex, draggingId });
  const positions = layoutPositions(track, slotCenters, { previewIndex, draggingId });

  const tileBySlot = {};
  for (const tile of track) {
    if (tile.id === draggingId) continue;
    tileBySlot[assignment[tile.id]] = tile;
  }

  return (
    <>
      {slotCenters.map((slotX, i) => {
        const tile = tileBySlot[i];
        if (!tile) {
          return <TrackSlot key={`slot-${i}`} x={slotX} y={rowY} isPulsing={pulseIndex === i} />;
        }
        const tileIndex = track.findIndex((t) => t.id === tile.id);
        return (
          <DraggableTile
            key={tile.id}
            mode="track"
            id={tile.id}
            type={tile.type}
            x={positions[tile.id]}
            y={rowY}
            disabled={disabled}
            isActive={highlightIndex === tileIndex}
            isPulsing={pulseIndex === tileIndex}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onRemoved={onRemoved}
          />
        );
      })}
    </>
  );
}
