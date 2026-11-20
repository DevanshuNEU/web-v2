/** The desktop controls line, naming only the moves she has. */
export function keyboardHint(owned: { attack?: boolean; dash?: boolean }): string {
  const extra = [owned.attack ? 'Z to attack' : '', owned.dash ? 'X to dash' : ''].filter(Boolean).join(', ');
  return `Arrows to run. Space to jump, again in the air to double jump.${extra ? ` ${extra}.` : ''} P pauses.`;
}
