import NextLink from "next/link";

// The service worker precaches every page, so prefetching only adds requests,
// and WebKit reports the ones cut off by a navigation as page errors.
export function Link(props: React.ComponentProps<typeof NextLink>) {
	return <NextLink prefetch={false} {...props} />;
}
