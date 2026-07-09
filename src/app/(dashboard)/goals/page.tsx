"use client";

import { useMemo } from "react";
import { useCashCoreStore } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { IconRenderer } from "@/components/shared/icon-renderer";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Target,
  Plus,
  TrendingUp,
  Trophy,
  Shield,
  Clock,
  CheckCircle2,
  Flame,
} from "lucide-react";
import type { Goal } from "@/types";
import { GoalFormModal } from "@/components/goals/goal-form";

const goalTypeLabels: Record<string, string> = {
  savings: "Ahorro",
  debt_payoff: "Deuda",
  emergency: "Emergencia",
  custom: "Personalizada",
};

const goalTypeColors: Record<string, string> = {
  savings: "bg-primary/10 text-primary",
  debt_payoff: "bg-rose-500/10 text-rose-500",
  emergency: "bg-blue-500/10 text-blue-500",
  custom: "bg-violet-500/10 text-violet-500",
};

function GoalCard({ goal }: { goal: Goal }) {
  const { setActiveModal, setEditingItem } = useCashCoreStore();
  const percentage = Math.min(
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
    100
  );
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft = goal.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(goal.deadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;
  const monthlyNeeded =
    daysLeft && daysLeft > 0 && remaining > 0
      ? remaining / (daysLeft / 30)
      : null;

  return (
    <Card
      onClick={() => {
        setEditingItem(goal);
        setActiveModal("goal-form");
      }}
      className={cn(
        "cursor-pointer relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        goal.isCompleted && "opacity-70"
      )}
    >
      {goal.isCompleted && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-primary text-primary-foreground gap-1 text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            Completada
          </Badge>
        </div>
      )}

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${goal.color}15` }}
          >
            <IconRenderer name={goal.icon} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{goal.name}</h3>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] mt-1",
                goalTypeColors[goal.type]
              )}
            >
              {goalTypeLabels[goal.type]}
            </Badge>
          </div>
        </div>

        {/* Progress Ring / Bar */}
        <div className="mb-3">
          <div className="flex items-end justify-between mb-1.5">
            <CurrencyDisplay
              amount={goal.currentAmount}
              size="md"
              className="font-bold"
            />
            <span className="text-sm text-muted-foreground">
              / {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <Progress
            value={percentage}
            className="h-3"
            indicatorClassName={
              goal.isCompleted
                ? "bg-primary"
                : percentage >= 75
                ? "bg-primary"
                : percentage >= 50
                ? "bg-amber-500"
                : "bg-[#6fa8c9]"
            }
          />
          <div className="flex items-center justify-between mt-1.5">
            <span
              className={cn(
                "text-xs font-medium",
                percentage >= 75
                  ? "text-primary"
                  : percentage >= 50
                  ? "text-amber-500"
                  : "text-[#6fa8c9]"
              )}
            >
              {percentage}%
            </span>
            {remaining > 0 && (
              <span className="text-xs text-muted-foreground">
                Faltan {formatCurrency(remaining)}
              </span>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          {daysLeft !== null && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysLeft > 0 ? `${daysLeft} días restantes` : "Vencida"}
            </div>
          )}
          {monthlyNeeded && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {formatCurrency(monthlyNeeded)}/mes
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GoalsPage() {
  const { goals, setActiveModal, setEditingItem } = useCashCoreStore();

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  const summary = useMemo(() => {
    const totalTarget = activeGoals.reduce(
      (sum, g) => sum + g.targetAmount,
      0
    );
    const totalCurrent = activeGoals.reduce(
      (sum, g) => sum + g.currentAmount,
      0
    );
    const overallPercent =
      totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

    return { totalTarget, totalCurrent, overallPercent };
  }, [activeGoals]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display">Metas</h2>
          <p className="text-sm text-muted-foreground">
            {activeGoals.length} metas activas ·{" "}
            {completedGoals.length} completadas
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => {
            setEditingItem(null);
            setActiveModal("goal-form");
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva meta</span>
        </Button>
      </div>

      {/* Overall Progress */}
      {activeGoals.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-transparent border-blue-500/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs text-muted-foreground mb-1">
                  Ahorrado
                </p>
                <CurrencyDisplay
                  amount={summary.totalCurrent}
                  size="lg"
                  className="font-bold"
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Por alcanzar
                </p>
                <CurrencyDisplay
                  amount={summary.totalTarget - summary.totalCurrent}
                  size="lg"
                  className="font-bold"
                />
              </div>
              <div className="text-center sm:text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  Progreso total
                </p>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      summary.overallPercent >= 50
                        ? "text-primary"
                        : "text-[#6fa8c9]"
                    )}
                  >
                    {summary.overallPercent}%
                  </span>
                  {summary.overallPercent >= 50 && (
                    <Flame className="w-5 h-5 text-amber-500 animate-pulse-soft" />
                  )}
                </div>
              </div>
            </div>
            <Progress
              value={summary.overallPercent}
              className="h-2 mt-4"
              indicatorClassName="bg-gradient-to-r from-blue-500 to-violet-500"
            />
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length === 0 ? (
        <EmptyState
          icon="Target"
          title="Sin metas activas"
          description="Crea tu primera meta financiera para empezar a ahorrar hacia tus sueños."
          actionLabel="Crear meta"
          onAction={() => {}}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold font-display">
              Metas completadas
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </>
      )}

      <GoalFormModal />
    </div>
  );
}
