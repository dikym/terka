import { expect, test } from "bun:test";
import { pumlEntities } from "../../supabase/checks/puml";

const sample = `
entity "auth.users" as auth_users {
  * id : uuid <<PK>>
}

entity devices {
  * user_id : uuid <<PK>> <<FK>>
  * id : uuid <<PK>>
  --
  * label : text
  platform : text
  --
  maks. 20 perangkat aktif (90 hari)
}

entity content_regions <<bundle>> {
  * id : text
}
`;

test("reads database entities with their columns and NOT NULL marks", () => {
	const entities = pumlEntities(sample);
	expect([...entities.keys()]).toEqual(["auth.users", "devices"]);
	expect(entities.get("devices")).toEqual([
		{ column: "user_id", required: true },
		{ column: "id", required: true },
		{ column: "label", required: true },
		{ column: "platform", required: false }
	]);
});
