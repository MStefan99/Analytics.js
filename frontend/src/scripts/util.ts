export function parseUA(ua: string): string | null {
	const res = ua.match(/.*? \((.*?); (.*?)([;)]).*/);
	let os: string | null;

	if (!res) os = ua ?? null;
	else if (res[1] === 'Linux') os = res[2] ?? null;
	else if (res[2] === 'Win64') os = res[1]?.replace('NT ', '')?.replace('.0', '') ?? null;
	else if (res[1] === 'Macintosh')
		os = 'macOS ' + res[2]?.replace(/.*Mac OS X (.*?)$/, '$1')?.replace(/_/g, '.') ?? null;
	else if (res[1] === 'iPhone')
		os = 'iPhone (iOS ' + res[2]?.replace(/.*OS (.*?) like.*/, '$1)')?.replace(/_/g, '.') ?? null;
	else if (res[1] === 'iPad')
		os = 'iPad (iPadOS ' + res[2]?.replace(/.*OS (.*?) like.*/, '$1)')?.replace(/_/g, '.') ?? null;
	else os = res[1] ?? null;

	return os;
}
