import React from 'react';
import DraggableTile from './DraggableTile';
import TrackSlot from './TrackSlot';
import { TRACK_WINDOW } from './trackLayout';

// Renders the last TRACK_WINDOW entries of the (unbounded) program: the
// track is a rolling history, not a plan. When the window is full a new
// tile lands in the rightmost slot and everything springs one slot left
// (DraggableTile already springs on x-prop changes). Only the LAST tile
// is interactive — pulling or tapping it is the "undo one step" gesture;
// everything earlier is committed history. highlightIndex/pulseIndex are
// PROGRAM indexes; this component maps them into the window.
export default function Track({
  slotCenters,
  rowY,
  track,
  previewSlot,
  disabled,
  highlightIndex,
  pulseIndex,
  ejectingId,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemoved,
  onTap,
}) {
  const windowStart = Math.max(0, track.length - TRACK_WINDOW);

  return (
    <>
      {slotCenters.map((slotX, i) => {
        const programIndex = windowStart + i;
        const tile = track[programIndex];
        if (!tile) {
          return (
            <TrackSlot
              key={`slot-${i}`}
              x={slotX}
              y={rowY}
              isPulsing={previewSlot === i}
            />
          );
        }
        return (
          <DraggableTile
            key={tile.id}
            mode="track"
            id={tile.id}
            type={tile.type}
            x={slotX}
            y={rowY}
            disabled={disabled || programIndex !== track.length - 1}
            isActive={highlightIndex === programIndex}
            isPulsing={pulseIndex === programIndex}
            isEjecting={ejectingId === tile.id}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onRemoved={onRemoved}
            onTap={onTap}
          />
        );
      })}
    </>
  );
}
