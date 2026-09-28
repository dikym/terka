import type { Curation } from "./read-curation";
import type { FactItem } from "./read-facts";
import type { SpecialsSource } from "./read-specials";

export type ContentDraft = { curation: Curation; specials: SpecialsSource; facts: FactItem[] };
