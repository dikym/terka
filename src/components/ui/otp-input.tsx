"use client";

import { useEffect, useRef } from "react";

const BOX =
	"h-12 w-full min-w-0 lg:h-16 rounded-sm border border-ink-1000 bg-paper-0 px-0 text-center font-mono text-body-lg leading-none text-ink-1000 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1000 disabled:opacity-40";

type OtpInputProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	/** Called with the full code as soon as the last digit is filled. */
	onComplete?: (value: string) => void;
	length?: number;
	disabled?: boolean;
};

/**
 * One box per digit. Digits stay contiguous from the left, so focus always lands on the first
 * empty box. A multi-digit change (paste, mail-app autofill) spreads across the boxes.
 */
export function OtpInput({
	label,
	value,
	onChange,
	onComplete,
	length = 6,
	disabled = false
}: OtpInputProps) {
	const boxes = useRef<(HTMLInputElement | null)[]>([]);
	// Mirrors `value.length` but updates synchronously, so the focus guard below never sees a stale count.
	const filled = useRef(value.length);
	const slots = Array.from({ length }, (_, index) => `digit-${index}`);

	const focusBox = (index: number) => {
		const box = boxes.current[Math.min(Math.max(index, 0), length - 1)];
		box?.focus();
		box?.select();
	};

	useEffect(() => {
		boxes.current[0]?.focus();
	}, []);

	useEffect(() => {
		filled.current = value.length;
	}, [value]);

	const change = (index: number, raw: string) => {
		const digits = raw.replace(/\D/g, "");
		if (!digits) {
			if (!raw) remove(index);
			return;
		}
		const start = digits.length >= length ? 0 : index;
		const next = (value.slice(0, start) + digits + value.slice(start + digits.length)).slice(
			0,
			length
		);
		filled.current = next.length;
		onChange(next);
		focusBox(Math.min(start + digits.length, next.length));
		if (next.length === length) onComplete?.(next);
	};

	const remove = (index: number) => {
		const target = Math.min(index, value.length - 1);
		if (target < 0) return;
		filled.current = value.length - 1;
		onChange(value.slice(0, target) + value.slice(target + 1));
		focusBox(target);
	};

	const keyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Backspace") {
			event.preventDefault();
			remove(index);
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			focusBox(index - 1);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			focusBox(Math.min(index + 1, value.length));
		}
	};

	return (
		<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
			<legend className="mb-2 p-0 type-label text-ink-500">{label}</legend>
			<div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }}>
				{slots.map((slot, index) => (
					<input
						key={slot}
						ref={(node) => {
							boxes.current[index] = node;
						}}
						inputMode="numeric"
						autoComplete="one-time-code"
						aria-label={`Digit ${index + 1} dari ${length}`}
						value={value[index] ?? ""}
						disabled={disabled}
						onChange={(event) => change(index, event.target.value)}
						onKeyDown={(event) => keyDown(index, event)}
						onFocus={(event) => {
							if (index > filled.current) focusBox(filled.current);
							else event.target.select();
						}}
						className={BOX}
					/>
				))}
			</div>
		</fieldset>
	);
}
