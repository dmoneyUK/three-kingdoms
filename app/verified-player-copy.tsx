"use client";

import { Fragment } from "react";
import { matchingVerifiedPlayerCopySegments, type VerifiedPlayerCopySegment } from "../game/verified-player-copy";

export function VerifiedPlayerCopy({
  message,
  segments,
  playerClassNameForOrdinal,
}: {
  message: string;
  segments?: readonly VerifiedPlayerCopySegment[];
  playerClassNameForOrdinal?: (ordinal: number, segment: Extract<VerifiedPlayerCopySegment, { kind: "player" }>) => string | undefined;
}) {
  const verified = matchingVerifiedPlayerCopySegments(message, segments);
  if (!verified) return <>{message}</>;

  let playerOrdinal = 0;
  return <>{verified.map((part, index) => {
    if (part.kind === "text") return <Fragment key={`text-${index}`}>{part.text}</Fragment>;
    const ordinal = playerOrdinal++;
    const customClass = playerClassNameForOrdinal?.(ordinal, part);
    return <span
      key={`player-${index}-${part.playerId}`}
      className={customClass ? `message-player-name ${customClass}` : "message-player-name"}
      data-player-id={part.playerId}
    >{part.text}</span>;
  })}</>;
}
