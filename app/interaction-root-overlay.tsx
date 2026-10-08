"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CardKind } from "../game/model";
import type { PresentationSnapshotRootAction } from "../game/presentation-snapshot";

type Point = { x: number; y: number };
type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type RootActionLayout = {
  width: number;
  height: number;
  card: Rect;
  sourcePath: string;
  targetPath: string | null;
  responseTargetPath: string | null;
  targetBlockPath: string | null;
  responseCard: Rect | null;
  responseSourcePath: string | null;
  counterPath: string | null;
  blockPath: string | null;
  responseCards: readonly Rect[];
  responseSourcePaths: readonly string[];
  responseCounterPaths: readonly string[];
  selfHalo: Rect | null;
};

type InteractionRootOverlayResponseNode = {
  index: number;
  eventId: string;
  actorId: string;
  actorName: string;
  cardLabel: string;
  ariaLabel: string;
  counterTarget: { kind: "ROOT" } | { kind: "RESPONSE"; index: number };
};

export type InteractionRootOverlayAction = {
  key: string;
  rootEventId: string;
  sourceId: string;
  targetId: string;
  cardKind: CardKind;
  cardLabel: string;
  ariaLabel: string;
  mode: "targeted" | "self-target";
  compactRoot?: boolean;
  rootEffectState?: "ACTIVE" | "BLOCKED";
  response?: { eventId: string; actorId: string; actorName: string; cardLabel: string; ariaLabel: string; countersRoot?: boolean; targetId?: string; decisionActorId?: string };
  responses?: readonly InteractionRootOverlayResponseNode[];
};

function relativeRect(element: HTMLElement, root: DOMRect): Rect {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - root.left,
    top: rect.top - root.top,
    right: rect.right - root.left,
    bottom: rect.bottom - root.top,
    width: rect.width,
    height: rect.height,
  };
}

function center(rect: Rect): Point { return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }

function rectangleEdge(rect: Rect, toward: Point): Point {
  const origin = center(rect);
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  if (dx === 0 && dy === 0) return origin;
  const xScale = dx === 0 ? Number.POSITIVE_INFINITY : rect.width / 2 / Math.abs(dx);
  const yScale = dy === 0 ? Number.POSITIVE_INFINITY : rect.height / 2 / Math.abs(dy);
  const scale = Math.min(xScale, yScale);
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

function pathBetween(start: Point, end: Point, curve: number): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const control = {
    x: (start.x + end.x) / 2 - dy / length * curve,
    y: (start.y + end.y) / 2 + dx / length * curve,
  };
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function overlaps(left: Rect, right: Rect, padding = 0): boolean {
  return left.left < right.right + padding && left.right > right.left - padding
    && left.top < right.bottom + padding && left.bottom > right.top - padding;
}

function layoutRootAction(shell: HTMLElement, cardElement: HTMLElement, responseElement: HTMLElement | null, responseElements: readonly HTMLElement[], action: Pick<InteractionRootOverlayAction, "sourceId" | "targetId" | "mode" | "rootEffectState" | "response" | "responses">, preferredRootCard: Rect | null): RootActionLayout | null {
  const table = shell.querySelector<HTMLElement>(".play-table");
  const shellBounds = shell.getBoundingClientRect();
  const cardBounds = cardElement.getBoundingClientRect();
  if (!table || shellBounds.width <= 0 || shellBounds.height <= 0 || cardBounds.width <= 0 || cardBounds.height <= 0) return null;

  const anchorFor = (playerId: string) => {
    const matches = Array.from(shell.querySelectorAll<HTMLElement>("[data-player-anchor]"))
      .filter((anchor) => anchor.dataset.playerAnchor === playerId);
    return matches.length === 1 ? matches[0] : null;
  };
  const sourceElement = anchorFor(action.sourceId);
  const isSelfTarget = action.mode === "self-target";
  const targetElement = isSelfTarget ? sourceElement : anchorFor(action.targetId);
  const responseSourceElement = action.response ? anchorFor(action.response.actorId) : null;
  const responseTargetElement = action.response?.targetId ? anchorFor(action.response.targetId) : null;
  const responseChainSources = (action.responses ?? []).map((response) => anchorFor(response.actorId));
  if (!sourceElement || !targetElement || isSelfTarget !== (sourceElement === targetElement)
    || isSelfTarget !== (action.sourceId === action.targetId)
    || action.response && !responseSourceElement
    || action.response?.targetId && !responseTargetElement
    || action.responses && (responseElements.length !== action.responses.length
      || responseChainSources.some((element) => !element))) return null;
  const sourceBounds = sourceElement.getBoundingClientRect();
  const targetBounds = targetElement.getBoundingClientRect();
  if (!sourceElement.isConnected || !targetElement.isConnected
    || sourceElement.getClientRects().length !== 1 || targetElement.getClientRects().length !== 1
    || sourceBounds.width <= 0 || sourceBounds.height <= 0
    || targetBounds.width <= 0 || targetBounds.height <= 0) return null;
  if (action.response?.targetId) {
    const responseTargetBounds = responseTargetElement?.getBoundingClientRect();
    if (!responseTargetElement?.isConnected || responseTargetElement.getClientRects().length !== 1
      || !responseTargetBounds || responseTargetBounds.width <= 0 || responseTargetBounds.height <= 0) return null;
  }

  const tableRect = relativeRect(table, shellBounds);
  const sourceRect = relativeRect(sourceElement, shellBounds);
  const targetRect = relativeRect(targetElement, shellBounds);
  const responseSourceRect = responseSourceElement ? relativeRect(responseSourceElement, shellBounds) : null;
  const responseTargetRect = responseTargetElement ? relativeRect(responseTargetElement, shellBounds) : null;
  const cardWidth = cardBounds.width;
  const cardHeight = cardBounds.height;
  const margin = 12;
  if (tableRect.width < cardWidth + margin * 2 || tableRect.height < cardHeight + margin * 2) return null;

  const sourceCenter = center(sourceRect);
  if (action.mode === "self-target") {
    const tableCenter = center(tableRect);
    const inwardDelta = { x: tableCenter.x - sourceCenter.x, y: tableCenter.y - sourceCenter.y };
    const inwardLength = Math.hypot(inwardDelta.x, inwardDelta.y) || 1;
    const inward = { x: inwardDelta.x / inwardLength, y: inwardDelta.y / inwardLength };
    const tangent = { x: -inward.y, y: inward.x };
    const sourceExtent = Math.abs(inward.x) * sourceRect.width / 2 + Math.abs(inward.y) * sourceRect.height / 2;
    const preferred = {
      x: sourceCenter.x + inward.x * (sourceExtent + cardWidth / 2 + 24),
      y: sourceCenter.y + inward.y * (sourceExtent + cardHeight / 2 + 24),
    };
    // Wider portrait boards can put the local Dock's inward projection behind
    // the central deck/discard object. Include a full card-width sidestep so
    // the self-target card can remain near the source without covering it.
    const candidateCenters = [0, -72, 72, -44, 44, -104, 104, -152, 152].map((offset) => ({
      x: preferred.x + tangent.x * offset,
      y: preferred.y + tangent.y * offset,
    })).concat([0, -54, 54].flatMap((advance) => [0, -44, 44].map((offset) => ({
      x: preferred.x + inward.x * advance + tangent.x * offset,
      y: preferred.y + inward.y * advance + tangent.y * offset,
    }))));
    const obstacles = [
      ...Array.from(shell.querySelectorAll<HTMLElement>("[data-player-anchor]")),
      ...Array.from(shell.querySelectorAll<HTMLElement>(".play-center, .stage-system-cluster, .game-messages, .game-exit")),
    ].filter((element) => element.getClientRects().length > 0)
      .map((element) => relativeRect(element, shellBounds));
    const candidates = candidateCenters.flatMap((candidate) => {
      const left = Math.max(tableRect.left + margin, Math.min(candidate.x - cardWidth / 2, tableRect.right - margin - cardWidth));
      const top = Math.max(tableRect.top + margin, Math.min(candidate.y - cardHeight / 2, tableRect.bottom - margin - cardHeight));
      const card: Rect = { left, top, right: left + cardWidth, bottom: top + cardHeight, width: cardWidth, height: cardHeight };
      if (obstacles.some((obstacle) => overlaps(card, obstacle, 8))) return [];
      return [{ card, score: Math.hypot(left + cardWidth / 2 - preferred.x, top + cardHeight / 2 - preferred.y) }];
    }).sort((left, right) => left.score - right.score);
    const card = candidates[0]?.card;
    if (!card) return null;
    const emphasisElement = sourceElement.classList.contains("local-player-dock")
      ? sourceElement.querySelector<HTMLElement>(".local-hero-card") ?? sourceElement
      : sourceElement;
    const emphasis = relativeRect(emphasisElement, shellBounds);
    const selfHalo = { left: emphasis.left - 3, top: emphasis.top - 3, right: emphasis.right + 3, bottom: emphasis.bottom + 3, width: emphasis.width + 6, height: emphasis.height + 6 };
    const cardCenter = center(card);
    const sourceStart = rectangleEdge(sourceRect, cardCenter);
    const sourceEnd = rectangleEdge(card, sourceCenter);
    return {
      width: shellBounds.width,
      height: shellBounds.height,
      card,
      sourcePath: pathBetween(sourceStart, sourceEnd, Math.min(24, Math.hypot(cardCenter.x - sourceCenter.x, cardCenter.y - sourceCenter.y) * .035)),
      targetPath: null,
      responseTargetPath: null,
      targetBlockPath: null,
      responseCard: null,
      responseSourcePath: null,
      counterPath: null,
      blockPath: null,
      responseCards: [],
      responseSourcePaths: [],
      responseCounterPaths: [],
      selfHalo,
    };
  }

  const targetCenter = center(targetRect);
  const lineX = targetCenter.x - sourceCenter.x;
  const lineY = targetCenter.y - sourceCenter.y;
  const lineLength = Math.hypot(lineX, lineY) || 1;
  const normal = { x: -lineY / lineLength, y: lineX / lineLength };
  const sourceBiasedFraction = .36;
  const preferred = {
    x: sourceCenter.x + lineX * sourceBiasedFraction,
    y: sourceCenter.y + lineY * sourceBiasedFraction,
  };
  const lateralDistance = Math.min(92, Math.max(42, Math.min(tableRect.width, tableRect.height) * .14));
  const candidateCenters = [
    ...[.28, .36, .44, .52].flatMap((fraction) => [0, -lateralDistance, lateralDistance, -lateralDistance * 1.65, lateralDistance * 1.65].map((offset) => ({
      x: sourceCenter.x + lineX * fraction + normal.x * offset,
      y: sourceCenter.y + lineY * fraction + normal.y * offset,
      fraction,
      offset,
    }))),
  ];
  const obstacleElements = [
    ...Array.from(shell.querySelectorAll<HTMLElement>("[data-player-anchor]")),
    ...Array.from(shell.querySelectorAll<HTMLElement>(".play-center, .stage-system-cluster, .game-messages, .game-exit")),
  ].filter((element) => element.getClientRects().length > 0)
  const obstacles = obstacleElements.map((element) => relativeRect(element, shellBounds));
  const candidates = candidateCenters.flatMap((candidate) => {
    const left = Math.max(tableRect.left + margin, Math.min(candidate.x - cardWidth / 2, tableRect.right - margin - cardWidth));
    const top = Math.max(tableRect.top + margin, Math.min(candidate.y - cardHeight / 2, tableRect.bottom - margin - cardHeight));
    const card: Rect = { left, top, right: left + cardWidth, bottom: top + cardHeight, width: cardWidth, height: cardHeight };
    if (obstacles.some((obstacle) => overlaps(card, obstacle, 8))) return [];
    const distance = Math.hypot(left + cardWidth / 2 - preferred.x, top + cardHeight / 2 - preferred.y);
    return [{ card, score: distance + Math.abs(candidate.fraction - sourceBiasedFraction) * 80 + Math.abs(candidate.offset) * .12 }];
  }).sort((left, right) => left.score - right.score);
  const localDockRect = shell.querySelector<HTMLElement>(".local-player-dock")?.getClientRects().length
    ? relativeRect(shell.querySelector<HTMLElement>(".local-player-dock")!, shellBounds)
    : null;
  const stableStageBottom = localDockRect && localDockRect.top >= tableRect.bottom
    ? localDockRect.top
    : tableRect.bottom;
  // A CurrentAction handoff can grow the local Dock slightly. Preserve the
  // cached root and apply only the minimum upward clearance needed to keep it
  // out of the Dock, rather than re-routing the root across the table.
  const stableRootBottomCorrection = preferredRootCard
    ? Math.max(0, preferredRootCard.bottom - stableStageBottom)
    : 0;
  const stableRootCard = preferredRootCard ? {
    ...preferredRootCard,
    top: preferredRootCard.top - stableRootBottomCorrection,
    width: cardWidth,
    height: cardHeight,
    right: preferredRootCard.left + cardWidth,
    bottom: preferredRootCard.top - stableRootBottomCorrection + cardHeight,
  } : null;
  const cachedRootFits = stableRootCard
    && stableRootBottomCorrection <= 24
    && stableRootCard.left >= tableRect.left + margin && stableRootCard.top >= tableRect.top + margin
    && stableRootCard.right <= tableRect.right - margin && stableRootCard.bottom <= stableStageBottom
    && !obstacleElements.some((element) => overlaps(stableRootCard, relativeRect(element, shellBounds), element.classList.contains("local-player-dock") ? 0 : 8));
  const card = cachedRootFits && stableRootCard ? stableRootCard : candidates[0]?.card;
  if (!card) return null;

  const cardCenter = center(card);
  const sourceStart = rectangleEdge(sourceRect, cardCenter);
  const sourceEnd = rectangleEdge(card, sourceCenter);
  if (action.responses?.length) {
    if (action.responses.some((response, index) => response.index !== index)) return null;
    const responseCards: Rect[] = [];
    const responseSourcePaths: string[] = [];
    const responseCounterPaths: string[] = [];
    for (let index = 0; index < action.responses.length; index += 1) {
      const response = action.responses[index];
      const responseElement = responseElements[index];
      const actorElement = responseChainSources[index];
      if (!responseElement || !actorElement || !actorElement.isConnected || actorElement.getClientRects().length !== 1) return null;
      const actorBounds = actorElement.getBoundingClientRect();
      const responseBounds = responseElement.getBoundingClientRect();
      if (actorBounds.width <= 0 || actorBounds.height <= 0 || responseBounds.width <= 0 || responseBounds.height <= 0) return null;
      const actorRect = relativeRect(actorElement, shellBounds);
      const actorCenter = center(actorRect);
      const targetResponse = response.counterTarget.kind === "RESPONSE"
        ? responseCards[response.counterTarget.index]
        : null;
      if (response.counterTarget.kind === "RESPONSE"
        && (response.counterTarget.index < 0 || response.counterTarget.index >= index || !targetResponse)) return null;
      const counterTargetRect = targetResponse ?? card;
      const counterTargetCenter = center(counterTargetRect);
      const responseLineX = counterTargetCenter.x - actorCenter.x;
      const responseLineY = counterTargetCenter.y - actorCenter.y;
      const responseLineLength = Math.hypot(responseLineX, responseLineY) || 1;
      const responseNormal = { x: -responseLineY / responseLineLength, y: responseLineX / responseLineLength };
      const responseWidth = responseBounds.width;
      const responseHeight = responseBounds.height;
      const preferredFraction = .62;
      const responsePreferred = {
        x: actorCenter.x + responseLineX * preferredFraction,
        y: actorCenter.y + responseLineY * preferredFraction,
      };
      const responseObstacles = [...obstacles, card, ...responseCards];
      const fractions = [.5, .62, .74, .84];
      const offsets = [0, -38, 38, -64, 64, -92, 92];
      const candidatesForResponse = fractions.flatMap((fraction) => offsets.flatMap((offset) => {
        const candidate = {
          x: actorCenter.x + responseLineX * fraction + responseNormal.x * offset,
          y: actorCenter.y + responseLineY * fraction + responseNormal.y * offset,
        };
        const left = Math.max(tableRect.left + margin, Math.min(candidate.x - responseWidth / 2, tableRect.right - margin - responseWidth));
        const top = Math.max(tableRect.top + margin, Math.min(candidate.y - responseHeight / 2, tableRect.bottom - margin - responseHeight));
        const responseRect: Rect = { left, top, right: left + responseWidth, bottom: top + responseHeight, width: responseWidth, height: responseHeight };
        if (responseObstacles.some((obstacle) => overlaps(responseRect, obstacle, 8))) return [];
        const distance = Math.hypot(left + responseWidth / 2 - responsePreferred.x, top + responseHeight / 2 - responsePreferred.y);
        return [{ responseRect, score: distance + Math.abs(fraction - preferredFraction) * 80 + Math.abs(offset) * .12 }];
      })).sort((left, right) => left.score - right.score);
      const responseRect = candidatesForResponse[0]?.responseRect;
      if (!responseRect) return null;
      const responseCenter = center(responseRect);
      const counterStart = rectangleEdge(responseRect, counterTargetCenter);
      const counterEnd = rectangleEdge(counterTargetRect, responseCenter);
      const responseSourceStart = rectangleEdge(actorRect, responseCenter);
      const responseSourceEnd = rectangleEdge(responseRect, actorCenter);
      responseCards.push(responseRect);
      responseSourcePaths.push(pathBetween(responseSourceStart, responseSourceEnd, Math.min(20, Math.hypot(responseSourceEnd.x - responseSourceStart.x, responseSourceEnd.y - responseSourceStart.y) * .025)));
      responseCounterPaths.push(pathBetween(counterStart, counterEnd, 0));
    }
    let targetBlockPath: string | null = null;
    if (action.rootEffectState === "BLOCKED") {
      const targetStart = rectangleEdge(card, targetCenter);
      const targetEnd = rectangleEdge(targetRect, cardCenter);
      const targetLength = Math.hypot(targetEnd.x - targetStart.x, targetEnd.y - targetStart.y) || 1;
      const targetNormal = { x: -(targetEnd.y - targetStart.y) / targetLength, y: (targetEnd.x - targetStart.x) / targetLength };
      const targetMiddle = { x: (targetStart.x + targetEnd.x) / 2, y: (targetStart.y + targetEnd.y) / 2 };
      const targetBlockHalf = 8;
      targetBlockPath = `M ${(targetMiddle.x - targetNormal.x * targetBlockHalf).toFixed(1)} ${(targetMiddle.y - targetNormal.y * targetBlockHalf).toFixed(1)} L ${(targetMiddle.x + targetNormal.x * targetBlockHalf).toFixed(1)} ${(targetMiddle.y + targetNormal.y * targetBlockHalf).toFixed(1)}`;
    }
    return {
      width: shellBounds.width,
      height: shellBounds.height,
      card,
      sourcePath: pathBetween(sourceStart, sourceEnd, Math.min(24, lineLength * .035)),
      targetPath: pathBetween(rectangleEdge(card, targetCenter), rectangleEdge(targetRect, cardCenter), Math.min(34, lineLength * .05)),
      responseTargetPath: null,
      targetBlockPath,
      responseCard: null,
      responseSourcePath: null,
      counterPath: null,
      blockPath: null,
      responseCards,
      responseSourcePaths,
      responseCounterPaths,
      selfHalo: null,
    };
  }
  if (action.response) {
    if (!responseElement || !responseSourceElement || !responseSourceRect) return null;
    if (action.response.targetId && !responseTargetRect) return null;
    const responseSourceBounds = responseSourceElement.getBoundingClientRect();
    const responseBounds = responseElement.getBoundingClientRect();
    if (!responseSourceElement.isConnected || responseSourceElement.getClientRects().length !== 1
      || responseSourceBounds.width <= 0 || responseSourceBounds.height <= 0
      || responseBounds.width <= 0 || responseBounds.height <= 0) return null;
    const responseWidth = responseBounds.width;
    const responseHeight = responseBounds.height;
    const countersRoot = action.response.countersRoot === true && action.rootEffectState === "BLOCKED";
    const responseSourceCenter = center(responseSourceRect);
    const responseTargetCenter = responseTargetRect ? center(responseTargetRect) : null;
    const targetsPlayer = Boolean(responseTargetCenter);
    const responseOrigin = countersRoot || targetsPlayer ? responseSourceCenter : sourceCenter;
    const responseDestination = countersRoot ? cardCenter : responseTargetCenter ?? targetCenter;
    const responseLineX = responseDestination.x - responseOrigin.x;
    const responseLineY = responseDestination.y - responseOrigin.y;
    const responseLineLength = Math.hypot(responseLineX, responseLineY) || 1;
    const responseNormal = { x: -responseLineY / responseLineLength, y: responseLineX / responseLineLength };
    const responseFraction = countersRoot || targetsPlayer ? .62 : .72;
    const responsePreferred = {
      x: responseOrigin.x + responseLineX * responseFraction,
      y: responseOrigin.y + responseLineY * responseFraction,
    };
    const responseObstacles = [...obstacles, card];
    const responseFractions = targetsPlayer ? [.3, .42, .52, .62, .72, .82, .9]
      : countersRoot ? [.48, .6, .72, .82] : [.64, .72, .8];
    const responseOffsets = targetsPlayer ? [0, -42, 42, -68, 68, -100, 100, -132, 132, -164, 164]
      : [0, -42, 42, -68, 68];
    const responseCandidates = responseFractions.flatMap((fraction) => responseOffsets.flatMap((offset) => {
      const candidate = {
        x: responseOrigin.x + responseLineX * fraction + responseNormal.x * offset,
        y: responseOrigin.y + responseLineY * fraction + responseNormal.y * offset,
      };
      const left = Math.max(tableRect.left + margin, Math.min(candidate.x - responseWidth / 2, tableRect.right - margin - responseWidth));
      const top = Math.max(tableRect.top + margin, Math.min(candidate.y - responseHeight / 2, tableRect.bottom - margin - responseHeight));
      const responseCard: Rect = { left, top, right: left + responseWidth, bottom: top + responseHeight, width: responseWidth, height: responseHeight };
      if (responseObstacles.some((obstacle) => overlaps(responseCard, obstacle, 8))) return [];
      const distance = Math.hypot(left + responseWidth / 2 - responsePreferred.x, top + responseHeight / 2 - responsePreferred.y);
      return [{ responseCard, score: distance + Math.abs(fraction - responseFraction) * 80 + Math.abs(offset) * .12 }];
    })).sort((left, right) => left.score - right.score);
    const responseCard = responseCandidates[0]?.responseCard;
    if (!responseCard) return null;
    const responseCenter = center(responseCard);
    const counterStart = targetsPlayer ? null : countersRoot ? rectangleEdge(responseCard, cardCenter) : rectangleEdge(card, responseCenter);
    const counterEnd = targetsPlayer ? null : countersRoot ? rectangleEdge(card, responseCenter) : rectangleEdge(responseCard, cardCenter);
    let blockPath: string | null = null;
    if (counterStart && counterEnd) {
      const counterLength = Math.hypot(counterEnd.x - counterStart.x, counterEnd.y - counterStart.y) || 1;
      const blockNormal = { x: -(counterEnd.y - counterStart.y) / counterLength, y: (counterEnd.x - counterStart.x) / counterLength };
      const blockHalf = 7;
      blockPath = `M ${(counterEnd.x - blockNormal.x * blockHalf).toFixed(1)} ${(counterEnd.y - blockNormal.y * blockHalf).toFixed(1)} L ${(counterEnd.x + blockNormal.x * blockHalf).toFixed(1)} ${(counterEnd.y + blockNormal.y * blockHalf).toFixed(1)}`;
    }
    const responseSourceStart = rectangleEdge(responseSourceRect, responseCenter);
    const responseSourceEnd = rectangleEdge(responseCard, responseSourceCenter);
    const responseTargetPath = responseTargetRect && responseTargetCenter
      ? pathBetween(rectangleEdge(responseCard, responseTargetCenter), rectangleEdge(responseTargetRect, responseCenter), Math.min(28, Math.hypot(responseTargetCenter.x - responseCenter.x, responseTargetCenter.y - responseCenter.y) * .045))
      : null;
    let targetPath: string | null = targetsPlayer
      ? pathBetween(rectangleEdge(card, targetCenter), rectangleEdge(targetRect, cardCenter), Math.min(34, lineLength * .05))
      : null;
    let targetBlockPath: string | null = null;
    if (countersRoot) {
      const targetStart = rectangleEdge(card, targetCenter);
      const targetEnd = rectangleEdge(targetRect, cardCenter);
      targetPath = pathBetween(targetStart, targetEnd, Math.min(34, lineLength * .05));
      const targetLength = Math.hypot(targetEnd.x - targetStart.x, targetEnd.y - targetStart.y) || 1;
      const targetNormal = { x: -(targetEnd.y - targetStart.y) / targetLength, y: (targetEnd.x - targetStart.x) / targetLength };
      const targetMiddle = { x: (targetStart.x + targetEnd.x) / 2, y: (targetStart.y + targetEnd.y) / 2 };
      const targetBlockHalf = 8;
      targetBlockPath = `M ${(targetMiddle.x - targetNormal.x * targetBlockHalf).toFixed(1)} ${(targetMiddle.y - targetNormal.y * targetBlockHalf).toFixed(1)} L ${(targetMiddle.x + targetNormal.x * targetBlockHalf).toFixed(1)} ${(targetMiddle.y + targetNormal.y * targetBlockHalf).toFixed(1)}`;
    }
    return {
      width: shellBounds.width,
      height: shellBounds.height,
      card,
      sourcePath: pathBetween(sourceStart, sourceEnd, Math.min(24, lineLength * .035)),
      targetPath,
      responseTargetPath,
      targetBlockPath,
      responseCard,
      responseSourcePath: pathBetween(responseSourceStart, responseSourceEnd, Math.min(20, lineLength * .025)),
      counterPath: counterStart && counterEnd ? pathBetween(counterStart, counterEnd, 0) : null,
      blockPath,
      responseCards: [],
      responseSourcePaths: [],
      responseCounterPaths: [],
      selfHalo: null,
    };
  }
  const targetStart = rectangleEdge(card, targetCenter);
  const targetEnd = rectangleEdge(targetRect, cardCenter);
  return {
    width: shellBounds.width,
    height: shellBounds.height,
    card,
    sourcePath: pathBetween(sourceStart, sourceEnd, Math.min(24, lineLength * .035)),
    targetPath: pathBetween(targetStart, targetEnd, Math.min(34, lineLength * .05)),
    responseTargetPath: null,
    targetBlockPath: null,
    responseCard: null,
    responseSourcePath: null,
    counterPath: null,
    blockPath: null,
    responseCards: [],
    responseSourcePaths: [],
    responseCounterPaths: [],
    selfHalo: null,
  };
}

export function interactionRootActionKey(action: PresentationSnapshotRootAction): string {
  return [action.interactionId, action.rootFrameId, action.checkpointId, action.presentationRevision, action.rootEventId, action.sourceId, action.targetId].join(":");
}

export function InteractionRootOverlay({
  action,
  enabled,
  sourceName,
  targetName,
  onReadyChange,
}: {
  action: InteractionRootOverlayAction | null;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  onReadyChange: (key: string | null) => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const responseCardRef = useRef<HTMLDivElement>(null);
  const stableRootPlacementRef = useRef<{ rootEventId: string; width: number; height: number; card: Rect } | null>(null);
  const [layout, setLayout] = useState<RootActionLayout | null>(null);
  const key = action?.key ?? null;
  const sourceId = action?.sourceId ?? null;
  const targetId = action?.targetId ?? null;
  const mode = action?.mode ?? null;
  const responseActorId = action?.response?.actorId ?? null;
  const responseTargetId = action?.response?.targetId ?? null;
  const responseCountersRoot = action?.response?.countersRoot === true;
  const responseTargetsPlayer = Boolean(responseTargetId);
  const markerId = key ? `root-target-arrow-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}` : "root-target-arrow";
  const counterMarkerId = key ? `root-counter-arrow-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}` : "root-counter-arrow";

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const card = cardRef.current;
    const responseCard = responseActorId ? responseCardRef.current : null;
    const shell = layer?.closest<HTMLElement>(".game-shell");
    if (!enabled || !sourceId || !targetId || !key || !layer || !card || !shell) {
      setLayout(null);
      onReadyChange(null);
      return;
    }

    const measure = () => {
      const responseElements = action?.responses?.length
        ? Array.from(layer.querySelectorAll<HTMLElement>("[data-root-action-response-node]"))
        : responseCard ? [responseCard] : [];
      const shellBounds = shell.getBoundingClientRect();
      const rememberedRoot = stableRootPlacementRef.current;
      const preferredRootCard = rememberedRoot?.rootEventId === action?.rootEventId
        && Math.abs(rememberedRoot.width - shellBounds.width) < .5
        && Math.abs(rememberedRoot.height - shellBounds.height) < .5
        ? rememberedRoot.card
        : null;
      const nextLayout = layoutRootAction(shell, card, responseCard, responseElements, {
        sourceId,
        targetId,
        mode: mode ?? "targeted",
        rootEffectState: action?.rootEffectState,
        response: action?.response,
        responses: action?.responses,
      }, preferredRootCard);
      if (nextLayout && action?.rootEventId) stableRootPlacementRef.current = {
        rootEventId: action.rootEventId,
        width: nextLayout.width,
        height: nextLayout.height,
        card: nextLayout.card,
      };
      setLayout((current) => {
        if (!nextLayout || !current) return nextLayout;
        const unchanged = Math.abs(current.width - nextLayout.width) < .5
          && Math.abs(current.height - nextLayout.height) < .5
          && Math.abs(current.card.left - nextLayout.card.left) < .5
          && Math.abs(current.card.top - nextLayout.card.top) < .5
          && current.sourcePath === nextLayout.sourcePath && current.targetPath === nextLayout.targetPath
          && current.responseTargetPath === nextLayout.responseTargetPath
          && current.targetBlockPath === nextLayout.targetBlockPath
          && JSON.stringify(current.responseCard) === JSON.stringify(nextLayout.responseCard)
          && current.responseSourcePath === nextLayout.responseSourcePath
          && current.counterPath === nextLayout.counterPath && current.blockPath === nextLayout.blockPath
          && JSON.stringify(current.responseCards) === JSON.stringify(nextLayout.responseCards)
          && JSON.stringify(current.responseSourcePaths) === JSON.stringify(nextLayout.responseSourcePaths)
          && JSON.stringify(current.responseCounterPaths) === JSON.stringify(nextLayout.responseCounterPaths)
          && JSON.stringify(current.selfHalo) === JSON.stringify(nextLayout.selfHalo);
        return unchanged ? current : nextLayout;
      });
      onReadyChange(nextLayout ? key : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    const table = shell.querySelector<HTMLElement>(".play-table");
    if (table) observer.observe(table);
    shell.querySelectorAll<HTMLElement>("[data-player-anchor], .play-center, .stage-system-cluster").forEach((element) => observer.observe(element));
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      onReadyChange(null);
    };
  }, [action, enabled, key, mode, onReadyChange, responseActorId, responseTargetId, sourceId, targetId]);

  if (!action) return null;
  const visible = enabled && Boolean(layout) && Boolean(sourceName && (action.mode === "self-target" || targetName));
  const responseChainRootBlocked = Boolean(action.responses?.length && action.rootEffectState === "BLOCKED");
  return <div
    ref={layerRef}
    className="interaction-root-overlay"
    data-root-action-overlay="true"
    data-root-action-enabled={enabled ? "true" : "false"}
    data-root-action-ready={visible ? "true" : "false"}
    data-root-action-event-id={action.rootEventId}
    data-root-action-source-id={action.sourceId}
    data-root-action-target-id={action.targetId}
    data-root-action-mode={action.mode}
    data-root-effect-state={action.rootEffectState ?? undefined}
    aria-hidden={!visible}
    style={{ visibility: visible ? "visible" : "hidden" }}
  >
    {layout && <svg className="interaction-root-connectors" width="100%" height="100%" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0 0 L8 4 L0 8 Z" />
        </marker>
        <marker id={counterMarkerId} markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0 0 L8 4 L0 8 Z" />
        </marker>
      </defs>
      {layout.selfHalo && <rect
        className="interaction-root-self-target-halo"
        data-root-action-self-target-halo="true"
        x={layout.selfHalo.left}
        y={layout.selfHalo.top}
        width={layout.selfHalo.width}
        height={layout.selfHalo.height}
        rx="7"
      />}
      <path className="interaction-root-source-tether" data-root-action-edge="source" d={layout.sourcePath} />
      {layout.targetPath && <path className={responseTargetsPlayer ? "interaction-root-target-context" : responseCountersRoot || responseChainRootBlocked ? "interaction-root-target-subdued" : "interaction-root-target-arrow"} data-root-action-edge={responseTargetsPlayer ? "root-target-context" : responseCountersRoot || responseChainRootBlocked ? "root-target-blocked" : "target"} data-root-action-target-state={responseTargetsPlayer ? "context" : responseCountersRoot || responseChainRootBlocked ? "blocked" : "active"} d={layout.targetPath} markerEnd={responseCountersRoot || responseChainRootBlocked ? undefined : `url(#${markerId})`} />}
      {layout.targetBlockPath && <path className="interaction-root-block-mark interaction-root-target-block-mark" data-root-action-root-blocked="true" d={layout.targetBlockPath} />}
      {layout.counterPath && <path className={responseCountersRoot ? "interaction-root-counter-relation interaction-root-negation-counter" : "interaction-root-counter-relation"} data-root-action-edge={responseCountersRoot ? "negation-counters-root" : "target-blocked"} d={layout.counterPath} markerEnd={responseCountersRoot ? `url(#${counterMarkerId})` : undefined} />}
      {layout.blockPath && <path className="interaction-root-block-mark" data-root-action-blocked="true" d={layout.blockPath} />}
      {layout.responseSourcePath && <path className="interaction-root-response-source-tether" data-root-action-edge="response-source" data-response-actor-id={responseActorId ?? undefined} d={layout.responseSourcePath} />}
      {layout.responseTargetPath && <path
        className="interaction-root-response-target-arrow"
        data-root-action-edge="duel-response-target"
        data-response-semantic-source-id={action.response?.decisionActorId}
        data-response-target-id={responseTargetId ?? undefined}
        d={layout.responseTargetPath}
        markerEnd={`url(#${markerId})`}
      />}
      {layout.responseSourcePaths.map((path, index) => <path
        key={`response-source-${index}`}
        className="interaction-root-response-source-tether"
        data-root-action-edge="response-source"
        data-response-node-index={index}
        d={path}
      />)}
      {layout.responseCounterPaths.map((path, index) => {
        const counterTarget = action.responses?.[index]?.counterTarget;
        const active = index === (action.responses?.length ?? 0) - 1;
        return <path
          key={`response-counter-${index}`}
          className={`interaction-root-counter-relation interaction-root-negation-counter${active ? "" : " is-subdued"}`}
          data-root-action-edge={counterTarget?.kind === "ROOT" ? "negation-counters-root" : "negation-counters-response"}
          data-response-node-index={index}
          data-response-active={active ? "true" : "false"}
          data-counter-target-index={counterTarget?.kind === "RESPONSE" ? counterTarget.index : undefined}
          d={path}
          markerEnd={`url(#${counterMarkerId})`}
        />;
      })}
    </svg>}
    <div
      ref={cardRef}
      className={`interaction-root-action-card${action.rootEffectState === "BLOCKED" ? " is-blocked" : ""}${responseTargetsPlayer ? " is-contextual" : ""}`}
      data-root-action-card="true"
      data-root-action-card-kind={action.cardKind}
      data-root-action-compact-root={action.compactRoot ? "true" : undefined}
      data-root-action-contextual={responseTargetsPlayer ? "true" : undefined}
      data-root-effect-state={action.rootEffectState ?? undefined}
      role="img"
      aria-label={action.ariaLabel}
      style={layout ? { left: layout.card.left, top: layout.card.top, transform: "none" } : undefined}
    >
      <small>{action.rootEffectState === "BLOCKED" ? "BLOCKED EFFECT" : "ROOT ACTION"}</small>
      <strong>{action.cardLabel}</strong>
    </div>
    {action.response && <div
      ref={responseCardRef}
      className={`interaction-root-action-card interaction-root-response-card${responseTargetsPlayer ? " is-active" : ""}`}
      data-root-action-response-card="true"
      data-response-event-id={action.response.eventId}
      data-response-actor-id={action.response.actorId}
      data-response-decision-actor-id={action.response.decisionActorId ?? undefined}
      data-response-target-id={action.response.targetId ?? undefined}
      data-response-relation={action.response.targetId ? "TARGETS_PLAYER" : action.response.countersRoot ? "COUNTERS_ROOT" : undefined}
      role="img"
      aria-label={action.response.ariaLabel}
      style={layout?.responseCard ? { left: layout.responseCard.left, top: layout.responseCard.top, transform: "none" } : undefined}
    >
      <small>{action.response.targetId || action.response.countersRoot ? `FROM ${action.response.actorName}` : "BLOCKED"}</small>
      <strong>{action.response.cardLabel}</strong>
    </div>}
    {action.responses?.map((response, index) => {
      const active = index === action.responses!.length - 1;
      const box = layout?.responseCards[index];
      return <div
        key={response.eventId}
        className={`interaction-root-action-card interaction-root-response-card${active ? " is-active" : " is-subdued"}`}
        data-root-action-response-card="true"
        data-root-action-response-node="true"
        data-response-node-index={index}
        data-response-event-id={response.eventId}
        data-response-actor-id={response.actorId}
        data-response-active={active ? "true" : "false"}
        data-response-relation={response.counterTarget.kind === "ROOT" ? "COUNTERS_ROOT" : "COUNTERS_RESPONSE"}
        data-counter-target-index={response.counterTarget.kind === "RESPONSE" ? response.counterTarget.index : undefined}
        role="img"
        aria-label={response.ariaLabel}
        style={box ? { left: box.left, top: box.top, transform: "none" } : undefined}
      >
        <small>{response.actorName}</small>
        <strong>{response.cardLabel}</strong>
      </div>;
    })}
  </div>;
}
