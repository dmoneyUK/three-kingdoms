import { useCallback, useRef, useSyncExternalStore } from "react";
import type { RoomSessionRoom, RoomSessionView } from "./room-command-gateway";

type Listener = () => void;

function sameView(left: RoomSessionView | null, right: RoomSessionView): boolean {
  return Boolean(left
    && left.roomCode === right.roomCode
    && left.viewerId === right.viewerId
    && left.epoch === right.epoch
    && left.active === right.active);
}

/**
 * Immutable publication boundary for the private Room projection owned by one
 * mounted Home. The Gateway is the only caller that should publish snapshots.
 */
export class RoomSessionStore<TRoom extends RoomSessionRoom> {
  private snapshot: TRoom | null = null;
  private view: RoomSessionView | null = null;
  private readonly listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): TRoom | null => this.snapshot;

  getServerSnapshot = (): TRoom | null => this.snapshot;

  /** Advance session identity and wipe the previous viewer's private snapshot. */
  setSession(view: RoomSessionView): boolean {
    if (sameView(this.view, view)) return false;
    this.view = Object.freeze({ ...view });
    this.clearSnapshot();
    return true;
  }

  /** Publish only a room matching the currently selected active session. */
  publish(room: TRoom): boolean {
    const view = this.view;
    if (!view?.active || !view.viewerId || view.roomCode !== room.code || view.viewerId !== room.meId) return false;
    if (this.snapshot === room) return true;
    this.snapshot = room;
    this.emit();
    return true;
  }

  private clearSnapshot(): boolean {
    if (this.snapshot === null) return false;
    this.snapshot = null;
    this.emit();
    return true;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export function createRoomSessionSelector<TRoom extends RoomSessionRoom, TSelection>(
  selector: (room: TRoom | null) => TSelection,
  isEqual: (previous: TSelection, next: TSelection) => boolean = Object.is,
): (room: TRoom | null) => TSelection {
  let hasValue = false;
  let value: TSelection | undefined;
  return (room) => {
    const next = selector(room);
    if (hasValue && isEqual(value as TSelection, next)) return value as TSelection;
    hasValue = true;
    value = next;
    return next;
  };
}

/**
 * Subscribe to a narrow projection while retaining its reference when the
 * selected facts are unchanged across a newly published Room object.
 */
export function useRoomSessionSelector<TRoom extends RoomSessionRoom, TSelection>(
  store: RoomSessionStore<TRoom>,
  selector: (room: TRoom | null) => TSelection,
  isEqual: (previous: TSelection, next: TSelection) => boolean = Object.is,
): TSelection {
  const cache = useRef<{ hasValue: boolean; value: TSelection | undefined }>({ hasValue: false, value: undefined });
  const selectStable = useCallback((room: TRoom | null) => {
    const next = selector(room);
    const previous = cache.current;
    if (previous.hasValue && isEqual(previous.value as TSelection, next)) return previous.value as TSelection;
    cache.current = { hasValue: true, value: next };
    return next;
  }, [isEqual, selector]);
  const getSnapshot = useCallback(() => selectStable(store.getSnapshot()), [selectStable, store]);
  const getServerSnapshot = useCallback(() => selectStable(store.getServerSnapshot()), [selectStable, store]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot);
}
