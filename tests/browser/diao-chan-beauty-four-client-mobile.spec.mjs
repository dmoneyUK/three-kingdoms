import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const MOBILE_VIEWPORTS = [
  { width: 390, height: 700 },
  { width: 390, height: 844 },
  { width: 440, height: 766 },
  { width: 480, height: 900 },
];
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedBeautyRoom(request) {
  const privateDraw = { ...card("Peach", "beauty-private-qh-physical-card", "♥"), rank: "Q" };
  const followupAttack = card("Attack", "beauty-followup-public-attack", "♦");
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "DIAO CHAN", role: "Lord", hero: "diao-chan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOLLOWUP", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [followupAttack] },
        { name: "THIRD", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      ],
      deck: [privateDraw],
    },
  });
  if (!response.ok()) throw new Error(`Beauty room seed failed: ${await response.text()}`);
  return { ...(await response.json()), privateDraw, followupAttack };
}

async function openMobileViewer(page, room, index) {
  const member = room.players[index];
  await page.setViewportSize(MOBILE_VIEWPORTS[index]);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${member.id}"]`)).toBeVisible();
}

async function readViewer(request, room, index) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("Beauty's public result stays identical and its drawn Q♥ stays owner-private across four mobile clients", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const room = await seedBeautyRoom(request);
  const contexts = await Promise.all(MOBILE_VIEWPORTS.map((viewport) => browser.newContext({
    viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  try {
    await Promise.all(pages.map((page, index) => openMobileViewer(page, room, index)));
    expect(new Set(room.players.map(({ token }) => token)).size).toBe(4);
    const initialViews = await Promise.all(room.players.map((_, index) => readViewer(request, room, index)));
    expect(initialViews.map((view) => view.meId)).toEqual(room.players.map(({ id }) => id));

    const owner = pages[0];
    const dock = owner.locator(`.local-player-dock[data-player-anchor="${room.players[0].id}"]`);
    const endTurn = dock.locator('[data-action-slot="decline"] button').getByText("End", { exact: true });
    const endedResponse = owner.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "end_turn");
    await endTurn.click();
    expect((await endedResponse).ok()).toBeTruthy();

    const beauty = dock.locator(".local-hero-skills").getByRole("button", { name: "Beauty Outshining the Moon", exact: true });
    await expect(beauty).toBeEnabled({ timeout: 10_000 });
    const acceptedResponse = owner.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "diao_chan_beauty_outshining_moon");
    await beauty.click();
    const accepted = await acceptedResponse;
    expect(accepted.ok()).toBeTruthy();
    expect((await accepted.json()).room.myHand.map((held) => held.id)).toContain(room.privateDraw.id);

    const announcementSelector = "[data-public-skill-event-announcement='true']";
    await Promise.all(pages.map(async (page) => {
      const announcement = page.locator(announcementSelector);
      await expect(announcement).toHaveCount(1, { timeout: 20_000 });
      await expect(announcement.locator(".public-event-announcement-heading")).toHaveText("BEAUTY");
      await expect(announcement.locator("b[aria-label]")).toHaveAttribute("aria-label", "DIAO CHAN used Beauty and drew 1 card.");
      await expect(announcement.locator(".played-card")).toHaveCount(0);
      await expect(announcement).toHaveAttribute("data-public-event-semantics", "PROVEN");
      await expect(announcement).toHaveAttribute("data-public-event-phase", "DRAWN");
    }));
    const clientEvidence = await Promise.all(pages.map(async (page) => {
      const evidence = await page.evaluate(({ hiddenId }) => {
        const announcement = document.querySelector("[data-public-skill-event-announcement='true'] [data-public-card-announcement='true']");
        const privateStage = document.querySelector(".private-draw-stage");
        const privateContent = document.querySelector(".private-draw-content");
        const table = document.querySelector(".play-table");
        const rect = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
        };
        const announcementRect = rect(announcement);
        const announcementProtectedOverlaps = [...document.querySelectorAll(
          ".opponent-player-card, .public-activity-chip, .stage-system-cluster, .console-guidance, .local-hand-rail",
        )].filter((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0 && announcementRect
            && announcementRect.left < bounds.right && announcementRect.right > bounds.left
            && announcementRect.top < bounds.bottom && announcementRect.bottom > bounds.top;
        }).map((element) => typeof element.className === "string" ? element.className : element.tagName);
        return {
          viewerId: document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null,
          announcementHeading: announcement?.querySelector(".public-event-announcement-heading")?.textContent?.trim() ?? null,
          announcementText: announcement?.querySelector("b[aria-label]")?.getAttribute("aria-label") ?? null,
          announcementRect,
          announcementProtectedOverlaps,
          announcementVisibility: announcement ? getComputedStyle(announcement).visibility : null,
          announcementFallback: announcement?.getAttribute("data-public-card-announcement-fallback") ?? null,
          announcementPositioned: announcement?.getAttribute("data-public-card-announcement-positioned") ?? null,
          layoutPending: announcement?.closest(".public-card-display")?.getAttribute("data-public-card-layout-pending") ?? null,
          tableRect: rect(table),
          privateDrawRect: rect(privateStage),
          privateContentRect: rect(privateContent),
          timerRect: rect(document.querySelector(".stage-system-cluster")),
          seatRects: [...document.querySelectorAll(".opponent-player-card")].map(rect),
          privateDrawCount: document.querySelectorAll(".private-draw-stage").length,
          hiddenIdInDom: document.documentElement.innerHTML.includes(hiddenId),
          playedCardsInPublicAnnouncement: announcement?.querySelectorAll(".played-card").length ?? 0,
        };
      }, { hiddenId: room.privateDraw.id });
      return evidence;
    }));
    for (const [index, evidence] of clientEvidence.entries()) {
      expect(evidence.viewerId).toBe(room.players[index].id);
      expect(evidence.announcementHeading).toBe("BEAUTY");
      expect(evidence.announcementText).toBe("DIAO CHAN used Beauty and drew 1 card.");
      expect(evidence.announcementRect).toBeTruthy();
      expect(evidence.tableRect).toBeTruthy();
      expect(evidence.announcementRect.top).toBeGreaterThanOrEqual(Math.max(...evidence.seatRects.map((seat) => seat.bottom)));
      const announcementCenter = (evidence.announcementRect.left + evidence.announcementRect.right) / 2;
      const tableCenter = (evidence.tableRect.left + evidence.tableRect.right) / 2;
      expect(Math.abs(announcementCenter - tableCenter)).toBeLessThanOrEqual(12);
      expect(evidence.announcementProtectedOverlaps).toEqual([]);
      expect(evidence.playedCardsInPublicAnnouncement).toBe(0);
      if (index === 0) {
        expect(evidence.privateDrawCount).toBe(1);
        expect(evidence.privateDrawRect).toBeTruthy();
        expect(evidence.announcementRect.bottom).toBeLessThanOrEqual(evidence.privateContentRect.top - 8);
        expect(evidence.hiddenIdInDom).toBe(true);
      } else {
        expect(evidence.privateDrawCount).toBe(0);
        expect(evidence.hiddenIdInDom).toBe(false);
      }
      expect(evidence.announcementVisibility,
        `Beauty placement failed in mobile viewport ${JSON.stringify(MOBILE_VIEWPORTS[index])}: ${JSON.stringify(evidence)}`)
        .toBe("visible");
    }
    expect(clientEvidence.map(({ announcementHeading, announcementText }) => `${announcementHeading}\n${announcementText}`))
      .toEqual(Array(4).fill("BEAUTY\nDIAO CHAN used Beauty and drew 1 card."));

    const viewerStates = await Promise.all(room.players.map((_, index) => readViewer(request, room, index)));
    const publicProof = viewerStates[0].presentationSnapshot.diaoChanSkillNotices;
    expect(publicProof.map((notice) => notice.notice)).toEqual(["ACTIVATION", "DRAWN"]);
    expect(publicProof.find((notice) => notice.notice === "DRAWN").drawCount).toBe(1);
    for (const [index, state] of viewerStates.entries()) {
      expect(state.presentationSnapshot.diaoChanSkillNotices).toEqual(publicProof);
      expect(state.players.find((player) => player.id === room.players[0].id).handCount).toBe(1);
      if (index === 0) {
        expect(state.myHand.map((held) => held.id)).toContain(room.privateDraw.id);
      } else {
        expect(state.myHand.some((held) => held.id === room.privateDraw.id)).toBe(false);
        expect(JSON.stringify(state)).not.toContain(room.privateDraw.id);
      }
    }

    await pages[0].screenshot({ path: testInfo.outputPath("beauty-owner-390x700.png"), fullPage: false });
    await pages[2].screenshot({ path: testInfo.outputPath("beauty-observer-440x766.png"), fullPage: false });

    // Refresh a viewer after the proof is public: replaying the room must not
    // enqueue a second transient Beauty announcement.
    await pages[3].reload();
    await expect(pages[3].locator(".game-shell")).toBeVisible();
    await expect(pages[3].locator(announcementSelector)).toHaveCount(0);

    // The next player's genuine Attack is a newer public event. It must not
    // cause the already-settled Beauty result to reappear.
    await expect.poll(async () => {
      const state = await readViewer(request, room, 1);
      return { phase: state.phase, actorId: state.currentAction?.actorId ?? state.actionPlayerId };
    }, { timeout: 15_000 }).toEqual({ phase: "play", actorId: room.players[1].id });
    const followup = await request.post(`${API}/api/rooms`, { data: {
      action: "play_card",
      code: room.code,
      token: room.players[1].token,
      cardId: room.followupAttack.id,
      targetId: room.players[2].id,
    } });
    expect(followup.ok(), await followup.text()).toBeTruthy();
    await Promise.all(pages.map(async (page) => {
      await expect(page.locator('[data-public-card-display="true"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(announcementSelector)).toHaveCount(0);
    }));
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
