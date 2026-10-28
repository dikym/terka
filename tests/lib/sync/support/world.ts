import { openDevice } from "./device";
import { NOW, MINUTE } from "./events";
import { FakeServer } from "./server";

// A signed-in account on several devices; the clock starts at midday of the test day.
export async function world(...names: string[]) {
	const server = new FakeServer();
	server.clock.now = NOW + 12 * 60 * MINUTE;
	const devices = [];
	for (const name of names) {
		const device = await openDevice(server, { name });
		await device.signIn();
		devices.push(device);
	}
	return { server, devices };
}

export async function pair() {
	const {
		server,
		devices: [a, b]
	} = await world("phone", "laptop");
	return { server, a, b };
}

export async function trio() {
	const {
		server,
		devices: [a, b, c]
	} = await world("phone", "laptop", "tablet");
	return { server, a, b, c };
}
