import bowser from 'bowser';

export function parseUA(ua: string) {
	const parsed = bowser.parse(ua);
	let str = `${parsed.browser.name} ${parsed.browser.version}`;

	if (parsed.os?.name?.length) {
		str += ` on ${parsed.os.name} ${parsed.os.version ?? ''}`;
	}
	return str;
}
