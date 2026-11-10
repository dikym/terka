"use client";

import { usePathname } from "next/navigation";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore
} from "react";
import {
	dismissToast,
	pauseToasts,
	resumeToasts,
	stackLayout,
	type ToastItem,
	toastStore,
	type ToastTone
} from "@/lib/toasts";
import { BusyText } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";

const TONE: Record<ToastTone, { box: string; text: string; icon: string; glyph: IconName }> = {
	success: {
		box: "border-go-500 bg-go-100",
		text: "text-go-700",
		icon: "bg-go-700",
		glyph: "check"
	},
	info: {
		box: "border-ink-300 bg-paper-0",
		text: "text-ink-700",
		icon: "bg-ink-700",
		glyph: "info"
	},
	warn: {
		box: "border-caution-500 bg-caution-100",
		text: "text-caution-700",
		icon: "bg-caution-700",
		glyph: "circle-alert"
	},
	danger: {
		box: "border-stop-500 bg-stop-100",
		text: "text-stop-700",
		icon: "bg-stop-700",
		glyph: "circle-alert"
	}
};

const roleOf = (tone: ToastTone) => (tone === "danger" ? "alert" : "status");

export function Toast({
	toast,
	onClose,
	muted = false
}: {
	toast: ToastItem;
	onClose: () => void;
	/** Behind the front card: only its coloured edge shows. */
	muted?: boolean;
}) {
	const tone = TONE[toast.tone];
	return (
		<div
			role={roleOf(toast.tone)}
			className={`flex w-full items-start gap-3 rounded-md border py-3 pr-2 pl-4 shadow-overlay *:transition-opacity *:duration-200 ${muted ? "*:opacity-0" : ""} ${tone.box}`}
		>
			<Icon name={toast.icon ?? tone.glyph} size={18} color={tone.icon} className="mt-px" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{toast.label && (
					<span className={`leading-5! type-label ${tone.text}`}>{toast.label}</span>
				)}
				<span className="font-sans text-body-md leading-5 font-medium text-ink-900">
					{toast.busy ? <BusyText>{toast.text}</BusyText> : toast.text}
				</span>
			</div>
			{toast.action && (
				<button
					type="button"
					onClick={() => {
						toast.action!.onClick();
						onClose();
					}}
					className="ml-2 inline-flex h-9 flex-none cursor-pointer items-center justify-center gap-2 self-center rounded-sm border border-ink-1000 bg-paper-0 px-3 font-display text-body-sm leading-none font-semibold whitespace-nowrap text-ink-1000"
				>
					{toast.action.icon && <Icon name={toast.action.icon} size={16} />}
					{toast.action.label}
				</button>
			)}
			<button
				type="button"
				onClick={onClose}
				aria-label="Tutup"
				className="-my-1 ml-1 inline-flex size-7 flex-none cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent"
			>
				<Icon name="x" size={16} />
			</button>
		</div>
	);
}

const SWIPE_SLOP = 8;
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 0.5;
const FLICK_DISTANCE = 24;

function ToastCard({
	toast,
	card,
	height,
	layer,
	onMeasure
}: {
	toast: ToastItem;
	card: { y: number; scale: number; clamp: number | null };
	height: number | undefined;
	layer: number;
	onMeasure: (id: number, height: number | null) => void;
}) {
	const body = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const element = body.current;
		if (!element) return;
		const measure = () => onMeasure(toast.id, element.offsetHeight);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => {
			observer.disconnect();
			onMeasure(toast.id, null);
		};
	}, [toast.id, onMeasure]);
	// A focused button about to leave the page would otherwise hold the stack open.
	useEffect(() => {
		const focused = document.activeElement;
		if (toast.leaving && focused instanceof HTMLElement && body.current?.contains(focused))
			focused.blur();
	}, [toast.leaving]);
	const inert = card.clamp !== null || toast.leaving;
	const swipe = useRef<{ x: number; time: number; offset: number } | null>(null);
	const settle = (element: HTMLElement, transform: string, opacity: string) => {
		element.style.transition = "transform 160ms ease-out, opacity 160ms ease-out";
		element.style.transform = transform;
		element.style.opacity = opacity;
	};
	const endSwipe = (event: React.PointerEvent<HTMLElement>, released: boolean) => {
		const start = swipe.current;
		swipe.current = null;
		if (!start?.offset) return;
		const elapsed = Math.max(1, event.timeStamp - start.time);
		const far =
			Math.abs(start.offset) > SWIPE_DISTANCE ||
			(Math.abs(start.offset) > FLICK_DISTANCE &&
				Math.abs(start.offset) / elapsed > SWIPE_VELOCITY);
		if (released && far) {
			settle(event.currentTarget, `translateX(${Math.sign(start.offset) * 100}%)`, "0");
			dismissToast(toast.id);
		} else settle(event.currentTarget, "", "");
	};
	return (
		<div
			className={`absolute inset-x-0 bottom-0 origin-top transition-[transform,height] duration-200 ease-out ${card.clamp !== null ? "overflow-hidden" : ""} ${inert ? "pointer-events-none" : ""}`}
			style={{
				transform: `translateY(${-card.y}px) scale(${card.scale})`,
				height: card.clamp ?? height,
				zIndex: layer
			}}
		>
			<div ref={body} className={toast.leaving ? "animate-toast-out" : "animate-toast-in"}>
				<div
					className="touch-pan-y"
					onPointerDown={(event) => {
						// A press that drifts on a button would still click it as the card moves.
						const onButton = (event.target as Element).closest("button");
						if (event.pointerType === "mouse" || inert || onButton) return;
						swipe.current = { x: event.clientX, time: event.timeStamp, offset: 0 };
					}}
					onPointerMove={(event) => {
						const start = swipe.current;
						if (!start) return;
						const delta = event.clientX - start.x;
						if (!start.offset && Math.abs(delta) < SWIPE_SLOP) return;
						start.offset = delta;
						const element = event.currentTarget;
						element.style.transition = "none";
						element.style.transform = `translateX(${delta}px)`;
						element.style.opacity = `${1 - Math.abs(delta) / element.offsetWidth}`;
					}}
					onPointerUp={(event) => endSwipe(event, true)}
					onPointerCancel={(event) => endSwipe(event, false)}
				>
					<Toast
						toast={toast}
						muted={card.clamp !== null}
						onClose={() => dismissToast(toast.id)}
					/>
				</div>
			</div>
		</div>
	);
}

const NONE: ToastItem[] = [];

/** Every status message of the app, bottom right of the screen; one per page. */
export function ToastHost() {
	// A session screen has neither the sidebar nor the tab bar to clear.
	const bare = usePathname().startsWith("/sesi");
	const items = useSyncExternalStore(
		toastStore.subscribe,
		() => toastStore.getState().items,
		() => NONE
	);
	const root = useRef<HTMLDivElement>(null);
	const pressed = useRef({ x: 0, y: 0 });
	const [hover, setHover] = useState(false);
	const [focus, setFocus] = useState(false);
	const [tap, setTap] = useState(false);
	const [heights, setHeights] = useState<Record<number, number>>({});
	const measure = useCallback((id: number, height: number | null) => {
		setHeights((current) => {
			if (height === null) {
				const { [id]: _gone, ...rest } = current;
				return rest;
			}
			return current[id] === height ? current : { ...current, [id]: height };
		});
	}, []);

	const live = items.filter((item) => !item.leaving).length;
	// Closing the last toast under the pointer shrinks the host with no `pointerleave` to follow.
	if (live === 0 && (hover || focus)) {
		setHover(false);
		setFocus(false);
	}
	if (live <= 1 && tap) setTap(false);

	const spread = hover || focus || tap;
	useEffect(() => {
		if (spread) pauseToasts();
		else resumeToasts();
	}, [spread]);
	useEffect(() => {
		if (!tap) return;
		const onDown = (event: PointerEvent) => {
			if (!root.current?.contains(event.target as Node)) setTap(false);
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	}, [tap]);

	const layout = stackLayout(items, heights, spread);
	// In a stable order: moving a DOM node, as a toast replaced by key would, restarts its animation.
	const byAge = [...items].sort((a, b) => a.id - b.id);
	return (
		// On a phone the stack spans the screen and sits 16 px above the tab bar; on desktop it
		// sits 24 px from the right and bottom edges. Its box covers the gaps between spread cards,
		// so moving the pointer across them does not collapse the stack.
		<div
			ref={root}
			style={{ height: layout.height }}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") setHover(true);
			}}
			onPointerLeave={(event) => {
				if (event.pointerType === "mouse") setHover(false);
			}}
			onPointerDown={(event) => {
				pressed.current = { x: event.clientX, y: event.clientY };
			}}
			onPointerUp={(event) => {
				const onButton = (event.target as Element).closest("button");
				const moved =
					Math.abs(event.clientX - pressed.current.x) >= SWIPE_SLOP ||
					Math.abs(event.clientY - pressed.current.y) >= SWIPE_SLOP;
				if (event.pointerType !== "mouse" && live > 1 && !onButton && !moved) setTap(true);
			}}
			onFocus={(event) => {
				if (event.target.matches(":focus-visible")) setFocus(true);
			}}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
			}}
			className={`fixed inset-x-4 z-50 ml-auto max-w-120 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-100 ${bare ? "bottom-[calc(--spacing(4)+env(safe-area-inset-bottom))]" : "bottom-[calc(--spacing(19)+env(safe-area-inset-bottom))]"}`}
		>
			{byAge.map((toast) => (
				<ToastCard
					// Screen readers may not announce a role that changes on a node already on the page.
					key={`${toast.id}-${roleOf(toast.tone)}`}
					toast={toast}
					card={layout.cards[toast.id]}
					height={heights[toast.id]}
					layer={items.indexOf(toast)}
					onMeasure={measure}
				/>
			))}
		</div>
	);
}
