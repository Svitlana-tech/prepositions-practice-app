/**
 * Topic names that change how a topic behaves — matched against Category.name, so a
 * rename in the database needs a matching edit here.
 */

/** The endless full-screen cards deck (no 10-question sessions), kept out of Daily Mix. */
export const FREE_FLOW_TOPIC_NAMES = ["Free Flow"];

/** Practiced on its own only — never dealt into Daily Mix's topic questions. */
export const ACADEMIC_TOPIC_NAME = "Academic Writing";

export function isFreeFlowTopic(name: string): boolean {
  return FREE_FLOW_TOPIC_NAMES.includes(name);
}
