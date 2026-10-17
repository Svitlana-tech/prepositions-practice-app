/**
 * Titles earned with points (POINTS_PER_CORRECT each right answer): a journey from
 * newcomer to native in the land of English. The first promotion comes after a test or
 * two, the steps grow after that, and the top takes about a year of two tests a day.
 */
export const LEVELS: { name: string; points: number }[] = [
  { name: "Newcomer", points: 0 },
  { name: "Visitor", points: 100 },
  { name: "Wanderer", points: 400 },
  { name: "Explorer", points: 1000 },
  { name: "Pathfinder", points: 2000 },
  { name: "Navigator", points: 3500 },
  { name: "Local", points: 5500 },
  { name: "Resident", points: 8000 },
  { name: "Insider", points: 11000 },
  { name: "Cartographer", points: 15000 },
  { name: "Citizen", points: 20000 },
  { name: "Native Guide", points: 27000 },
  { name: "Storyteller", points: 36000 },
  { name: "Native Speaker", points: 47000 },
  { name: "Absolute Native", points: 60000 },
];

export type LevelInfo = {
  index: number;
  name: string;
  /** The next title and the points still missing, or null at the top. */
  next: { name: string; pointsLeft: number } | null;
  /** 0..1 — how far along the way to the next title. */
  progress: number;
};

export function getLevel(points: number): LevelInfo {
  let index = 0;
  while (index + 1 < LEVELS.length && points >= LEVELS[index + 1].points) index++;
  const level = LEVELS[index];
  const nextLevel = LEVELS[index + 1];
  if (!nextLevel) return { index, name: level.name, next: null, progress: 1 };
  return {
    index,
    name: level.name,
    next: { name: nextLevel.name, pointsLeft: nextLevel.points - points },
    progress: (points - level.points) / (nextLevel.points - level.points),
  };
}
