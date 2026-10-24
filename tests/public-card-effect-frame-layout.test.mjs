import test from "node:test";
import assert from "node:assert/strict";
import { publicCardEffectFrameLayout } from "../game/public-card-effect-frame-layout.ts";

test("one-card public effect frames preserve the accepted phone reveal geometry", () => {
  for (const [width, height] of [[390, 700], [390, 844], [440, 766], [440, 894], [480, 900]]) {
    const layout = publicCardEffectFrameLayout(1, width, height);
    assert.deepEqual(
      [layout.frameWidth, layout.frameHeight, layout.cardWidth, layout.cardHeight, layout.cardOffsetLeft, layout.cardOffsetTop],
      [168, 190, 90, 135, 39, 43],
    );
  }
});

test("two and many-card frames stay within short and tall phone viewports", () => {
  for (const [width, height] of [[320, 568], [390, 700], [390, 844], [440, 766], [440, 894], [480, 900]]) {
    for (const count of [2, 3, 5, 8, 12]) {
      const layout = publicCardEffectFrameLayout(count, width, height);
      assert.ok(layout.frameWidth <= width - 16 + 0.001, `${count} cards exceed ${width}×${height}: ${layout.frameWidth}px`);
      assert.ok(layout.frameHeight <= Math.min(480, height - 220) + 0.001,
        `${count} cards exceed vertical allowance at ${width}×${height}: ${layout.frameHeight}px`);
      assert.equal(layout.columns * layout.rows >= count, true);
      assert.ok(layout.cardWidth > 0);
      assert.ok(Math.abs(layout.cardHeight / layout.cardWidth - 1.5) < 0.001);
      assert.ok(layout.cardOffsetLeft >= 0);
      assert.ok(layout.cardOffsetTop >= 0);
    }
  }
});
