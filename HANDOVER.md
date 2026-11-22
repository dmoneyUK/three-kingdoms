# HANDOVER — UX2 §10.68 shared card rank and suit readability

**Design reviewed** `f1679fb40d9d386d87bbc7ae213bc0ad7e8fcd18`, §10.68.
**Status** Implementation ready for joint CI and deployment. Owner iPhone review pending.

The shared rank/suit badge now gives Hand cards 15/12px marks, 50×75 minis 11/9px marks, and narrow physical minis compact readable marks. True card identity and existing card frames are preserved.

Local build and one 440×894 Chromium Stargazing scenario passed. It measured the Hand Attack, public Equipment selector and private Stargazing marks, including 10♣ and both suit colors. Updated the existing public Harvest history regression to assert readable marks within the same 32×48 face. That specific browser scenario was not run locally.

Joint delivery includes §10.67 implementation `916afcd432361223d474d9dc157c2dde96a2a87e` (focused 440×894 check passed). Push, exact-SHA CI, deployment and production smoke are pending.
