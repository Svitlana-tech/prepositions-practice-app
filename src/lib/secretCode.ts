import { createHash, randomInt } from "node:crypto";

/**
 * Secret codes like "BLUE-TIGER-4821": easy for a child to read, write down and type back.
 * 16 colours × 40 animals × 9000 numbers ≈ 5.8 million codes. Server-only (node:crypto).
 */
const COLOURS = [
  "RED", "BLUE", "GREEN", "PINK", "GOLD", "GREY", "BLACK", "WHITE",
  "ORANGE", "PURPLE", "SILVER", "BROWN", "YELLOW", "MINT", "LIME", "NAVY",
];
const ANIMALS = [
  "TIGER", "PANDA", "KOALA", "ZEBRA", "HORSE", "MOUSE", "EAGLE", "SHARK",
  "WHALE", "OTTER", "LLAMA", "CAMEL", "SNAKE", "TURTLE", "RABBIT", "PARROT",
  "DOLPHIN", "PENGUIN", "MONKEY", "LION", "BEAR", "WOLF", "FOX", "OWL",
  "FROG", "DUCK", "GOAT", "SEAL", "CRAB", "DEER", "HIPPO", "RHINO",
  "GECKO", "BEAVER", "BADGER", "FALCON", "HAMSTER", "KITTEN", "PUPPY", "LOBSTER",
];

export function generateSecretCode(): string {
  const colour = COLOURS[randomInt(COLOURS.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  return `${colour}-${animal}-${randomInt(1000, 10000)}`;
}

/** What gets stored: the hash of the code with case, dashes and spaces ignored, so
 *  "blue tiger 4821" finds the same save as "BLUE-TIGER-4821". */
export function hashSecretCode(code: string): string | null {
  const normalised = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalised.length < 8 || normalised.length > 40) return null;
  return createHash("sha256").update(normalised).digest("hex");
}
