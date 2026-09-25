/**
 * Topic names that change how a topic behaves — matched against Category.name, so a
 * rename in the database needs a matching edit here.
 */

/** Free Flow is not a topic with sentences of its own: its button runs the endless cards
 *  deck over every other topic. A category by this name is kept off the student menu and
 *  out of every practice pool (its sentences belong in a real topic). */
export const FREE_FLOW_TOPIC_NAMES = ["Free Flow"];

/** Practiced on its own only — never dealt into Daily Mix's topic questions. */
export const ACADEMIC_TOPIC_NAME = "Academic Writing";

export function isFreeFlowTopic(name: string): boolean {
  return FREE_FLOW_TOPIC_NAMES.includes(name);
}

/** How often Free Flow draws from a topic relative to the others (1 = normal share). */
export function freeFlowWeight(name: string): number {
  return name === ACADEMIC_TOPIC_NAME ? 0.5 : 1;
}
