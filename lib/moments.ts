import { calendarToJd, INITIAL_JD, J2000_JD } from "@/lib/constants";

export const MOMENTS = [
  { id: "today", jd: INITIAL_JD },
  { id: "j2000", jd: J2000_JD },
  { id: "apollo11", jd: calendarToJd(1969, 7, 20.85) },
  { id: "voyager2", jd: calendarToJd(1989, 8, 25.16) },
] as const;

export type MomentId = (typeof MOMENTS)[number]["id"];
