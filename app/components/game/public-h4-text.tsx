import { matchingPublicH4Segments, type PublicH4Segment } from "../../../game/public-h4-copy";

/** Render only producer-verified names whose segment text matches this exact copy. */
export function PublicH4Text({ message, segments }: {
  message: string;
  segments?: readonly PublicH4Segment[];
}) {
  const parts = matchingPublicH4Segments(message, segments);
  return parts
    ? <>{parts.map((part, index) => part.kind === "player"
      ? <span key={index} className="message-player-name public-h4-player" data-player-id={part.playerId} data-public-player-id={part.playerId}>{part.text}</span>
      : <span key={index}>{part.text}</span>)}</>
    : message;
}
