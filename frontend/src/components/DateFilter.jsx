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
    <div className="flex flex-col gap-2 mb-4">
       <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map(filter => (
          <button
            key={filter.value}
            onClick={() => {
              setDateFilter(filter.value);
              if (filter.value === "all") {
                setSelectedDate(new Date());
              }
            }}
            data-testid={`filter-${filter.value}`}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              dateFilter === filter.value
                ? 'bg-[#1C3D2E] text-white border-[#1C3D2E]'
                : 'bg-transparent text-gray-600 dark:text-gray-400 border-[#E8E6E1] dark:border-[#3a3a3a] hover:border-[#1C3D2E] dark:hover:border-gray-500'
            }`}
          >
            {filter.label}
          </button>
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
