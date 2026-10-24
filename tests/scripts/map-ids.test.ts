import { expect, test } from "bun:test";
import { readMapIds } from "../../scripts/build/map-ids";

test("reads province ids and group markers from the map in document order", () => {
	expect(
		readMapIds(
			'<svg id="indonesia"><g data-group="papua"><path d="M0 0" id="papua"/></g></svg>'
		)
	).toEqual(["indonesia", "papua", "papua"]);
});
