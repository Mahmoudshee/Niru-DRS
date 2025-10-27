import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Enhanced search utility that filters requisitions by multiple criteria
export const filterRequisitions = (requisitions: any[], searchQuery: string) => {
  if (!searchQuery.trim()) return requisitions;
  
  const query = searchQuery.toLowerCase().trim();
  
  return requisitions.filter(req => {
    // Search by ID
    if (req.id?.toLowerCase().includes(query)) return true;
    
    // Search by staff name
    if (req.staffName?.toLowerCase().includes(query)) return true;
    
    // Search by activity
    if (req.activity?.toLowerCase().includes(query)) return true;
    
    // Search by date (format: YYYY-MM-DD)
    if (req.date?.includes(query)) return true;
    
    // Search by year (extract year from date)
    if (req.date) {
      const year = new Date(req.date).getFullYear().toString();
      if (year.includes(query)) return true;
    }
    
    // Search by month-year (e.g., "jan 2024", "january 2024")
    if (req.date) {
      const date = new Date(req.date);
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                          'july', 'august', 'september', 'october', 'november', 'december'];
      const monthShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const fullMonthYear = `${monthNames[month]} ${year}`.toLowerCase();
      const shortMonthYear = `${monthShort[month]} ${year}`.toLowerCase();
      
      if (fullMonthYear.includes(query) || shortMonthYear.includes(query)) return true;
    }
    
    // Search by formatted date (e.g., "1/15/2024", "Jan 15")
    if (req.date) {
      const formattedDate = new Date(req.date).toLocaleDateString().toLowerCase();
      if (formattedDate.includes(query)) return true;
    }
    
    return false;
  });
};

export const SearchFilter: React.FC<SearchFilterProps> = ({ 
  value, 
  onChange, 
  placeholder = "Search by name, date, year, month, ID...",
  className = ""
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};
