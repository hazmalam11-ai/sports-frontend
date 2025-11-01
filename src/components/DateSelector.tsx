'use client';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const tabs = ['Tomorrow', 'Today', 'Yesterday'];

  return (
    <div className="flex flex-col items-center justify-center pt-8 md:pt-12 px-4">
      
      <div className="flex items-center bg-black/20 backdrop-blur-md rounded-xl p-2 gap-2 border border-white/20 w-full max-w-[400px] md:w-auto md:max-w-none shadow-lg">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onDateChange(tab)}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-300 text-sm md:text-base min-h-[48px] flex items-center justify-center ${
              tab === selectedDate
                ? 'bg-red-600 text-white shadow-lg transform scale-105'
                : 'text-white hover:bg-white/20 hover:scale-105'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
