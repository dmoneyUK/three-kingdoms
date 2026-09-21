import type { ResponsePending } from "./pending";

/** The character on whose behalf a semantic response is being made. */
export function semanticResponseActor(response: ResponsePending) {
  return response.delegation?.requesterId ?? response.actorId;
}

/** The character whose cards/equipment pay for the semantic response. */
export function responseCostActor(response: ResponsePending) {
  return response.actorId;
}
