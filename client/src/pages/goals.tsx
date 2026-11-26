import { Tabs } from "radix-ui";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { EditAccountsDrawer } from "@/components/drawers/edit-accounts-drawer";
import { FundDrawer } from "@/components/drawers/fund-drawer";
import { GoalDrawer } from "@/components/drawers/goal-drawer";
import { GoalList } from "@/components/goals/goal-list";
import { GoalsSkeleton } from "@/components/goals/goals-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-error";
import { useGoals } from "@/hooks/use-goals";
import {
	GOAL_EDIT_ACCOUNTS_PARAM,
	GOAL_EDIT_ACCOUNTS_VALUE,
	GOAL_TABS,
	parseGoalTab,
} from "@/lib/goals";
import type { Goal } from "@/types";

/** "new" opens the create drawer; a Goal opens its edit drawer. */
type GoalDrawerState = "new" | Goal | null;

export function GoalsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = parseGoalTab(searchParams.get("tab"));
	const isEditAccountsOpen =
		searchParams.get(GOAL_EDIT_ACCOUNTS_PARAM) === GOAL_EDIT_ACCOUNTS_VALUE;
	const goals = useGoals(tab);
	const [goalDrawer, setGoalDrawer] = useState<GoalDrawerState>(null);
	const [fundId, setFundId] = useState<string | null>(null);
	const data = goals.data;
	const currency = data?.baseCurrency ?? "USD";
	const openFund = data?.goals.find((goal) => goal.id === fundId);

	function patchParams(mutate: (next: URLSearchParams) => void) {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			mutate(next);
			return next;
		});
	}

	function onOpen(goal: Goal) {
		if (goal.funding === "fund") setFundId(goal.id);
		else setGoalDrawer(goal);
	}

	return (
		<>
			<PageHeader title="Goals">
				<Button
					variant="outline"
					type="button"
					onClick={() =>
						patchParams((next) => next.set(GOAL_EDIT_ACCOUNTS_PARAM, GOAL_EDIT_ACCOUNTS_VALUE))
					}
				>
					Edit accounts
				</Button>
				<Button type="button" onClick={() => setGoalDrawer("new")}>
					Add goal
				</Button>
			</PageHeader>

			<Tabs.Root
				value={tab}
				onValueChange={(next) =>
					patchParams((params) => {
						if (next === "pay_down") params.set("tab", next);
						else params.delete("tab");
					})
				}
			>
				<Tabs.List
					aria-label="Goal type"
					className="mb-4 inline-flex rounded-md bg-foreground/5 p-0.5 text-sm"
				>
					{GOAL_TABS.map((option) => (
						<Tabs.Trigger
							key={option.value}
							value={option.value}
							className="rounded px-3 py-1 text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-card data-[state=active]:font-medium data-[state=active]:text-foreground"
						>
							{option.label}
						</Tabs.Trigger>
					))}
				</Tabs.List>
				<Tabs.Content value={tab}>
					{goals.isError ? (
						<QueryError
							message="Could not load goals."
							isRetrying={goals.isFetching}
							onRetry={() => void goals.refetch()}
						/>
					) : data ? (
						<GoalList
							type={tab}
							goals={data.goals}
							total={data.totalCurrent}
							currency={currency}
							onOpen={onOpen}
							onAdd={() => setGoalDrawer("new")}
						/>
					) : (
						<GoalsSkeleton />
					)}
				</Tabs.Content>
			</Tabs.Root>

			{goalDrawer ? (
				<GoalDrawer
					key={goalDrawer === "new" ? "new" : goalDrawer.id}
					goal={
						goalDrawer === "new"
							? null
							: (data?.goals.find((goal) => goal.id === goalDrawer.id) ?? goalDrawer)
					}
					defaultType={tab}
					onClose={() => setGoalDrawer(null)}
				/>
			) : null}
			{openFund ? (
				<FundDrawer
					key={openFund.id}
					goal={openFund}
					currency={currency}
					onEdit={() => setGoalDrawer(openFund)}
					onClose={() => setFundId(null)}
				/>
			) : null}
			{isEditAccountsOpen ? (
				<EditAccountsDrawer
					key={tab}
					type={tab}
					onClose={() => patchParams((next) => next.delete(GOAL_EDIT_ACCOUNTS_PARAM))}
				/>
			) : null}
		</>
	);
}
