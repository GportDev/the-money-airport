import { expect, test } from "@playwright/test";
import { amortization, scheduledPayment } from "../server/src/debt/amortization";

// CONVENTION-DEVIATION: the Amortization schedule is pure math, so these specs call it directly
// with a known schedule (docs/07_IMPLEMENTATION_GUIDE.md asks for unit tests).

const TRUCK = { balance: 3_260_550, aprBps: 700, payment: 53_800, firstDate: "2027-02-01" };

test("the scheduled payment follows the standard amortization formula", () => {
	expect(scheduledPayment(3_260_550, 700, 75)).toBe(53_800);
	expect(scheduledPayment(120_000, 0, 12)).toBe(10_000);
});

test("a known loan pays off in its term with the expected interest", () => {
	const result = amortization({ ...TRUCK, extra: 0 });
	expect(result.basePayment).toBe(53_800);
	expect(result.schedule).toHaveLength(75);
	expect(result.baseTotalInterest).toBe(774_439);
	expect(result.basePayoffDate).toBe("2033-04-01");
	expect(result.schedule[0]).toEqual({
		period: 1,
		date: "2027-02-01",
		beginningBalance: 3_260_550,
		payment: 53_800,
		interest: 19_020,
		principal: 34_780,
		extra: 0,
		endingBalance: 3_225_770,
	});
	expect(result.schedule.at(-1)?.endingBalance).toBe(0);
});

test("extra-payment scenarios show months and interest saved", () => {
	const result = amortization({ ...TRUCK, extra: 0 });
	expect(result.scenarios.map((scenario) => scenario.extra)).toEqual([
		0, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000,
	]);
	const hundred = result.scenarios.find((scenario) => scenario.extra === 10_000);
	expect(hundred).toEqual({
		extra: 10_000,
		payment: 63_800,
		payoffMonths: 61,
		monthsSaved: 14,
		totalInterest: 622_381,
		interestSaved: 152_058,
	});
});

test("a custom extra joins the scenarios and drives the schedule", () => {
	const result = amortization({ ...TRUCK, extra: 12_345 });
	expect(result.scenarios.some((scenario) => scenario.extra === 12_345)).toBe(true);
	expect(result.schedule[0]?.extra).toBe(12_345);
});
