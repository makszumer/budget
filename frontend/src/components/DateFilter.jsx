import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export const DateFilter = ({ dateFilter, setDateFilter, selectedDate, setSelectedDate }) => {
  const filters = [
    { value: "all", label: "All Time" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  const changeDate = (direction) => {
    const newDate = new Date(selectedDate);
    
    if (dateFilter === "day") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (dateFilter === "week") {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (dateFilter === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (dateFilter === "year") {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    
    setSelectedDate(newDate);
  };

  const formatDateDisplay = () => {
    if (dateFilter === "all") return "";
    
    const options = {};
    if (dateFilter === "day") {
      options.month = "short";
      options.day = "numeric";
      options.year = "numeric";
    } else if (dateFilter === "week") {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (dateFilter === "month") {
      options.month = "long";
      options.year = "numeric";
    } else if (dateFilter === "year") {
      return selectedDate.getFullYear().toString();
    }
    
    return selectedDate.toLocaleDateString('en-US', options);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
      </div>
      
      <div className="flex gap-2 flex-wrap justify-center">
        {filters.map(filter => (
          <Button
            key={filter.value}
            variant={dateFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDateFilter(filter.value);
              if (filter.value === "all") {
                setSelectedDate(new Date());
              }
            }}
            data-testid={`filter-${filter.value}`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {dateFilter !== "all" && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeDate(-1)}
            data-testid="date-prev"
          >
            ←
          </Button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[180px] text-center">
            {formatDateDisplay()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeDate(1)}
            data-testid="date-next"
            disabled={selectedDate >= new Date()}
          >
            →
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            data-testid="date-today"
          >
            Today
          </Button>
        </div>
      )}
    </div>
  );
};
