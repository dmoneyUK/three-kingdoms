/** Pure HP and Dying rules shared by every damage/rescue transition. */
export function applyDamage(hp, amount) {
  return hp - amount;
}

export function isDying(hp) {
  return hp <= 0;
}

export function applyRecovery(hp, amount = 1, maxHp = Infinity) {
  return Math.min(maxHp, hp + amount);
}

export function recoveredAmount(hp, maxHp, amount = 1) {
  return Math.max(0, applyRecovery(hp, amount, maxHp) - hp);
}

export function recoveryNeeded(hp) {
  return Math.max(0, 1 - hp);
}
