import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Class, PaxWeekPoints } from "@/types";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface AdminPaxPointsProps {
  classes: Class[];
  paxPoints: PaxWeekPoints[];
}

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const AdminPaxPoints = ({ classes, paxPoints }: AdminPaxPointsProps) => {
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  const [viewWeek, setViewWeek] = useState(currentWeek);
  const [viewYear, setViewYear] = useState(currentYear);

  const weekData = paxPoints.find(
    (p) => p.weekNumber === viewWeek && p.year === viewYear
  );

  const goToPreviousWeek = () => {
    if (viewWeek === 1) {
      setViewWeek(52);
      setViewYear(viewYear - 1);
    } else {
      setViewWeek(viewWeek - 1);
    }
  };

  const goToNextWeek = () => {
    if (viewWeek === 52) {
      setViewWeek(1);
      setViewYear(viewYear + 1);
    } else {
      setViewWeek(viewWeek + 1);
    }
  };

  const goToCurrentWeek = () => {
    setViewWeek(currentWeek);
    setViewYear(currentYear);
  };

  const isCurrentWeek = viewWeek === currentWeek && viewYear === currentYear;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Poäng per klass</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 px-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="rounded-xl w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                Föregående vecka
              </Button>
              <div className="text-center flex-1">
                <p className="font-semibold text-lg">
                  Vecka {viewWeek}, {viewYear}
                </p>
                {!isCurrentWeek && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={goToCurrentWeek}
                    className="text-xs"
                  >
                    Gå till nuvarande vecka
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="rounded-xl w-full sm:w-auto"
              >
                Nästa vecka
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {(() => {
              const totalBorrows = Object.values(weekData?.classBorrows || {}).reduce((sum, count) => sum + count, 0);
              const totalReturns = Object.values(weekData?.classReturns || {}).reduce((sum, count) => sum + count, 0);
              // Säkerställ att returns aldrig överstiger borrows och percentage max är 100%
              const validReturns = Math.min(totalReturns, totalBorrows);
              const overallPercentage = totalBorrows > 0 ? Math.min(100, Math.round((validReturns / totalBorrows) * 100)) : 0;
              
              const overallChartData = [
                { name: "returned", value: validReturns },
                { name: "notReturned", value: totalBorrows - validReturns },
              ];

              return totalBorrows > 0 ? (
                <div className="mb-6 p-6 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-4">Övergripande statistik</h4>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={overallChartData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={45}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <Cell fill="hsl(var(--primary))" />
                            <Cell fill="hsl(var(--destructive))" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {overallPercentage}%
                      </div>
                      <div className="text-lg mb-2">
                        <span className="font-semibold">{validReturns}</span> inlämnade av{" "}
                        <span className="font-semibold">{totalBorrows}</span> leksaker
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {totalBorrows - validReturns} ej returnerade
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {classes.map((cls) => {
                const points = weekData?.classPoints[cls.name] || 0;
                const returns = weekData?.classReturns?.[cls.name] || 0;
                const borrows = weekData?.classBorrows?.[cls.name] || 0;
                // Säkerställ att returns aldrig överstiger borrows och percentage max är 100%
                const validReturns = Math.min(returns, borrows);
                const percentage = borrows > 0 ? Math.min(100, Math.round((validReturns / borrows) * 100)) : 0;
                
                const chartData = [
                  { name: "returned", value: validReturns },
                  { name: "pending", value: borrows - validReturns },
                ];

                return (
                  <div
                    key={cls.name}
                    className="flex flex-col gap-2 p-4 rounded-xl border"
                    style={{
                      borderColor: cls.color || "#3B82F6",
                      backgroundColor: `${cls.color || "#3B82F6"}10`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">{cls.name}</span>
                      <div className="text-right">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: cls.color || "#3B82F6" }}
                        >
                          {points} poäng
                        </div>
                        <div className="text-sm text-muted-foreground">
                          av {validReturns} möjliga
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              dataKey="value"
                              cx="50%"
                              cy="50%"
                              innerRadius={12}
                              outerRadius={20}
                              startAngle={90}
                              endAngle={-270}
                            >
                              <Cell fill={cls.color || "#3B82F6"} />
                              <Cell fill={`${cls.color || "#3B82F6"}30`} />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground">
                          Lämnat in {validReturns} av {borrows} leksaker
                        </div>
                        <div className="text-sm font-medium" style={{ color: cls.color || "#3B82F6" }}>
                          {percentage}% returnerat
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaxPoints;
