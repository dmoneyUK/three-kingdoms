import type { Hero } from "./player-types";

export const HERO_ART_BY_ID: Record<string, string> = {
  "cao-cao": "/hero-cao-cao.jpg",
  "liu-bei": "/hero-liu-bei.jpg",
  "sun-quan": "/hero-sun-quan.jpg",
  "simayi": "/hero-sima-yi.jpg",
  "xiahou-dun": "/hero-xiahou-dun.jpg",
  "zhang-liao": "/hero-zhang-liao.jpg",
  "zhang-fei": "/hero-zhang-fei.jpg",
  "zhen-ji": "/hero-zhen-ji.jpg",
  "xu-chu": "/hero-xu-chu.jpg",
  "guo-jia": "/hero-guo-jia.jpg",
  "yue-jin": "/hero-yue-jin.jpg",
  "gongsun-zan": "/hero-gongsun-zan.jpg",
  "ma-chao": "/hero-ma-chao.jpg",
  "daqiao": "/hero-daqiao.jpg",
  "zhuge-liang": "/hero-zhuge-liang.jpg",
  "zhao-yun": "/hero-zhao-yun.jpg",
  "guan-yu": "/hero-guan-yu.jpg",
  "gan-ning": "/hero-gan-ning.jpg",
  "huang-gai": "/hero-huang-gai.jpg",
  "lü-meng": "/hero-lv-meng.jpg",
  "lady-gan": "/hero-lady-gan.jpg",
  "huang-yueying": "/hero-huang-yueying.jpg",
  "zhou-yu": "/hero-zhou-yu.jpg",
  "diao-chan": "/hero-diao-chan.jpg",
  "lü-bu": "/hero-lv-bu.jpg",
  "hua-tuo": "/hero-hua-tuo.jpg",
  huaxiong: "/hero-hua-xiong.jpg",
  "sun-shangxiang": "/hero-sun-shangxiang.jpg",
  "lu-xun": "/hero-lu-xun.jpg",
  "pan-feng": "/hero-pan-feng.jpg",
};

export function HeroPortrait({ hero }: { hero: Pick<Hero, "id" | "name"> }) {
  const initials = hero.name.split(" ").map((part) => part[0]).join("");
  const art = HERO_ART_BY_ID[hero.id];
  if (!art) return <span className="hero-art-fallback" data-hero-art-id={hero.id} aria-hidden="true">{initials}</span>;
  // Static public artwork is intentionally rendered directly so the same path
  // works in the Worker-backed build and in server-rendered test fixtures.
  // eslint-disable-next-line @next/next/no-img-element -- static local hero artwork
  return <img className="hero-art-image" data-hero-art-id={hero.id} src={art} alt="" aria-hidden="true" />;
}
