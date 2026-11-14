import type { Member, MemberId } from "../types";

export const MEMBERS: Member[] = [
  { id: "Ankit", name: "Ankit", initials: "AN", color: "#5b45e8" },
  { id: "Bhargav", name: "Bhargav", initials: "BH", color: "#00a875" },
  { id: "Devansh", name: "Devansh", initials: "DE", color: "#2563eb" },
  { id: "Dhvanil", name: "Dhvanil", initials: "DH", color: "#7c3aed" },
  { id: "Kashyap", name: "Kashyap", initials: "KA", color: "#d97706" },
  { id: "Ish", name: "Ish", initials: "IS", color: "#e11d48" },
  { id: "Sagar", name: "Sagar", initials: "SA", color: "#0891b2" },
];

export const MEMBER_IDS = MEMBERS.map((member) => member.id) as MemberId[];
export const emptyMemberRecord = <T>(value: T): Record<MemberId, T> =>
  Object.fromEntries(MEMBER_IDS.map((id) => [id, value])) as Record<MemberId, T>;
