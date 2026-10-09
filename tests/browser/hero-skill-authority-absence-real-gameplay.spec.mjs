import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

const skillRows = [
  { hero: "cao-cao", skills: [["Treachery", ["cao_cao_jianxiong"]], ["Entourage", ["cao_cao_hujia"]]] },
  { hero: "simayi", skills: [["Retaliation", ["sima_yi_fankui"]], ["Necromancy", ["sima_yi_guicai"]]] },
  { hero: "xiahou-dun", skills: [["Stauchness", ["xiahou_dun_ganglie"]]] },
  { hero: "zhang-liao", skills: [["Assault", ["zhang_liao_assault"]]] },
  { hero: "xu-chu", skills: [["Bared Bodied", ["xu_chu_bared_bodied"]]] },
  { hero: "ma-chao", skills: [["Cavalry", ["ma_chao_cavalry"]]] },
  { hero: "guo-jia", skills: [["Jealousy of God", ["guo_jia_jealousy_of_god"]], ["Legacy", ["guo_jia_legacy"]]] },
  { hero: "zhen-ji", skills: [["Godess of Luo River", ["zhen_ji_luoshen"]], ["Empress Dowager", ["zhen_ji_black_card_dodge"]]] },
  { hero: "liu-bei", skills: [["Benevolence", ["liu_bei_rende"]], ["Influencing", ["liu_bei_jijiang"]]] },
  { hero: "sun-quan", skills: [["Equilibrium", ["sun_quan_zhiheng"]]] },
  { hero: "gan-ning", skills: [["Ambushment", ["gan_ning_qixi"]]] },
  { hero: "lü-meng", skills: [["Composure", ["lu_meng_keji"]]] },
  { hero: "yue-jin", skills: [["Dauntless", ["yue_jin_dauntless"]]] },
  { hero: "zhou-yu", skills: [["Heroic", ["zhou_yu_yingzi"]], ["Sowing Distrust", ["zhou_yu_fanjian"]]] },
  { hero: "lu-xun", skills: [["Second Wind", ["lu_xun_second_wind"]]] },
  { hero: "daqiao", skills: [["Captivating", ["daqiao_captivating"]], ["Deflection", ["daqiao_deflection"]]] },
  { hero: "diao-chan", skills: [["Lust", ["diao_chan_lust"]], ["Beauty Outshining the Moon", ["diao_chan_beauty_outshining_moon"]]] },
  { hero: "hua-tuo", skills: [["Prodigal Healer", ["hua_tuo_prodigal_healer"]], ["First Aid", ["hua_tuo_first_aid"]]] },
  { hero: "sun-shangxiang", skills: [["Betrothment", ["sun_shangxiang_betrothment"]], ["Daredevil", ["sun_shangxiang_daredevil"]]] },
  { hero: "huang-yueying", skills: [["Cultivation", ["huang_yueying_cultivation"]]] },
  { hero: "huang-gai", skills: [["Self Sacrifice", ["huang_gai_kurou"]]] },
  { hero: "zhuge-liang", skills: [["Stargazing", ["zhuge_liang_stargazing"]]] },
  { hero: "lady-gan", skills: [["Divine Wisdom", ["lady_gan_divine_wisdom"]], ["Prudence", ["lady_gan_prudence"]]] },
  { hero: "guan-yu", skills: [["God of War", ["guan_yu_red_card_attack"]]] },
  { hero: "zhao-yun", skills: [["Braveheart", ["zhao_yun_dodge_as_attack", "zhao_yun_attack_as_dodge"]]] },
];

async function seedWithoutSkillAuthority(request, scenario, index) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "ACTIVE PLAYER", role: "Lord", hero: "pan-feng", hp: 4, maxHp: 4, hand: [] },
        { name: `SKILL USER ${index}`, role: "Loyalist", hero: scenario.hero, hp: 4, maxHp: 4, hand: [] },
        { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`${scenario.hero} skill room seed failed: ${await response.text()}`);
  return response.json();
}

async function project(request, seed, user) {
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${user.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openViewer(page, seed, user) {
  const session = { code: seed.code, token: user.token, name: user.name };
  if (!page.url().startsWith(API)) await page.goto(`${API}/`);
  await page.evaluate((value) => localStorage.setItem("three-realms-session", JSON.stringify(value)), session);
  await page.reload();
  await expect(page.locator(".game-shell")).toBeVisible();
}

test("real non-actor CurrentAction keeps every mapped Hero skill unavailable without its provider", async ({ page, request }) => {
  test.setTimeout(120_000);

  for (const [index, scenario] of skillRows.entries()) {
    const seed = await seedWithoutSkillAuthority(request, scenario, index);
    const user = seed.players[1];
    const room = await project(request, seed, user);
    expect(room.currentAction).toMatchObject({ kind: "turn", actorId: seed.players[0].id });
    expect(room.currentAction.actorId).not.toBe(user.id);

    const offeredIds = [
      ...(room.currentAction.triggerOptions ?? []).map((option) => option.effectId),
      ...(room.currentAction.options ?? []).map((option) => option.providerId),
    ];
    for (const [label, providerIds] of scenario.skills) {
      for (const providerId of providerIds) expect(offeredIds, `${scenario.hero}/${label} must have no real CurrentAction provider`).not.toContain(providerId);
    }

    await openViewer(page, seed, user);
    const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
    for (const [label] of scenario.skills) {
      const skill = dock.locator(".local-hero-skills").getByRole("button", { name: label, exact: true });
      await expect(skill, `${scenario.hero}/${label} remains stable in the real Skills band`).toBeVisible();
      await expect(skill, `${scenario.hero}/${label} is unavailable without CurrentAction authority`).toBeDisabled();
      await expect(dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })).toHaveCount(0);
    }
  }
});
